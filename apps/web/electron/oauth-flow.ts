import { createHash, randomBytes } from "node:crypto";
import http from "node:http";

import { BrowserWindow } from "electron";

export type OAuthConnectInput = {
	authUrl: string;
	tokenUrl: string;
	clientId: string;
	clientSecret?: string;
	scopes?: string;
};

export type OAuthConnectResult = {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
};

const base64Url = (buf: Buffer): string => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

type LoopbackServer = {
	port: number;
	waitForCode: (expectedState: string) => Promise<string>;
	close: () => void;
};

/**
 * Servidor HTTP efêmero em 127.0.0.1 que captura o redirect do provider OAuth (RFC 8252, "loopback
 * interface redirection") — o único jeito de terminar um fluxo `authorization_code` num app desktop
 * sem expor o client secret num backend público. A porta muda a cada conexão; providers como o Google
 * (tipo de credencial "Desktop app") aceitam qualquer porta em `http://127.0.0.1:*`, mas outros exigem
 * a redirect URI cadastrada exatamente — nesse caso o app OAuth do usuário precisa autorizar `http://127.0.0.1`.
 */
const startLoopbackServer = (): Promise<LoopbackServer> =>
	new Promise((resolve, reject) => {
		let resolveCode: ((code: string) => void) | undefined;
		let rejectCode: ((err: Error) => void) | undefined;
		let expectedState = "";

		const server = http.createServer((req, res) => {
			const url = new URL(req.url ?? "/", "http://127.0.0.1");
			if (url.pathname !== "/callback") {
				res.statusCode = 404;
				res.end();
				return;
			}
			const error = url.searchParams.get("error");
			const returnedState = url.searchParams.get("state");
			const code = url.searchParams.get("code");
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			if (error || !code || returnedState !== expectedState) {
				res.statusCode = 400;
				res.end("<html><body><p>Falha na autorização. Pode fechar esta janela.</p></body></html>");
				rejectCode?.(new Error(error ?? "Resposta de autorização inválida (state não confere)."));
				return;
			}
			res.statusCode = 200;
			res.end("<html><body><p>Conectado! Pode fechar esta janela.</p></body></html>");
			resolveCode?.(code);
		});

		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				reject(new Error("Falha ao iniciar o servidor de callback OAuth."));
				return;
			}
			resolve({
				port: address.port,
				waitForCode: (state: string) =>
					new Promise<string>((res, rej) => {
						expectedState = state;
						resolveCode = res;
						rejectCode = rej;
					}),
				close: () => server.close(),
			});
		});
		server.on("error", reject);
	});

/**
 * Fluxo `authorization_code` + PKCE (S256) ponta a ponta: abre uma `BrowserWindow` na tela de
 * consentimento do provider, captura o `code` via loopback e troca por tokens. Usado pelo botão
 * "Conectar" do catálogo — o resultado (`refreshToken`) é persistido pelo renderer como um secret
 * comum `oauth2_refresh` (mesmo caminho de um refresh token colado manualmente).
 */
export const runOAuthAuthorizationCodeFlow = async (input: OAuthConnectInput): Promise<OAuthConnectResult> => {
	const verifier = base64Url(randomBytes(32));
	const challenge = base64Url(createHash("sha256").update(verifier).digest());
	const state = base64Url(randomBytes(16));

	const loopback = await startLoopbackServer();
	const redirectUri = `http://127.0.0.1:${loopback.port}/callback`;

	const authorizeUrl = new URL(input.authUrl);
	authorizeUrl.searchParams.set("response_type", "code");
	authorizeUrl.searchParams.set("client_id", input.clientId);
	authorizeUrl.searchParams.set("redirect_uri", redirectUri);
	authorizeUrl.searchParams.set("state", state);
	authorizeUrl.searchParams.set("code_challenge", challenge);
	authorizeUrl.searchParams.set("code_challenge_method", "S256");
	if (input.scopes) authorizeUrl.searchParams.set("scope", input.scopes);
	// Sem isso o Google só devolve refresh_token no primeiro consentimento — reconectar depois nunca
	// mais devolveria um, silenciosamente quebrando a auto-renovação (ver runner.ts §Fase 0).
	authorizeUrl.searchParams.set("access_type", "offline");
	authorizeUrl.searchParams.set("prompt", "consent");

	const authWindow = new BrowserWindow({
		width: 480,
		height: 720,
		autoHideMenuBar: true,
		webPreferences: { nodeIntegration: false, contextIsolation: true },
	});

	let onClosed: (() => void) | undefined;
	const closedBeforeCode = new Promise<never>((_, reject) => {
		onClosed = () => reject(new Error("Janela de autorização fechada antes de concluir."));
		authWindow.on("closed", onClosed);
	});

	try {
		await authWindow.loadURL(authorizeUrl.toString());

		// Corre contra o fechamento manual da janela pelo usuário — sem isso, cancelar deixaria a
		// promise pendurada pra sempre (o loopback nunca recebe o callback se o usuário desistir).
		const code = await Promise.race([loopback.waitForCode(state), closedBeforeCode]);

		const tokenRes = await fetch(input.tokenUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: redirectUri,
				client_id: input.clientId,
				...(input.clientSecret ? { client_secret: input.clientSecret } : {}),
				code_verifier: verifier,
			}).toString(),
		});
		if (!tokenRes.ok) throw new Error(`Troca do código por token falhou (HTTP ${tokenRes.status}).`);
		const body = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
		return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresIn: body.expires_in };
	} finally {
		loopback.close();
		// Remove o listener antes de fechar — sem isso, o `close()` abaixo dispararia "closed" de novo
		// e rejeitaria `closedBeforeCode` sem ninguém mais escutando (unhandled rejection).
		if (onClosed) authWindow.removeListener("closed", onClosed);
		if (!authWindow.isDestroyed()) authWindow.close();
	}
};

import { createHash, randomBytes } from "node:crypto";
import http from "node:http";

import { BrowserWindow, shell } from "electron";

export type OAuthConnectInput = {
	connectorId?: string;
	authUrl: string;
	tokenUrl: string;
	clientId?: string;
	clientSecret?: string;
	scopes?: string;
	openExternal?: boolean;
};

export type OAuthConnectResult = {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
	accountExternalId?: string;
	accountDisplayName?: string;
	accountType?: string;
};

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

const requiredEnv = (name: string): string => {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} não está configurado no aplicativo.`);
	return value;
};

const resolveAppCredentials = (input: OAuthConnectInput): { clientId: string; clientSecret?: string } => {
	if (input.connectorId === "instagram") {
		return {
			clientId: input.clientId?.trim() || requiredEnv("INSTAGRAM_CLIENT_ID"),
			clientSecret: input.clientSecret?.trim() || requiredEnv("INSTAGRAM_CLIENT_SECRET"),
		};
	}
	if (!input.clientId?.trim()) throw new Error("Client ID não foi informado.");
	return { clientId: input.clientId.trim(), clientSecret: input.clientSecret?.trim() || undefined };
};

const base64Url = (buf: Buffer): string =>
	buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

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
const startLoopbackServer = (port = 0): Promise<LoopbackServer> =>
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

		server.listen(port, "127.0.0.1", () => {
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
	const credentials = resolveAppCredentials(input);
	const verifier = base64Url(randomBytes(32));
	const challenge = base64Url(createHash("sha256").update(verifier).digest());
	const state = base64Url(randomBytes(16));

	const configuredPort =
		input.connectorId === "instagram" ? Number(process.env.INSTAGRAM_OAUTH_CALLBACK_PORT ?? "53682") : 0;
	if (!Number.isInteger(configuredPort) || configuredPort < 0 || configuredPort > 65535) {
		throw new Error("INSTAGRAM_OAUTH_CALLBACK_PORT é inválida.");
	}
	const loopback = await startLoopbackServer(configuredPort);
	const redirectUri = `http://127.0.0.1:${loopback.port}/callback`;

	const authorizeUrl = new URL(input.authUrl);
	authorizeUrl.searchParams.set("response_type", "code");
	authorizeUrl.searchParams.set("client_id", credentials.clientId);
	authorizeUrl.searchParams.set("redirect_uri", redirectUri);
	authorizeUrl.searchParams.set("state", state);
	authorizeUrl.searchParams.set("code_challenge", challenge);
	authorizeUrl.searchParams.set("code_challenge_method", "S256");
	if (input.scopes) authorizeUrl.searchParams.set("scope", input.scopes);
	// Sem isso o Google só devolve refresh_token no primeiro consentimento — reconectar depois nunca
	// mais devolveria um, silenciosamente quebrando a auto-renovação (ver runner.ts §Fase 0).
	authorizeUrl.searchParams.set("access_type", "offline");
	authorizeUrl.searchParams.set("prompt", "consent");

	const useExternalBrowser = input.openExternal ?? input.connectorId === "instagram";
	const authWindow = useExternalBrowser
		? null
		: new BrowserWindow({
				width: 480,
				height: 720,
				autoHideMenuBar: true,
				webPreferences: { nodeIntegration: false, contextIsolation: true },
			});

	let onClosed: (() => void) | undefined;
	const closedBeforeCode = new Promise<never>((_, reject) => {
		onClosed = () => reject(new Error("Janela de autorização fechada antes de concluir."));
		authWindow?.on("closed", onClosed);
	});
	let timeoutHandle: NodeJS.Timeout | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timeoutHandle = setTimeout(
			() => reject(new Error("A autorização expirou. Tente conectar novamente.")),
			OAUTH_TIMEOUT_MS,
		);
	});

	try {
		if (authWindow) await authWindow.loadURL(authorizeUrl.toString());
		else await shell.openExternal(authorizeUrl.toString());

		// Corre contra o fechamento manual da janela pelo usuário — sem isso, cancelar deixaria a
		// promise pendurada pra sempre (o loopback nunca recebe o callback se o usuário desistir).
		const code = await Promise.race([loopback.waitForCode(state), ...(authWindow ? [closedBeforeCode] : []), timeout]);

		const tokenRes = await fetch(input.tokenUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: redirectUri,
				client_id: credentials.clientId,
				...(credentials.clientSecret ? { client_secret: credentials.clientSecret } : {}),
				code_verifier: verifier,
			}).toString(),
		});
		if (!tokenRes.ok) throw new Error(`Troca do código por token falhou (HTTP ${tokenRes.status}).`);
		const body = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
		if (input.connectorId !== "instagram") {
			return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresIn: body.expires_in };
		}

		const longTokenUrl = new URL("https://graph.instagram.com/access_token");
		longTokenUrl.searchParams.set("grant_type", "ig_exchange_token");
		longTokenUrl.searchParams.set("client_secret", credentials.clientSecret ?? "");
		longTokenUrl.searchParams.set("access_token", body.access_token);
		const longTokenResponse = await fetch(longTokenUrl);
		if (!longTokenResponse.ok)
			throw new Error(`Troca por token de longa duração falhou (HTTP ${longTokenResponse.status}).`);
		const longToken = (await longTokenResponse.json()) as { access_token: string; expires_in?: number };

		const profileUrl = new URL("https://graph.instagram.com/me");
		profileUrl.searchParams.set("fields", "id,username,account_type");
		profileUrl.searchParams.set("access_token", longToken.access_token);
		const profileResponse = await fetch(profileUrl);
		if (!profileResponse.ok)
			throw new Error(`Não foi possível identificar a conta Instagram (HTTP ${profileResponse.status}).`);
		const profile = (await profileResponse.json()) as { id: string; username?: string; account_type?: string };
		if (profile.account_type?.toUpperCase() === "PERSONAL") {
			throw new Error("Esta conta Instagram é pessoal. Conecte uma conta profissional Business ou Creator.");
		}

		return {
			accessToken: longToken.access_token,
			expiresIn: longToken.expires_in,
			accountExternalId: profile.id,
			accountDisplayName: profile.username ? `@${profile.username}` : profile.id,
			accountType: profile.account_type,
		};
	} finally {
		if (timeoutHandle) clearTimeout(timeoutHandle);
		loopback.close();
		// Remove o listener antes de fechar — sem isso, o `close()` abaixo dispararia "closed" de novo
		// e rejeitaria `closedBeforeCode` sem ninguém mais escutando (unhandled rejection).
		if (onClosed) authWindow?.removeListener("closed", onClosed);
		if (authWindow && !authWindow.isDestroyed()) authWindow.close();
	}
};

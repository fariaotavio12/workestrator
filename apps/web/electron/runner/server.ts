import { randomUUID } from "node:crypto";
import http from "node:http";

import {
	handleListFiles,
	handleListModels,
	handlePreviewFile,
	handleRegisterPreview,
	handleResetWorkspace,
	handleRunStep,
	handleSnapshotRun,
	handleTestSecret,
	handleTestTool,
	type SecretCache,
} from "./runner";

export type LocalRunnerServer = {
	baseUrl: string;
	token: string;
	close: () => void;
};

/**
 * Servidor HTTP local (127.0.0.1, porta efêmera) que hospeda `/api/run-step`, `/api/list-models`,
 * `/api/test-secret` e `/api/test-tool` dentro do processo main do Electron — mesmos handlers usados
 * pelo middleware do `vite dev`. Só aceita requisições com o token de sessão gerado no boot
 * (conhecido apenas pelo preload via contextBridge), pra uma outra aplicação rodando na máquina não
 * conseguir chamar o runner batendo direto em localhost.
 */
export const startLocalRunnerServer = (
	/** Cache local opcional (offline, ver plano §8.4) — a resolução primária de secrets é sempre via
	 * backend, com `backendBaseUrl`/`backendToken` vindos no corpo de cada request. */
	cache?: SecretCache,
): Promise<LocalRunnerServer> => {
	const token = randomUUID();

	const server = http.createServer((req, res) => {
		// Renderer (http://localhost:5173 no dev, file:// no build) chama esse servidor cross-origin,
		// então o Chromium manda um preflight OPTIONS antes do POST por causa do header customizado
		// abaixo — preflight nunca carrega esse header, então tem que responder antes de checar o token.
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Orchestrator-Token");

		if (req.method === "OPTIONS") {
			res.statusCode = 204;
			res.end();
			return;
		}
		// Preview de arquivos servido a `<iframe>`/`<img>`, que não conseguem mandar header — autentica
		// pelo token na URL (`?t=`). Roteado ANTES do check de header (exceção deliberada, como o OPTIONS).
		if (req.url?.startsWith("/preview/")) {
			handlePreviewFile(req, res, token);
			return;
		}
		if (req.headers["x-orchestrator-token"] !== token) {
			res.statusCode = 401;
			res.end();
			return;
		}
		if (req.url === "/api/run-step") {
			void handleRunStep(req, res, cache);
			return;
		}
		if (req.url === "/api/list-models") {
			void handleListModels(req, res, cache);
			return;
		}
		if (req.url === "/api/test-secret") {
			void handleTestSecret(req, res, cache);
			return;
		}
		if (req.url === "/api/test-tool") {
			void handleTestTool(req, res, cache);
			return;
		}
		if (req.url === "/api/register-preview") {
			void handleRegisterPreview(req, res);
			return;
		}
		if (req.url === "/api/list-files") {
			void handleListFiles(req, res);
			return;
		}
		if (req.url === "/api/snapshot-run") {
			void handleSnapshotRun(req, res);
			return;
		}
		if (req.url === "/api/reset-workspace") {
			void handleResetWorkspace(req, res);
			return;
		}
		res.statusCode = 404;
		res.end();
	});

	return new Promise((resolve, reject) => {
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				reject(new Error("Falha ao iniciar o servidor local do runner."));
				return;
			}
			resolve({
				baseUrl: `http://127.0.0.1:${address.port}`,
				token,
				close: () => server.close(),
			});
		});
	});
};

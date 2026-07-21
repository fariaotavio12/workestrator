import { spawnSync } from "node:child_process";
import path from "node:path";

import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

import { runOAuthAuthorizationCodeFlow } from "./oauth-flow";
import {
	configureRunnerWorkspace,
	copyPreviewFileTo,
	savePreviewRootZipTo,
	type ResolvedSecret,
	type SecretCache,
} from "./runner/runner";
import { startLocalRunnerServer } from "./runner/server";
import { clearSessionToken, writeSessionToken } from "./session-token-cache";
import { getSecretValue, isVaultAvailable, setSecretValue } from "./secrets-vault";

const isDev = !app.isPackaged;

type UpdateStatusPayload = {
	status: "checking" | "available" | "not_available" | "download_progress" | "downloaded" | "error";
	version?: string;
	percent?: number;
	message?: string;
};

const sendUpdateStatus = (payload: UpdateStatusPayload): void => {
	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send("updater:status", payload);
	}
};

const setupAutoUpdater = (): void => {
	autoUpdater.autoDownload = true;
	autoUpdater.autoInstallOnAppQuit = true;

	autoUpdater.on("checking-for-update", () => sendUpdateStatus({ status: "checking" }));
	autoUpdater.on("update-available", (info) => sendUpdateStatus({ status: "available", version: info.version }));
	autoUpdater.on("update-not-available", (info) =>
		sendUpdateStatus({ status: "not_available", version: info.version }),
	);
	autoUpdater.on("download-progress", (progress) =>
		sendUpdateStatus({ status: "download_progress", percent: progress.percent }),
	);
	autoUpdater.on("update-downloaded", (info) => sendUpdateStatus({ status: "downloaded", version: info.version }));
	autoUpdater.on("error", (error) => sendUpdateStatus({ status: "error", message: error.message }));
};

const sanitizeSuggestedFileName = (value: string, fallback: string): string => {
	const withoutControlChars = Array.from(value)
		.map((char) => (char.charCodeAt(0) < 32 ? "-" : char))
		.join("");
	const cleaned = withoutControlChars
		.trim()
		.replace(/[<>:"/\\|?*]+/g, "-")
		.replace(/\s+/g, " ")
		.replace(/^\.+|\.+$/g, "");
	return cleaned || fallback;
};

/**
 * Cache local opcional (offline, plano §8.4) — o backend é a fonte da verdade dos secrets; isto só
 * permite um run repetir sem rede depois de já ter resolvido um secret com sucesso pelo menos uma
 * vez. Reaproveita `secrets-vault.ts` (Electron `safeStorage`) guardando o `ResolvedSecret` inteiro
 * (value+authType+metadata) como JSON sob a chave = id do secret. Nunca exposto ao renderer.
 */
const secretCache: SecretCache | undefined = isVaultAvailable()
	? {
			get: (id) => {
				const raw = getSecretValue(id);
				if (!raw) return undefined;
				try {
					return JSON.parse(raw) as ResolvedSecret;
				} catch {
					return undefined;
				}
			},
			set: (id, resolved) => setSecretValue(id, JSON.stringify(resolved)),
		}
	: undefined;

/**
 * Apps GUI empacotados no macOS/Linux não herdam o PATH configurado no shell do usuário (~/.zshrc
 * etc.) — só o PATH mínimo do sistema. Sem isso, `spawn("claude", ...)` no runner falha com
 * ENOENT mesmo com o CLI instalado e funcionando no terminal. No Windows o PATH de usuário já
 * chega via registro, então isso é no-op lá.
 */
const fixPath = (): void => {
	if (process.platform === "win32") return;
	try {
		const shell = process.env.SHELL ?? "/bin/zsh";
		const result = spawnSync(shell, ["-ilc", "echo __PATH__$PATH__PATH__"], { encoding: "utf-8" });
		const match = result.stdout?.match(/__PATH__(.*)__PATH__/);
		if (match?.[1]) process.env.PATH = match[1];
	} catch {
		// Best-effort — se o shell do usuário falhar aqui, o runner ainda tenta com o PATH default.
	}
};

const createWindow = async (): Promise<void> => {
	configureRunnerWorkspace(path.join(app.getPath("userData"), "runner", "orchestrator-workspace"));
	const runner = await startLocalRunnerServer(secretCache);

	const win = new BrowserWindow({
		width: 1440,
		height: 900,
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			additionalArguments: [`--orch-base-url=${runner.baseUrl}`, `--orch-token=${runner.token}`],
		},
	});

	win.on("closed", () => runner.close());

	if (isDev) {
		await win.loadURL("http://localhost:5173");
		win.webContents.openDevTools();
	} else {
		await win.loadFile(path.join(__dirname, "../dist/index.html"));
	}
};

/** Diálogo nativo do SO pra escolher um arquivo/diretório — usado pelo campo `path` de scripts "file". */
ipcMain.handle("dialog:select-path", async () => {
	const result = await dialog.showOpenDialog({ properties: ["openFile", "openDirectory"] });
	if (result.canceled || result.filePaths.length === 0) return null;
	return result.filePaths[0];
});

ipcMain.handle(
	"files:save-preview-file",
	async (
		_event,
		input: { rootId?: string; relativePath?: string; suggestedName?: string },
	): Promise<{ saved: boolean; path?: string }> => {
		const relativePath = input.relativePath ?? "";
		const suggestedName = sanitizeSuggestedFileName(input.suggestedName ?? path.basename(relativePath), "arquivo");
		const result = await dialog.showSaveDialog({
			defaultPath: suggestedName,
			properties: ["showOverwriteConfirmation"],
		});
		if (result.canceled || !result.filePath) return { saved: false };
		copyPreviewFileTo(input.rootId ?? "", relativePath, result.filePath);
		return { saved: true, path: result.filePath };
	},
);

ipcMain.handle(
	"files:save-preview-archive",
	async (_event, input: { rootId?: string; suggestedName?: string }): Promise<{ saved: boolean; path?: string }> => {
		const suggestedName = sanitizeSuggestedFileName(
			input.suggestedName ?? "arquivos-do-run.zip",
			"arquivos-do-run.zip",
		);
		const result = await dialog.showSaveDialog({
			defaultPath: suggestedName.toLowerCase().endsWith(".zip") ? suggestedName : `${suggestedName}.zip`,
			filters: [{ name: "ZIP", extensions: ["zip"] }],
			properties: ["showOverwriteConfirmation"],
		});
		if (result.canceled || !result.filePath) return { saved: false };
		savePreviewRootZipTo(input.rootId ?? "", result.filePath);
		return { saved: true, path: result.filePath };
	},
);

/** Botão "Conectar" do catálogo de conectores — ver `oauth-flow.ts`. Só existe dentro do Electron:
 * abrir uma janela nativa e subir um servidor loopback não é algo que o navegador consiga fazer. */
ipcMain.handle("oauth:connect", async (_event, input: Parameters<typeof runOAuthAuthorizationCodeFlow>[0]) =>
	runOAuthAuthorizationCodeFlow(input),
);

/**
 * Cache do token de sessão do backend em `~/.workestrator/mcp-session-token.json` (texto puro, ver
 * `session-token-cache.ts`) — deixa o MCP server externo (`electron/mcp-server/index.ts`, processo
 * Node separado, sem acesso ao `localStorage` do renderer) autenticar sozinho, sem o usuário copiar o
 * token manualmente. Chamado pelo `authProvider.tsx` a cada login/logout.
 */
ipcMain.handle("auth:cache-session-token", (_event, token: string, expiresAt: string) =>
	writeSessionToken(token, expiresAt),
);
ipcMain.handle("auth:clear-session-token", () => clearSessionToken());
ipcMain.handle("updater:check", async () => {
	if (isDev) {
		sendUpdateStatus({ status: "not_available", version: app.getVersion(), message: "Updater desativado em dev." });
		return;
	}

	try {
		await autoUpdater.checkForUpdatesAndNotify();
	} catch (error) {
		const message = error instanceof Error ? error.message : "Falha ao procurar atualizacao.";
		sendUpdateStatus({ status: "error", message });
	}
});
ipcMain.handle("updater:install", () => {
	autoUpdater.quitAndInstall();
});

app.whenReady().then(async () => {
	fixPath();
	setupAutoUpdater();
	await createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) void createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

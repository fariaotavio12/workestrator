import { contextBridge, ipcRenderer } from "electron";

/** Lê um argumento `--flag=valor` passado via `webPreferences.additionalArguments` (main.ts). */
const readArg = (flag: string): string => {
	const prefix = `--${flag}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match ? match.slice(prefix.length) : "";
};

/**
 * Ponte exposta ao renderer via `window.__ORCH_API__`. `model-client.ts` usa isso pra saber pra onde
 * mandar `/api/run-step` (localhost do processo main, não o dev server) e anexar o token de sessão.
 * `contextIsolation` fica ligado — o renderer nunca ganha acesso a Node/child_process diretamente.
 */
contextBridge.exposeInMainWorld("__ORCH_API__", {
	baseUrl: readArg("orch-base-url"),
	token: readArg("orch-token"),
	/** Abre o diálogo nativo do SO; resolve `null` se o usuário cancelar. */
	selectPath: (): Promise<string | null> => ipcRenderer.invoke("dialog:select-path"),
	savePreviewFile: (input: {
		rootId: string;
		relativePath: string;
		suggestedName: string;
	}): Promise<{ saved: boolean; path?: string }> => ipcRenderer.invoke("files:save-preview-file", input),
	savePreviewArchive: (input: { rootId: string; suggestedName: string }): Promise<{ saved: boolean; path?: string }> =>
		ipcRenderer.invoke("files:save-preview-archive", input),
	/** Botão "Conectar" do catálogo de conectores — abre a janela de autorização OAuth (ver oauth-flow.ts). */
	connectOAuth: (input: {
		authUrl: string;
		tokenUrl: string;
		clientId: string;
		clientSecret?: string;
		scopes?: string;
	}): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> =>
		ipcRenderer.invoke("oauth:connect", input),
	/** Cacheia o token de sessão em disco pro MCP server externo usar sozinho (ver `session-token-cache.ts`). */
	cacheSessionToken: (token: string, expiresAt: string): Promise<void> =>
		ipcRenderer.invoke("auth:cache-session-token", token, expiresAt),
	clearSessionToken: (): Promise<void> => ipcRenderer.invoke("auth:clear-session-token"),
	updates: {
		check: (): Promise<void> => ipcRenderer.invoke("updater:check"),
		install: (): Promise<void> => ipcRenderer.invoke("updater:install"),
		onStatus: (
			callback: (payload: {
				status: "checking" | "available" | "not_available" | "download_progress" | "downloaded" | "error";
				version?: string;
				percent?: number;
				message?: string;
			}) => void,
		): (() => void) => {
			const listener = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof callback>[0]) =>
				callback(payload);
			ipcRenderer.on("updater:status", listener);
			return () => ipcRenderer.removeListener("updater:status", listener);
		},
	},
});

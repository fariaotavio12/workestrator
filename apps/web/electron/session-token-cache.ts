import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Cache local do token de sessão do backend, usado só pelo MCP server externo
 * (`electron/mcp-server/index.ts`) pra não exigir copiar o token manualmente do DevTools toda vez.
 * Escrito pelo processo main quando o usuário loga (`main.ts`, IPC `auth:cache-session-token`); lido
 * pelo MCP server, que roda como processo Node standalone (sem acesso a `electron`'s
 * `safeStorage`/`app` — por isso texto puro aqui, não cifrado como `secrets-vault.ts`). Mesmo modelo
 * de confiança de CLIs como `gh`/`aws`: um arquivo escopado ao diretório do usuário no SO, não ao app.
 * Caminho fixo via `os.homedir()` (não `app.getPath("userData")`) de propósito — este módulo não
 * importa `electron`, então precisa ser resolvível igual nos dois processos sem depender do nome do
 * app registrado no Electron (que difere entre dev e build empacotado).
 */
const CACHE_PATH = path.join(os.homedir(), ".workestrator", "mcp-session-token.json");

type CachedToken = { token: string; expiresAt: string };

export const writeSessionToken = (token: string, expiresAt: string): void => {
	fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
	fs.writeFileSync(CACHE_PATH, JSON.stringify({ token, expiresAt } satisfies CachedToken), "utf-8");
};

export const clearSessionToken = (): void => {
	fs.rm(CACHE_PATH, { force: true }, () => {});
};

/** `undefined` se não houver cache ou se o token já tiver expirado. */
export const readSessionToken = (): string | undefined => {
	try {
		const { token, expiresAt } = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")) as CachedToken;
		if (new Date(expiresAt).getTime() <= Date.now()) return undefined;
		return token;
	} catch {
		return undefined;
	}
};

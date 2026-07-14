import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

// Cache local opcional de secrets (plano §8.4) — o backend é a fonte da verdade (valor cifrado em
// repouso, resolvido via `GET /secrets/{id}/value`); isto só existe pra um run repetir sem rede
// depois de já ter resolvido um secret com sucesso ao menos uma vez (ver `main.ts`, `secretCache`).
// Só existe no processo main do Electron, nunca importado por `electron/runner/*` (que também roda
// sob `vite dev`, fora do Electron). O valor fica criptografado em disco via `safeStorage` (chave do
// keychain/DPAPI do SO) — chave = id do secret, valor = JSON de `ResolvedSecret`.
type VaultFile = Record<string, string>; // id -> base64(encryptString(JSON.stringify(ResolvedSecret)))

const vaultPath = (): string => path.join(app.getPath("userData"), "secrets-vault.json");

const readVaultFile = (): VaultFile => {
	try {
		return JSON.parse(fs.readFileSync(vaultPath(), "utf-8")) as VaultFile;
	} catch {
		return {};
	}
};

const writeVaultFile = (data: VaultFile): void => {
	fs.mkdirSync(path.dirname(vaultPath()), { recursive: true });
	fs.writeFileSync(vaultPath(), JSON.stringify(data, null, 2), "utf-8");
};

export const isVaultAvailable = (): boolean => safeStorage.isEncryptionAvailable();

export const setSecretValue = (label: string, value: string): void => {
	if (!isVaultAvailable()) {
		throw new Error("Criptografia indisponível neste sistema — não é possível salvar o segredo.");
	}
	const data = readVaultFile();
	data[label] = safeStorage.encryptString(value).toString("base64");
	writeVaultFile(data);
};

/** Só o runner (processo main) chama isso — nunca exposto ao renderer via preload. */
export const getSecretValue = (label: string): string | undefined => {
	const encoded = readVaultFile()[label];
	if (!encoded) return undefined;
	try {
		return safeStorage.decryptString(Buffer.from(encoded, "base64"));
	} catch {
		return undefined;
	}
};


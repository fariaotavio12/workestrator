// Cliente do passo "Testar" do wizard — mesmo padrão de `orchestrator-shared/runtime/model-client.ts`
// (`testSecretConnection`): bate no runner local (dev-only middleware ou servidor do processo main
// do Electron), nunca chama a integração direto do navegador.
import { apiUrl } from "@/app/api/clients";
import { tokenStorage } from "@/app/utils/tokenStorage";
import type { ScriptPayload } from "./types";

export type TestToolResult = { ok: boolean; message: string; detail?: string };

/** Testa uma integração de verdade via `/api/test-tool` — o script ainda pode não ter `id` salvo. */
export const testTool = async (script: ScriptPayload): Promise<TestToolResult> => {
	const orchApi = window.__ORCH_API__;
	const backendToken = await tokenStorage.get();
	const res = await fetch(`${orchApi?.baseUrl ?? ""}/api/test-tool`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(orchApi?.token ? { "X-Orchestrator-Token": orchApi.token } : {}),
		},
		body: JSON.stringify({
			script: { id: "wizard-preview", ...script },
			backendBaseUrl: apiUrl,
			backendToken,
		}),
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		return { ok: false, message: body.message ?? `Falha ao testar (HTTP ${res.status}).` };
	}
	return { ok: Boolean(body.ok), message: body.message ?? "", detail: body.detail };
};

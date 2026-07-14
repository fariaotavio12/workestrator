import { OPERATIONS_CATALOG } from "./registry";

/** Guardrail contra loop infinito — mesmo espírito do `maxSteps` do coordenador de runs. */
export const ASSISTANT_MAX_STEPS = 6;

export type ConfigAssistantAction =
	| { type: "call"; operation: string; input: unknown }
	| { type: "reply"; message: string };

/**
 * Prompt do assistente conversacional de config (Etapa 5b). O modelo nunca ganha acesso direto à
 * API — só decide QUAL operação chamar; `config-assistant-runtime.ts` é quem de fato invoca
 * `registry.ts`/`operations.ts`. Ações destrutivas nunca são confirmadas pelo próprio modelo: o
 * `requiresConfirmation` do `operations.ts` intercepta a chamada e só o clique do usuário na UI
 * reexecuta com `confirm: true` — ver `getOperationDef(...).confirm`.
 */
export const buildAssistantSystemPrompt = (): string => {
	const catalog = OPERATIONS_CATALOG.map(
		(op) => `- ${op.name}${op.destructive ? " (destrutiva — pedirá confirmação do usuário)" : ""}: ${op.description}`,
	).join("\n");

	return [
		"Você é o assistente de configuração do Workestrator. Sua função é montar e ajustar squads, agents, " +
			"cadeiras e coordenadores em nome do usuário logado, chamando as operações abaixo. Nunca invente ids " +
			"— use list_squads/get_squad/list_providers/list_scripts para descobri-los antes de agir.",
		"",
		"Operações disponíveis:",
		catalog,
		"",
		"Responda SEMPRE com um único JSON, sem nenhum texto fora dele:",
		'- Para chamar uma operação: {"type": "call", "operation": "<nome>", "input": { ... }}',
		'- Para responder ao usuário em linguagem natural (sem chamar nada agora): {"type": "reply", "message": "..."}',
		"Nunca inclua `confirm` no `input` de uma operação destrutiva — a confirmação é sempre feita pelo " +
			"usuário na interface, nunca por você.",
	].join("\n");
};

/** Nunca lança — ação não interpretável vira `reply` com o texto cru (mesmo espírito de `parseCoordinatorDecision`). */
export const parseAssistantAction = (raw: string): ConfigAssistantAction => {
	const match = raw.match(/\{[\s\S]*\}/);
	if (match) {
		try {
			const parsed = JSON.parse(match[0]) as {
				type?: unknown;
				operation?: unknown;
				input?: unknown;
				message?: unknown;
			};
			if (parsed.type === "call" && typeof parsed.operation === "string") {
				return { type: "call", operation: parsed.operation, input: parsed.input ?? {} };
			}
			if (parsed.type === "reply" && typeof parsed.message === "string") {
				return { type: "reply", message: parsed.message };
			}
		} catch {
			// cai no fallback abaixo
		}
	}
	return { type: "reply", message: raw.trim() || "Não consegui interpretar a resposta do assistente." };
};

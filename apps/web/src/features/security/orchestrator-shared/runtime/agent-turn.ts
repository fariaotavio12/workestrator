// Parser do turno de um agent (não do coordenador) — ele responde com o resultado do trabalho
// normalmente, mas pode pausar pra perguntar algo antes de continuar (estilo Claude Code).
// Diferente do parser do coordenador (que sempre responde só JSON), aqui a resposta normal é texto
// livre — por isso exigimos o JSON da pergunta como a resposta INTEIRA, não uma substring, senão
// qualquer chave solta no resultado do agent (ex.: um trecho de código) seria interpretada como pergunta.
export type AgentTurnResult =
	| { kind: "final"; content: string }
	| { kind: "question"; question: string; options?: string[] };

export const AGENT_TURN_INSTRUCTIONS =
	"\n\nSe precisar perguntar algo ao usuário antes de continuar (ex.: confirmar uma decisão, escolher " +
	"entre opções, pedir uma informação que falta), responda SOMENTE com um JSON no formato " +
	'{"type":"question","question":"...","options":["...","..."]} (options é opcional) — nada mais na ' +
	"resposta nesse caso. Caso contrário, responda normalmente com o resultado do seu trabalho.";

export const parseAgentTurn = (raw: string): AgentTurnResult => {
	const trimmed = raw.trim();
	try {
		const parsed = JSON.parse(trimmed) as { type?: unknown; question?: unknown; options?: unknown };
		if (parsed.type === "question" && typeof parsed.question === "string" && parsed.question.trim()) {
			const options = Array.isArray(parsed.options)
				? parsed.options.filter((o): o is string => typeof o === "string")
				: undefined;
			return {
				kind: "question",
				question: parsed.question.trim(),
				options: options && options.length > 0 ? options : undefined,
			};
		}
	} catch {
		// Não é o marcador de pergunta — trata como resposta final (texto livre).
	}
	return { kind: "final", content: trimmed };
};

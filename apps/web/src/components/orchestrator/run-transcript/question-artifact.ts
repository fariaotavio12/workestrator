import { parseAgentTurn } from "@/features/security/orchestrator-shared/runtime/agent-turn";

export const formatAgentArtifactContent = (content: string): string => {
	const turn = parseAgentTurn(content);
	if (turn.kind !== "question") return content;

	const options = turn.options?.length ? `\n\nOpcoes:\n${turn.options.map((option) => `- ${option}`).join("\n")}` : "";
	return `Pergunta ao usuario: ${turn.question}${options}`;
};

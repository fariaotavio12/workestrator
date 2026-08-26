import type {
	ApprovalCheckpointKind,
	ApprovalItemDraft,
	ApprovalStatus,
	CharacterName,
	RunFile,
	RunRecord,
	RuntimeSnapshot,
} from "@/features/security/orchestrator-shared/types";

export type CreateApprovalPayload = {
	squadId: string;
	runId: string;
	seatId: string;
	agentId?: string | null;
	checkpointKind: ApprovalCheckpointKind;
	title: string;
	summary: string;
	/** Itens decidíveis (design D15) — omitido/vazio cria o pedido booleano de sempre. */
	items?: ApprovalItemDraft[];
};

export type DecideApprovalPayload = {
	approved: boolean;
	feedback?: string;
};

export type { ApprovalStatus };

/**
 * A execução por trás de uma aprovação, como o backend a libera para quem participa dela
 * (`GET /approvals/:id/run`). Não é um `RunRecord`: vem sem as conexões usadas, sem as reprovações e
 * sem nada que dê acesso ao squad — só o suficiente para ler o transcript e ver onde o run está.
 */
export type ApprovalRunView = {
	id: string;
	approvalId: string;
	input: string;
	status: RunRecord["status"];
	startedAt: string;
	endedAt: string | null;
	/**
	 * Anuláveis de propósito: as colunas `jsonb` do run chegam como `null` em linhas antigas, e a tela de
	 * decisão não pode quebrar por causa disso — o aprovador perderia até o que já conseguia fazer.
	 */
	steps: RunRecord["steps"] | null;
	qaLog: RunRecord["qaLog"] | null;
	runtimeSnapshot?: RuntimeSnapshot | null;
	files: RunFile[] | null;
	/** Ausente quando o dono apagou o squad depois — o run e a decisão sobrevivem a isso. */
	squad?: { id: string; name: string; icon: string } | null;
	/** Só o que rotula um turno: sem prompt, modelo ou ferramentas. */
	agents: { id: string; name: string; role: string; character: CharacterName; accentColor: string }[] | null;
};

export type OperationSuccess<T> = {
	ok: true;
	data: T;
	summary: string;
};

export type OperationConfirmationRequired = {
	ok: false;
	requiresConfirmation: true;
	summary: string;
};

export type OperationFailure = {
	ok: false;
	requiresConfirmation?: false;
	error: string;
};

/**
 * Retorno padrão de toda operação de config. `requiresConfirmation` é o "checkpoint" pra ações
 * destrutivas (delete_squad, remove_agent, remove_seat): a operação só executa de fato quando
 * chamada de novo com `{ confirm: true }` — ver docs/plano-integracoes-e-flow-builder.md, Etapa 5.
 */
export type OperationResult<T> = OperationSuccess<T> | OperationConfirmationRequired | OperationFailure;

export type OperationCallOptions = {
	/** Necessário como `true` para operações destrutivas seguirem em frente. */
	confirm?: boolean;
};

export type AuditEntryStatus = "success" | "failure" | "confirmation_required";

export type AuditEntry = {
	id: string;
	operation: string;
	input: unknown;
	status: AuditEntryStatus;
	summary: string;
	timestamp: string;
};

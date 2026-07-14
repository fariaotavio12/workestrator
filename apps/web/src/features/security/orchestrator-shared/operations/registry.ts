import * as ops from "./operations";
import { OPERATIONS_META, type OperationMeta, type OperationName } from "./catalog";
import type { OperationResult } from "./types";

export type { OperationName } from "./catalog";

export type OperationDef = OperationMeta & {
	/** Chamada padrão — nunca recebe `confirm` daqui (quem decide confirmar é sempre o usuário na UI). */
	call: (input: unknown) => Promise<OperationResult<unknown>>;
	/** Só o botão "Confirmar" da UI usa isto — reexecuta a MESMA operação com `confirm: true`. */
	confirm?: (input: unknown) => Promise<OperationResult<unknown>>;
};

type CallFn = (input: unknown) => Promise<OperationResult<unknown>>;

const CALLS: Record<OperationName, CallFn> = {
	list_squads: () => ops.listSquads(),
	get_squad: (input) => ops.getSquad(input as Parameters<typeof ops.getSquad>[0]),
	create_squad: (input) => ops.createSquad(input as Parameters<typeof ops.createSquad>[0]),
	update_squad: (input) => ops.updateSquad(input as Parameters<typeof ops.updateSquad>[0]),
	delete_squad: (input) => ops.deleteSquad(input as Parameters<typeof ops.deleteSquad>[0]),
	add_agent: (input) => ops.addAgent(input as Parameters<typeof ops.addAgent>[0]),
	update_agent: (input) => ops.updateAgent(input as Parameters<typeof ops.updateAgent>[0]),
	remove_agent: (input) => ops.removeAgent(input as Parameters<typeof ops.removeAgent>[0]),
	add_seat: (input) => ops.addSeat(input as Parameters<typeof ops.addSeat>[0]),
	assign_seat: (input) => ops.assignSeat(input as Parameters<typeof ops.assignSeat>[0]),
	remove_seat: (input) => ops.removeSeat(input as Parameters<typeof ops.removeSeat>[0]),
	set_orchestrator: (input) => ops.setOrchestrator(input as Parameters<typeof ops.setOrchestrator>[0]),
	attach_tool: (input) => ops.attachTool(input as Parameters<typeof ops.attachTool>[0]),
	create_skill: (input) => ops.createSkill(input as Parameters<typeof ops.createSkill>[0]),
	run_squad: (input) => ops.runSquad(input as Parameters<typeof ops.runSquad>[0]),
	list_runs: (input) => ops.listRuns(input as Parameters<typeof ops.listRuns>[0]),
	list_providers: () => ops.listProviders(),
	list_scripts: () => ops.listScripts(),
};

const CONFIRMS: Partial<Record<OperationName, CallFn>> = {
	delete_squad: (input) => ops.deleteSquad(input as Parameters<typeof ops.deleteSquad>[0], { confirm: true }),
	remove_agent: (input) => ops.removeAgent(input as Parameters<typeof ops.removeAgent>[0], { confirm: true }),
	remove_seat: (input) => ops.removeSeat(input as Parameters<typeof ops.removeSeat>[0], { confirm: true }),
};

/**
 * Catálogo das operações de config expostas ao assistente conversacional (`operations/assistant.ts`)
 * — amarra os metadados puros de `catalog.ts` às funções reais de `operations.ts`. Ver Etapa 5 do
 * plano.
 */
export const OPERATIONS_CATALOG: OperationDef[] = OPERATIONS_META.map((meta) => ({
	...meta,
	call: CALLS[meta.name],
	confirm: CONFIRMS[meta.name],
}));

export const getOperationDef = (name: string): OperationDef | undefined =>
	OPERATIONS_CATALOG.find((op) => op.name === name);

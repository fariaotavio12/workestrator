/** Posicao (em % do palco) da estacao do coordenador, no topo-centro em destaque. */
export const COORDINATOR_POINT = { x: 50, y: 20 };

const COL_X: Record<number, number> = { 1: 20, 2: 50, 3: 80 };

/** Espaco vertical entre linhas calibrado para duas linhas de bancadas com respiro. */
const ROW_Y_START = 47;
const ROW_Y_STEP = 27;

/**
 * Converte a posicao logica de uma cadeira (`col`/`row`, 1-based) na posicao visual do palco.
 * O agente nao se move durante a execucao; o status e o balao mudam na propria bancada.
 */
export const seatToPosition = (col: number, row: number): { x: number; y: number } => ({
	x: COL_X[col] ?? 51 + (col - 3) * 17,
	y: ROW_Y_START + (row - 1) * ROW_Y_STEP,
});

/** Reexportado por conveniencia; a fonte unica fica em `orchestrator-shared/data/characters`. */
export { poseForStatus } from "@/features/security/orchestrator-shared/data/characters";

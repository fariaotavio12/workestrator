/** Posição (em % do palco) da estação do coordenador — logo abaixo da parede do fundo, centralizada. */
export const COORDINATOR_POINT = { x: 50, y: 25 };

/** Ponto de ação: onde o agente chamado caminha para trabalhar, próximo ao coordenador. */
export const ACTION_POINT = { x: 50, y: 44 };

const COL_X: Record<number, number> = { 1: 15, 2: 50, 3: 85 };

/** Espaço vertical entre linhas — calibrado para as estações (avatar + mesa) ocuparem até o rodapé. */
const ROW_Y_START = 60;
const ROW_Y_STEP = 21;

/**
 * Converte a posição lógica de uma cadeira (`col`/`row`, 1-based) na posição visual do palco,
 * em porcentagem do container. Colunas > 3 (squads maiores) continuam espaçadas à direita da
 * última coluna conhecida em vez de quebrar — não há hoje squad com mais de 3 colunas.
 */
export const seatToPosition = (col: number, row: number): { x: number; y: number } => ({
	x: COL_X[col] ?? 82 + (col - 3) * 32,
	y: ROW_Y_START + (row - 1) * ROW_Y_STEP,
});

/** Reexportado por conveniência — fonte única fica em `orchestrator-shared/data/characters`,
 * também usada pelo `run-activity-map`. */
export { poseForStatus } from "@/features/security/orchestrator-shared/data/characters";

// Gestão do abort controller do runner orquestrado — não serializável, por isso vive fora do
// estado do Zustand (chave por squadId, já que só um passo roda por vez em cada squad).
const controllers = new Map<string, AbortController>();

/** Roda uma tarefa assíncrona (chamada real ao provider de modelo) cancelável via `cancelAdvance`. */
export const runAbortable = (squadId: string, task: (signal: AbortSignal) => Promise<void>): void => {
	cancelAdvance(squadId);
	const controller = new AbortController();
	controllers.set(squadId, controller);
	task(controller.signal).finally(() => {
		if (controllers.get(squadId) === controller) controllers.delete(squadId);
	});
};

export const cancelAdvance = (squadId: string): void => {
	const controller = controllers.get(squadId);
	if (controller) {
		controller.abort();
		controllers.delete(squadId);
	}
};

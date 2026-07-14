/**
 * Função para extrair mensagens de erro de respostas de API.
 * @param error Objeto de erro retornado pela API.
 * @param fallbackMessage Mensagem padrão caso nenhuma mensagem específica seja encontrada.
 * @returns Mensagem de erro extraída ou a mensagem padrão.
 */
export const getApiErrorMessage = (error: any, fallbackMessage?: string): string => {
	const data = error?.response?.data;
	const message = typeof data?.message === "string" ? data.message : undefined;
	const details = data?.details;

	if (Array.isArray(details) && details.length > 0) {
		// Exibe message + detalhes, se ambos existirem
		return [message, ...details].filter(Boolean).join("\n");
	}

	if (typeof details === "string" && details.trim().length > 0) {
		return [message, details].filter(Boolean).join("\n");
	}

	if (message && message.trim().length > 0) {
		return message;
	}

	if (typeof error?.message === "string" && error.message.trim().length > 0) {
		return error.message;
	}

	return fallbackMessage || "Ocorreu um erro inesperado";
};

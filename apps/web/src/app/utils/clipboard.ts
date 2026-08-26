const fallbackCopy = (texto: string) => {
	const container = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[role='dialog']") ?? document.body;
	const textarea = document.createElement("textarea");

	textarea.value = texto;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.top = "0";
	textarea.style.left = "0";
	textarea.style.opacity = "0";
	container.appendChild(textarea);

	try {
		textarea.select();
		textarea.setSelectionRange(0, texto.length);
		return document.execCommand("copy");
	} catch {
		return false;
	} finally {
		textarea.remove();
	}
};

export const copyToClipboard = async (texto: string) => {
	if (window.isSecureContext && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(texto);
			return true;
		} catch {
			return fallbackCopy(texto);
		}
	}

	return fallbackCopy(texto);
};

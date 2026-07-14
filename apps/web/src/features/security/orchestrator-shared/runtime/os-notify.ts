// Notificação nativa do SO — canal principal para runs que o usuário não está olhando no momento
// (janela minimizada/em background, ou um run disparado por scheduler no futuro). Usa a Web
// Notification API padrão: funciona tanto no Electron empacotado (o Chromium do renderer expõe a API
// nativamente, sem precisar de IPC/preload) quanto no navegador durante `npm run dev`. Degrada em
// silêncio se a API não existir ou a permissão não for concedida — o toast in-app já cobre esse caso.
let permissionRequested = false;

const ensurePermission = async (): Promise<boolean> => {
	if (typeof Notification === "undefined") return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	if (permissionRequested) return false;
	permissionRequested = true;
	const result = await Notification.requestPermission();
	return result === "granted";
};

/** A janela está em foco e visível — o toast in-app já é suficiente, não duplica com notificação de SO. */
const isWindowFocused = (): boolean =>
	typeof document !== "undefined" && document.hasFocus() && !document.hidden;

/** Dispara só quando a janela não está em foco. `onClick` roda depois de focar a janela de volta. */
export const notifyOs = (title: string, body: string, onClick?: () => void): void => {
	if (isWindowFocused()) return;
	if (typeof Notification === "undefined") return;

	void ensurePermission().then((granted) => {
		if (!granted) return;
		const notification = new Notification(title, { body });
		notification.onclick = () => {
			window.focus();
			onClick?.();
			notification.close();
		};
	});
};

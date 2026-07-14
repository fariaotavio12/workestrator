import { useEffect, useRef, type RefObject } from "react";
import { toast } from "sonner";

const PERMISSION_PROMPT_KEY = "notification-permission-prompted";

export const requestNotificationPermission = async (): Promise<boolean> => {
	if (!("Notification" in window)) return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	const result = await Notification.requestPermission();
	return result === "granted";
};

const PermissionToast = ({
	toastId,
	permissionGrantedRef,
}: {
	toastId: string | number;
	permissionGrantedRef: RefObject<boolean>;
}) => {
	return (
		<div className="bg-card flex w-80 flex-col gap-2 rounded-lg border p-4 shadow-lg">
			<p className="text-foreground text-sm font-semibold">Ativar notificações</p>
			<p className="text-muted-foreground text-xs">
				Receba avisos de novos eventos, registros e atualizações em tempo real.
			</p>
			<div className="flex gap-2 pt-1">
				<button
					type="button"
					onClick={() => {
						requestNotificationPermission().then((granted) => {
							permissionGrantedRef.current = granted;
						});
						toast.dismiss(toastId);
					}}
					className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-3 py-1.5 text-xs font-medium"
				>
					Ativar
				</button>
				<button
					type="button"
					onClick={() => toast.dismiss(toastId)}
					className="text-muted-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-xs font-medium"
				>
					Agora não
				</button>
			</div>
		</div>
	);
};

export const useNotificationWatcher = (enabled = true) => {
	const permissionGrantedRef = useRef(false);

	useEffect(() => {
		if (!enabled) return;
		if (!("Notification" in window)) return;

		if (Notification.permission === "granted") {
			permissionGrantedRef.current = true;
			return;
		}

		if (Notification.permission === "denied") return;

		if (localStorage.getItem(PERMISSION_PROMPT_KEY)) return;
		localStorage.setItem(PERMISSION_PROMPT_KEY, "1");

		toast.custom((t) => <PermissionToast toastId={t} permissionGrantedRef={permissionGrantedRef} />, {
			duration: Infinity,
		});
	}, [enabled]);
};

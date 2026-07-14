import { toast } from "sonner";
import { Toast, type ToastAction } from "./toast";

// overloads
type NotifyFn = {
	(message: string): void;
	(title: string, message: string, action?: ToastAction): void;
};

const make =
	(type: "success" | "error" | "warning" | "info", defaultDuration = 4000): NotifyFn =>
	(...args: [string] | [string, string, ToastAction?]) => {
		const hasTitle = args.length >= 2;
		const title = hasTitle ? args[0] : undefined;
		const message = hasTitle ? (args[1] as string) : args[0]; // garante string sempre
		const action = hasTitle ? (args[2] as ToastAction | undefined) : undefined;

		toast.custom(
			(t) => <Toast title={title} message={message} type={type} action={action} onClose={() => toast.dismiss(t)} />,
			// Notificação acionável fica mais tempo na tela — o usuário precisa de espaço pra ler e clicar.
			{ duration: action ? Math.max(defaultDuration, 8000) : defaultDuration },
		);
	};

export const notify = {
	success: make("success", 4000),
	error: make("error", 6000),
	warning: make("warning", 5000),
	info: make("info", 4000),
};

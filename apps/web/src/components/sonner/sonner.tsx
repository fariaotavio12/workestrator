import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			theme={"system"}
			className="toaster group"
			position="bottom-right"
			offset={20}
			gap={10}
			toastOptions={{
				classNames: {
					toast:
						// `pointer-events-auto`: com um Sheet/Dialog do Radix aberto, o body ganha
						// `pointer-events: none` (DismissableLayer, pra bloquear clique fora do modal) — o toast
						// é um portal separado, direto no body, então herdava esse `none` e o botão de fechar
						// ficava visível mas não clicável. Isto reforça o clique no card do toast.
						"group toast pointer-events-auto group-[.toaster]:border-border/80 group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:rounded-xl group-[.toaster]:shadow-xl group-[.toaster]:shadow-foreground/5 group-[.toaster]:backdrop-blur",
					description: "group-[.toast]:text-muted-foreground",
					actionButton:
						"group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
					cancelButton:
						"group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
					closeButton:
						"group-[.toast]:border-border group-[.toast]:bg-card group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground",
					icon: "group-[.toast]:text-primary",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };

import { Button } from "@/components/button";
import { Typography } from "@/components/typography";
import { cn } from "@/app/utils/cn";
import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
	/** Título destacado do estado vazio. */
	title?: string;
	/** Mensagem descritiva exibida ao usuário. */
	message?: string;
	/** Ícone exibido no topo (padrão `Inbox`). */
	icon?: LucideIcon;
	/** Callback da ação primária (ex.: criar primeiro item). */
	onAction?: () => void;
	/** Rótulo do botão de ação. */
	actionLabel?: string;
	/** Ícone opcional do botão de ação. */
	actionIcon?: ReactNode;
	className?: string;
};

/**
 * Estado vazio genérico para listas e tabelas sem dados em qualquer tela.
 * Distingue ausência de dados de erro de carregamento — use ao lado de `ErrorState`.
 */
export const EmptyState = ({
	title = "Nenhum dado por aqui",
	message = "Ainda não há registros para exibir.",
	icon: Icon = Inbox,
	onAction,
	actionLabel = "Adicionar",
	actionIcon,
	className,
}: EmptyStateProps) => (
	<section className={cn("bg-muted/20 flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center", className)}>
		<span className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
			<Icon className="text-muted-foreground h-6 w-6" />
		</span>
		<Typography variant="title-md" as="p" className="mt-4">
			{title}
		</Typography>
		<Typography variant="body-sm" className="text-muted-foreground mt-2 max-w-md">
			{message}
		</Typography>
		{onAction && (
			<Button type="button" variant="outline" size="sm" className="mt-5" onClick={onAction}>
				{actionIcon}
				{actionLabel}
			</Button>
		)}
	</section>
);

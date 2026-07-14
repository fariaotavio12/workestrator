import { Button } from "@/components/button";
import { Typography } from "@/components/typography";
import { cn } from "@/app/utils/cn";
import { AlertTriangle, RotateCcw } from "lucide-react";

type ErrorStateProps = {
	/** Título destacado do estado de erro. */
	title?: string;
	/** Mensagem descritiva exibida ao usuário. */
	message?: string;
	/** Callback de "Tentar novamente" (ex.: `refetch` da query). */
	onRetry?: () => void;
	/** Rótulo do botão de retry. */
	retryLabel?: string;
	className?: string;
};

/**
 * Estado de erro genérico para falhas de carregamento de dados, com botão de retry.
 * Use no lugar de uma tabela/lista vazia quando a query falhou.
 */
export const ErrorState = ({
	title = "Algo deu errado",
	message = "Não foi possível carregar os dados.",
	onRetry,
	retryLabel = "Tentar novamente",
	className,
}: ErrorStateProps) => (
	<section className={cn("bg-muted/20 flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center", className)}>
		<span className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
			<AlertTriangle className="text-destructive h-6 w-6" />
		</span>
		<Typography variant="title-md" as="p" className="mt-4">
			{title}
		</Typography>
		<Typography variant="body-sm" className="text-muted-foreground mt-2 max-w-md">
			{message}
		</Typography>
		{onRetry && (
			<Button type="button" variant="outline" size="sm" className="mt-5" onClick={onRetry}>
				<RotateCcw className="h-4 w-4" />
				{retryLabel}
			</Button>
		)}
	</section>
);

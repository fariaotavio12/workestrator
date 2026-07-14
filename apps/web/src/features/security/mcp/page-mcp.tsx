import { Button, Card, CardContent, EmptyState, ErrorState, PageHeader, Skeleton, Textarea, Typography, notify } from "@/components";
import { useExploreMcpPresetQuery } from "@/features/public/explore/api";
import { CheckCircle2, Copy, Plug, RefreshCcw } from "lucide-react";

export const PageMcp = () => {
	const { data, isLoading, isError, refetch } = useExploreMcpPresetQuery();
	const presetJson = data ? JSON.stringify(data, null, 2) : "";

	const copyPreset = async () => {
		await navigator.clipboard.writeText(presetJson);
		notify.success("Preset MCP copiado");
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				eyebrow="Integrações"
				title="MCP do Workestrator"
				description="Preset para expor seus recursos do Workestrator em clientes externos compatíveis com MCP."
				actions={
					<Button type="button" variant="outline" onClick={() => refetch()}>
						<RefreshCcw />
						Atualizar
					</Button>
				}
			/>

			<section className="grid gap-4 px-4 xl:grid-cols-[minmax(0,1fr)_360px]">
				<Card>
					<CardContent className="flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<Plug className="size-4" />
							<Typography variant="title-sm">Preset JSON</Typography>
						</div>
						{isLoading ? (
							<Skeleton className="h-[520px] w-full rounded-lg" />
						) : isError ? (
							<ErrorState
								title="Não foi possível carregar o preset"
								message="Confira sua sessão e tente novamente."
								onRetry={() => refetch()}
							/>
						) : data ? (
							<>
								<Textarea value={presetJson} readOnly rows={22} className="font-mono text-xs" />
								<div className="flex justify-end">
									<Button type="button" onClick={copyPreset}>
										<Copy />
										Copiar preset
									</Button>
								</div>
							</>
						) : (
							<EmptyState icon={Plug} title="Preset vazio" message="Nenhum preset disponível para sua conta." />
						)}
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex flex-col gap-4">
						<Typography variant="title-sm">Tools incluídas</Typography>
						<div className="flex flex-col gap-3">
							{(data?.tools ?? []).map((tool) => (
								<div key={tool.name} className="rounded-lg border p-3">
									<div className="flex items-start gap-2">
										<CheckCircle2 className="mt-0.5 size-4 shrink-0" />
										<div className="min-w-0">
											<Typography variant="body-sm" className="font-medium">
												{tool.name}
											</Typography>
											<Typography variant="caption" className="text-muted-foreground">
												{tool.method} {tool.path}
											</Typography>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

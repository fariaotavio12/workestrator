import { cn } from "@/app/utils/cn";
import { AppSheet, Badge, Button, Input, Typography } from "@/components";
import { Bot, Boxes, ChevronRight, Command, Library, Search, Sparkles, Terminal } from "lucide-react";

export type AssistantWorkspaceResourceKind = "command" | "squad" | "knowledge" | "script" | "skill" | "mcp";

export type AssistantWorkspaceResource = {
	id: string;
	kind: AssistantWorkspaceResourceKind;
	title: string;
	description: string;
	actionLabel: string;
	prompt: string;
};

type ResourcePanelProps = {
	resources: AssistantWorkspaceResource[];
	query: string;
	selectedResourceIds: string[];
	onQueryChange: (value: string) => void;
	onToggleResource: (id: string) => void;
	onUseResource: (resource: AssistantWorkspaceResource) => void;
};

type ResourceSheetProps = ResourcePanelProps & {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type ResourceBrowserProps = ResourcePanelProps & {
	showTitle?: boolean;
};

type ActiveContextPanelProps = {
	selectedResources: AssistantWorkspaceResource[];
	selectedProviderLabel: string;
	workingDir: string | null;
	onClearResource: (id: string) => void;
};

const resourceMeta: Record<AssistantWorkspaceResourceKind, { label: string; icon: typeof Command; className: string }> =
	{
		command: { label: "Comando", icon: Command, className: "bg-primary text-primary-foreground" },
		squad: { label: "Squad", icon: Boxes, className: "bg-muted text-foreground" },
		knowledge: { label: "Conhecimento", icon: Library, className: "bg-muted text-foreground" },
		script: { label: "Ferramenta", icon: Terminal, className: "bg-muted text-foreground" },
		skill: { label: "Skill", icon: Sparkles, className: "bg-muted text-foreground" },
		mcp: { label: "Ferramenta MCP", icon: Terminal, className: "bg-muted text-foreground" },
	};

const AssistantResourceBrowser = ({
	resources,
	query,
	selectedResourceIds,
	onQueryChange,
	onToggleResource,
	onUseResource,
	showTitle = true,
}: ResourceBrowserProps) => (
	<div className="flex min-h-0 flex-1 flex-col">
		<div className="border-b p-4">
			{showTitle && (
				<div className="flex items-center justify-between gap-3">
					<div>
						<Typography variant="title-sm">Recursos</Typography>
						<Typography variant="caption" className="text-muted-foreground">
							Busque comandos, squads e contexto.
						</Typography>
					</div>
					<Badge variant="secondary" className="shrink-0">
						{resources.length}
					</Badge>
				</div>
			)}
			<Input
				value={query}
				onChange={(event) => onQueryChange(event.target.value)}
				placeholder="Buscar recurso"
				inputSize="sm"
				iconLeft={<Search className="size-4" />}
				wrapperClassName={showTitle ? "mt-4" : undefined}
			/>
		</div>

		<div className="min-h-0 flex-1 overflow-y-auto p-2">
			{resources.length === 0 ? (
				<div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
					<Search className="text-muted-foreground size-5" />
					<Typography variant="body-sm" className="text-muted-foreground">
						Nenhum recurso encontrado.
					</Typography>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{resources.map((resource) => {
						const meta = resourceMeta[resource.kind];
						const Icon = meta.icon;
						const selected = selectedResourceIds.includes(resource.id);

						return (
							<div
								key={resource.id}
								role="button"
								tabIndex={0}
								onClick={() => onToggleResource(resource.id)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onToggleResource(resource.id);
									}
								}}
								className={cn(
									"group bg-background hover:border-foreground/20 hover:bg-muted/50 focus-visible:ring-ring/20 cursor-pointer rounded-lg border p-3 text-left transition focus-visible:ring-2 focus-visible:outline-none",
									selected && "border-foreground/30 bg-muted",
								)}
							>
								<div className="flex items-start gap-3">
									<div
										className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", meta.className)}
									>
										<Icon className="size-4" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex min-w-0 items-center gap-2">
											<Typography variant="body-sm" className="truncate font-medium">
												{resource.title}
											</Typography>
											<Badge variant="outline" className="px-2 py-1">
												{meta.label}
											</Badge>
										</div>
										<Typography variant="caption" className="text-muted-foreground mt-1 line-clamp-2">
											{resource.description}
										</Typography>
										<div className="mt-3 flex items-center justify-between gap-2">
											<Typography variant="caption" className="text-muted-foreground">
												{selected ? "No contexto" : "Adicionar contexto"}
											</Typography>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-7 px-2"
												onClick={(event) => {
													event.stopPropagation();
													onUseResource(resource);
												}}
											>
												{resource.actionLabel}
												<ChevronRight className="size-3" />
											</Button>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	</div>
);

export const AssistantResourcePanel = (props: ResourcePanelProps) => (
	<aside className="bg-background hidden w-72 shrink-0 flex-col overflow-hidden rounded-lg border lg:flex">
		<AssistantResourceBrowser {...props} />
	</aside>
);

export const AssistantResourceSheet = ({ open, onOpenChange, resources, ...props }: ResourceSheetProps) => (
	<AppSheet
		open={open}
		onOpenChange={onOpenChange}
		title="Recursos"
		description="Busque comandos, skills, squads, ferramentas e conhecimento para anexar ao contexto."
		headerTrailing={
			<Badge variant="secondary" className="shrink-0">
				{resources.length}
			</Badge>
		}
		contentClassName="sm:max-w-lg"
		bodyClassName="gap-0 p-0"
		showFooter={false}
	>
		<AssistantResourceBrowser resources={resources} showTitle={false} {...props} />
	</AppSheet>
);

export const AssistantActiveContextPanel = ({
	selectedResources,
	selectedProviderLabel,
	workingDir,
	onClearResource,
}: ActiveContextPanelProps) => (
	<aside className="bg-background hidden w-80 shrink-0 flex-col overflow-hidden rounded-lg border xl:flex">
		<div className="border-b p-4">
			<Typography variant="title-sm">Contexto ativo</Typography>
			<Typography variant="caption" className="text-muted-foreground">
				O que o assistente deve considerar nesta conversa.
			</Typography>
		</div>

		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
			<div className="bg-muted/40 rounded-lg border p-3">
				<div className="flex items-center gap-2">
					<Bot className="text-muted-foreground size-4" />
					<Typography variant="body-sm" className="font-medium">
						Modelo
					</Typography>
				</div>
				<Typography variant="caption" className="text-muted-foreground mt-2 block">
					{selectedProviderLabel}
				</Typography>
			</div>

			<div className="bg-muted/40 rounded-lg border p-3">
				<div className="flex items-center gap-2">
					<Terminal className="text-muted-foreground size-4" />
					<Typography variant="body-sm" className="font-medium">
						Workspace local
					</Typography>
				</div>
				<Typography variant="caption" className="text-muted-foreground mt-2 line-clamp-2">
					{workingDir ?? "Nenhum diretório selecionado."}
				</Typography>
			</div>

			<div className="flex flex-col gap-2">
				<Typography variant="body-sm" className="font-medium">
					Recursos anexados
				</Typography>
				{selectedResources.length === 0 ? (
					<div className="rounded-lg border border-dashed p-4 text-center">
						<Typography variant="caption" className="text-muted-foreground">
							Adicione comandos, skills, squads, ferramentas ou conhecimento pela busca.
						</Typography>
					</div>
				) : (
					selectedResources.map((resource) => {
						const meta = resourceMeta[resource.kind];
						const Icon = meta.icon;

						return (
							<div key={resource.id} className="bg-background rounded-lg border p-3">
								<div className="flex items-start gap-2">
									<Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
									<div className="min-w-0 flex-1">
										<Typography variant="body-sm" className="truncate font-medium">
											{resource.title}
										</Typography>
										<Typography variant="caption" className="text-muted-foreground line-clamp-2">
											{resource.description}
										</Typography>
									</div>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="mt-2 h-7 px-2"
									onClick={() => onClearResource(resource.id)}
								>
									Remover
								</Button>
							</div>
						);
					})
				)}
			</div>
		</div>
	</aside>
);

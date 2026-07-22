import { cn } from "@/app/utils/cn";
import {
	Badge,
	Button,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	FieldWrapper,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Typography,
} from "@/components";
import { SCRIPT_KIND_LABEL } from "@/features/security/orchestrator-shared/data/constants";
import type { AgentAuthBinding, Script, Secret } from "@/features/security/orchestrator-shared/types";
import { useSecretsQuery } from "@/features/security/secrets/api";
import { Check, ChevronDown, ExternalLink, Plus, Search, Trash2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { scriptCommandLabel } from "./utils";

type Props = {
	scripts: Script[];
	scriptIds: string[];
	authBindings: AgentAuthBinding[];
	onAuthConnectionChange: (script: Script, connection?: Secret) => void;
	customName: string;
	customCommand: string;
	customArgs: string;
	customDescription: string;
	isCreatingScript: boolean;
	setCustomName: (value: string) => void;
	setCustomCommand: (value: string) => void;
	setCustomArgs: (value: string) => void;
	setCustomDescription: (value: string) => void;
	addScript: (script: Script) => void;
	addCustomScript: () => void;
	removeScript: (id: string) => void;
	/** Abre o wizard completo (HTTP/MCP/conector/arquivo) empilhado sobre o dialog do agent. */
	onCreateScript: () => void;
};

export const AgentToolsTab = ({
	scripts,
	scriptIds,
	authBindings,
	onAuthConnectionChange,
	customName,
	customCommand,
	customArgs,
	customDescription,
	isCreatingScript,
	setCustomName,
	setCustomCommand,
	setCustomArgs,
	setCustomDescription,
	addScript,
	addCustomScript,
	removeScript,
	onCreateScript,
}: Props) => {
	const [query, setQuery] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const { data: secrets = [] } = useSecretsQuery();

	const attachedScripts = useMemo(
		() => scriptIds.map((id) => scripts.find((s) => s.id === id)).filter((s): s is Script => Boolean(s)),
		[scriptIds, scripts],
	);

	const filteredLibrary = useMemo(() => {
		const term = query.trim().toLowerCase();
		if (!term) return scripts;
		return scripts.filter((script) =>
			[script.name, script.description ?? "", scriptCommandLabel(script)].some((field) =>
				field.toLowerCase().includes(term),
			),
		);
	}, [query, scripts]);

	return (
		<div className="flex flex-col gap-6">
			{/* Resultado no topo: o que o agent já tem, sempre visível. */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<Typography variant="title-sm">Ferramentas do agent</Typography>
					<Badge variant="secondary">{attachedScripts.length}</Badge>
				</div>
				{attachedScripts.length === 0 ? (
					<div className="border-border text-muted-foreground rounded-lg border border-dashed p-4 text-center">
						<Typography variant="body-sm">Nenhuma ferramenta ainda — o agent só responde por prompt.</Typography>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						{attachedScripts.map((script) => {
							const connectorConnections = secrets.filter(
								(secret) =>
									(!script.connectorProvider || secret.connectorId === script.connectorProvider) &&
									(!secret.status || secret.status === "connected"),
							);
							const supportsBinding = Boolean(script.connectorProvider || script.authRef);
							const selectedBinding = authBindings.find(
								(binding) => binding.scriptId === script.id && binding.isDefault,
							);
							return (
								<div
									key={script.id}
									className="border-border bg-muted/40 flex items-center gap-3 rounded-lg border p-2"
								>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<Typography variant="title-sm" className="truncate">
												{script.name}
											</Typography>
											<Badge variant="secondary">{SCRIPT_KIND_LABEL[script.kind]}</Badge>
										</div>
										<Typography variant="caption" className="text-muted-foreground truncate">
											{scriptCommandLabel(script)}
										</Typography>
										{supportsBinding && (
											<FieldWrapper
												label={
													script.connectorProvider === "instagram"
														? "Conta para publicação"
														: "Autenticação da ferramenta"
												}
												className="mt-2"
											>
												<Select
													value={selectedBinding?.connectionId ?? "none"}
													onValueChange={(value) =>
														onAuthConnectionChange(
															script,
															connectorConnections.find((connection) => connection.id === value),
														)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Escolha uma autenticação" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="none">Não configurada</SelectItem>
														{connectorConnections.map((connection) => (
															<SelectItem key={connection.id} value={connection.id}>
																{connection.accountDisplayName ?? connection.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FieldWrapper>
										)}
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="text-destructive"
										aria-label={`Remover ${script.name}`}
										onClick={() => removeScript(script.id)}
									>
										<Trash2 />
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</section>

			{/* Biblioteca: buscar e anexar com um clique. */}
			<section className="flex flex-col gap-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<Typography variant="title-sm">Adicionar da biblioteca</Typography>
						<Typography variant="body-sm" className="text-muted-foreground">
							Clique num script para anexar ou remover.
						</Typography>
					</div>
					<Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onCreateScript}>
						<Plus />
						Nova ferramenta
					</Button>
				</div>

				{scripts.length === 0 ? (
					<div className="border-border rounded-lg border border-dashed p-6 text-center">
						<Wrench className="text-muted-foreground mx-auto size-5" />
						<Typography variant="body-sm" className="text-muted-foreground mt-2">
							Sua biblioteca está vazia — crie a primeira ferramenta acima.
						</Typography>
					</div>
				) : (
					<>
						<Input
							inputSize="sm"
							placeholder="Buscar script..."
							iconLeft={<Search className="size-4" />}
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
						{filteredLibrary.length === 0 ? (
							<Typography variant="body-sm" className="text-muted-foreground px-1 py-2">
								Nenhum script encontrado para “{query}”.
							</Typography>
						) : (
							<div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
								{filteredLibrary.map((script) => {
									const added = scriptIds.includes(script.id);
									return (
										<button
											key={script.id}
											type="button"
											onClick={() => (added ? removeScript(script.id) : addScript(script))}
											aria-pressed={added}
											className={cn(
												"flex items-center gap-3 rounded-lg border p-2 text-left transition-colors",
												added ? "border-primary bg-primary/5" : "border-border hover:border-ring hover:bg-muted/50",
											)}
										>
											<span
												className={cn(
													"flex size-5 shrink-0 items-center justify-center rounded-md border",
													added
														? "border-primary bg-primary text-primary-foreground"
														: "border-input-border text-transparent",
												)}
											>
												<Check className="size-3.5" />
											</span>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													<Typography variant="title-sm" className="truncate">
														{script.name}
													</Typography>
													<Badge variant="secondary">{SCRIPT_KIND_LABEL[script.kind]}</Badge>
												</div>
												<Typography variant="caption" className="text-muted-foreground truncate">
													{script.description ?? scriptCommandLabel(script)}
												</Typography>
											</div>
										</button>
									);
								})}
							</div>
						)}
					</>
				)}
			</section>

			{/* Criar comando rápido — recolhido; kinds avançados vão pro editor completo. */}
			<Collapsible open={createOpen} onOpenChange={setCreateOpen}>
				<CollapsibleTrigger className="border-border hover:bg-muted/50 group flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors">
					<div className="flex items-center gap-2">
						<Plus className="text-muted-foreground size-4" />
						<Typography variant="title-sm">Criar comando personalizado</Typography>
					</div>
					<ChevronDown className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
				</CollapsibleTrigger>
				<CollapsibleContent className="flex flex-col gap-3 pt-3">
					<div className="grid gap-3 sm:grid-cols-2">
						<Input
							label="Nome"
							placeholder="Ex.: Rodar testes"
							value={customName}
							onChange={(e) => setCustomName(e.target.value)}
						/>
						<Input
							label="Comando"
							placeholder="Ex.: npm"
							value={customCommand}
							onChange={(e) => setCustomCommand(e.target.value)}
						/>
						<Input
							label="Argumentos"
							placeholder="Separados por espaço"
							value={customArgs}
							onChange={(e) => setCustomArgs(e.target.value)}
						/>
						<Input
							label="Descrição"
							placeholder="Opcional"
							value={customDescription}
							onChange={(e) => setCustomDescription(e.target.value)}
						/>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="self-start"
						disabled={isCreatingScript}
						onClick={addCustomScript}
					>
						<Plus />
						Criar e anexar
					</Button>
					<button
						type="button"
						onClick={onCreateScript}
						className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-xs transition-colors"
					>
						<ExternalLink className="size-3.5" />
						Precisa de HTTP, MCP ou conector? Abrir editor completo
					</button>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
};

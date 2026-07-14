import { Rotas } from "@/app/routing/variables";
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	PageHeader,
	Textarea,
	Typography,
} from "@/components";
import {
	COMMAND_KIND_LABEL,
	commandTemplates,
	type CommandTemplate,
} from "@/features/security/commands/data/command-templates";
import { ArrowUpRight, Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const buildAssistantUrl = (prompt: string) =>
	`${Rotas.protegidas.orchestrator.assistant}?prompt=${encodeURIComponent(prompt)}`;

export const PageCommands = () => {
	const navigate = useNavigate();
	const [query, setQuery] = useState("");
	const [selectedCommand, setSelectedCommand] = useState<CommandTemplate | null>(null);

	const filteredCommands = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return commandTemplates;

		return commandTemplates.filter((command) =>
			`${command.title} ${command.description} ${command.tags.join(" ")} ${command.kind}`
				.toLowerCase()
				.includes(normalizedQuery),
		);
	}, [query]);

	const runCommand = (command: CommandTemplate) => {
		navigate(buildAssistantUrl(command.prompt));
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				eyebrow="Workspace"
				title="Comandos"
				description="Templates reutilizaveis para iniciar tarefas no assistente com contexto e intencao claros."
				actions={
					<Button type="button" variant="outline" onClick={() => setSelectedCommand(commandTemplates[0])}>
						<Plus />
						Novo comando
					</Button>
				}
			/>

			<section className="flex flex-col gap-4 px-4">
				<div className="bg-background flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
					<div className="min-w-0">
						<Typography variant="title-sm">Biblioteca inicial</Typography>
						<Typography variant="body-sm" className="text-muted-foreground">
							Use estes comandos como base enquanto o backend de templates compartilhaveis entra no plano.
						</Typography>
					</div>
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Buscar comandos"
						inputSize="sm"
						iconLeft={<Search className="size-4" />}
						wrapperClassName="md:w-80"
					/>
				</div>

				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{filteredCommands.map((command) => {
						const Icon = command.icon;

						return (
							<article key={command.id} className="bg-card flex min-h-56 flex-col rounded-lg border p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border">
										<Icon className="size-5" />
									</div>
									<Badge variant="secondary">{COMMAND_KIND_LABEL[command.kind]}</Badge>
								</div>

								<div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
									<Typography variant="title-sm">{command.title}</Typography>
									<Typography variant="body-sm" className="text-muted-foreground line-clamp-3">
										{command.description}
									</Typography>
								</div>

								<div className="mt-4 flex flex-wrap gap-2">
									{command.tags.map((tag) => (
										<Badge key={tag} variant="outline" className="px-2 py-1">
											{tag}
										</Badge>
									))}
								</div>

								<div className="mt-4 flex gap-2">
									<Button type="button" className="flex-1" onClick={() => runCommand(command)}>
										<Sparkles />
										Usar
									</Button>
									<Button type="button" variant="outline" onClick={() => setSelectedCommand(command)}>
										<ArrowUpRight />
										Ver
									</Button>
								</div>
							</article>
						);
					})}
				</div>
			</section>

			<Dialog open={Boolean(selectedCommand)} onOpenChange={(open) => !open && setSelectedCommand(null)}>
				<DialogContent size="lg">
					<DialogHeader>
						<DialogTitle>{selectedCommand?.title ?? "Comando"}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<Typography variant="body-sm" className="text-muted-foreground">
							{selectedCommand?.description}
						</Typography>
						<Textarea
							label="Prompt"
							value={selectedCommand?.prompt ?? ""}
							readOnly
							rows={6}
							className="font-mono text-sm"
						/>
						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={() => setSelectedCommand(null)}>
								Fechar
							</Button>
							<Button
								type="button"
								onClick={() => {
									if (selectedCommand) runCommand(selectedCommand);
								}}
							>
								<Sparkles />
								Usar no assistente
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

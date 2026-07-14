import { Activity, Brain, FileDiff, Globe, TerminalSquare, Wrench, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/app/utils/cn";
import { DiffViewer } from "@/components/diff-viewer/diff-viewer";
import { Input } from "@/components/input";
import { Terminal } from "@/components/terminal/terminal";
import { Typography } from "@/components/typography";

export type ArtifactActivityItem = {
	id: string;
	kind: "thinking" | "step" | "tool" | "output";
	label: string;
	detail?: string;
};

export type ArtifactPanelProps = {
	activity: ArtifactActivityItem[];
	diff?: string;
	terminal?: string;
	/** Mostra a aba de preview web (iframe) — útil quando o agente sobe um projeto local. */
	enablePreview?: boolean;
	onClose?: () => void;
	className?: string;
};

type TabId = "activity" | "diff" | "terminal" | "preview";

const activityIcon = { thinking: Brain, step: Activity, tool: Wrench, output: TerminalSquare };

/**
 * Painel lateral de atividade/artefatos de um run: timeline do que a IA faz, diff das mudanças,
 * saída de terminal e um preview web. As abas aparecem conforme há conteúdo.
 */
export const ArtifactPanel = ({
	activity,
	diff,
	terminal,
	enablePreview = true,
	onClose,
	className,
}: ArtifactPanelProps) => {
	const tabs = useMemo(() => {
		const list: { id: TabId; label: string; icon: typeof Activity }[] = [];
		if (activity.length > 0) list.push({ id: "activity", label: "Atividade", icon: Activity });
		if (diff) list.push({ id: "diff", label: "Diff", icon: FileDiff });
		if (terminal) list.push({ id: "terminal", label: "Terminal", icon: TerminalSquare });
		if (enablePreview) list.push({ id: "preview", label: "Preview", icon: Globe });
		return list;
	}, [activity.length, diff, terminal, enablePreview]);

	const [tab, setTab] = useState<TabId>(tabs[0]?.id ?? "activity");
	const [previewUrl, setPreviewUrl] = useState("");
	const [previewSrc, setPreviewSrc] = useState("");

	const activeTab = tabs.some((t) => t.id === tab) ? tab : (tabs[0]?.id ?? "activity");

	return (
		<div className={cn("border-border bg-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border", className)}>
			<div className="border-border flex items-start gap-3 border-b px-4 py-3">
				<div className="min-w-0 flex-1">
					<Typography variant="title-sm">Painel de execução</Typography>
					<Typography variant="caption" className="text-muted-foreground">
						Atividade e artefatos gerados pelo assistente.
					</Typography>
				</div>
				{onClose && (
					<button
						type="button"
						aria-label="Fechar painel"
						onClick={onClose}
						className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors"
					>
						<X className="size-4" />
					</button>
				)}
			</div>

			<div className="border-border flex items-center gap-1 border-b px-3 py-2">
				{tabs.map((t) => {
					const Icon = t.icon;
					return (
						<button
							key={t.id}
							type="button"
							onClick={() => setTab(t.id)}
							className={cn(
								"flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
								activeTab === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
							)}
						>
							<Icon className="size-3.5" />
							{t.label}
						</button>
					);
				})}
			</div>

			<div className="min-h-0 flex-1 overflow-auto p-4">
				{activeTab === "activity" && (
					<div className="flex flex-col gap-3">
						{activity.length === 0 ? (
							<Typography variant="caption" className="text-muted-foreground">
								Sem atividade nesta rodada.
							</Typography>
						) : (
							activity.map((item) => {
								const Icon = activityIcon[item.kind];
								return (
									<div key={item.id} className="border-border/70 bg-background/50 flex gap-2 rounded-lg border px-3 py-2">
										<Icon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
										<div className="min-w-0">
											<Typography variant="caption" className="font-medium">
												{item.label}
											</Typography>
											{item.detail && (
												<Typography variant="caption" as="p" className="text-muted-foreground break-words">
													{item.detail}
												</Typography>
											)}
										</div>
									</div>
								);
							})
						)}
					</div>
				)}

				{activeTab === "diff" && diff && <DiffViewer patch={diff} />}

				{activeTab === "terminal" && <Terminal content={terminal ?? ""} className="h-full" />}

				{activeTab === "preview" && (
					<div className="flex h-full flex-col gap-2">
						<form
							className="flex gap-2"
							onSubmit={(event) => {
								event.preventDefault();
								setPreviewSrc(previewUrl.trim());
							}}
						>
							<Input
								wrapperClassName="flex-1"
								placeholder="http://localhost:3000"
								value={previewUrl}
								onChange={(event) => setPreviewUrl(event.target.value)}
							/>
						</form>
						{previewSrc ? (
							<iframe title="Preview" src={previewSrc} className="border-border min-h-0 flex-1 rounded-lg border" />
						) : (
							<Typography variant="caption" className="text-muted-foreground">
								Informe uma URL local para pré-visualizar (ex.: um projeto web que o agente subiu).
							</Typography>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

import { AppSheet, Badge, Typography } from "@/components";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { useRunsQuery } from "@/features/security/executions/api";
import { useRunDialogStore } from "@/features/security/orchestrator-shared/model/use-run-dialog-store";
import { ChevronRight, Paperclip } from "lucide-react";
import { useState } from "react";
import { renderSquadIcon } from "../icon-picker/render-squad-icon";
import { RunDetailSheet } from "../run-detail-sheet";
import { formatRunDuration, runStatusLabel, runStatusVariant } from "../run-detail-sheet/run-meta";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	squad: Squad;
	/** Run a abrir de cara — usado pelo deep-link de Execuções. */
	initialRunId?: string;
};

export const SquadHistoryDialog = ({ open, onOpenChange, squad, initialRunId }: Props) => {
	if (!open) return null;
	return <SquadHistoryDialogContent onOpenChange={onOpenChange} squad={squad} initialRunId={initialRunId} />;
};

const SquadHistoryDialogContent = ({ onOpenChange, squad, initialRunId }: Omit<Props, "open">) => {
	const { data: runs = [], isLoading } = useRunsQuery(squad.id);
	const squadRuns = [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
	const isDirectRunOpen = Boolean(initialRunId);

	// Guarda só o id (não o objeto): o deep-link abre assim que a query carrega e o detalhe sempre reflete
	// o run mais recente do cache.
	const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRunId ?? null);
	const selectedRun = selectedRunId ? (squadRuns.find((r) => r.id === selectedRunId) ?? null) : null;

	/** Continua/refaz o run e joga o usuário pro `RunDialog` (mesmo mecanismo global de `notifyOs`). */
	const openRunDialogFor = () => {
		onOpenChange(false);
		useRunDialogStore.getState().openRunDialog(squad.id);
	};

	if (isDirectRunOpen) {
		if (selectedRun) {
			return (
				<RunDetailSheet open onOpenChange={onOpenChange} squad={squad} run={selectedRun} onRan={openRunDialogFor} />
			);
		}

		return (
			<AppSheet
				open
				onOpenChange={onOpenChange}
				title="Run"
				description={isLoading ? "Carregando detalhes da execução." : "Não foi possível encontrar este run."}
				contentClassName="sm:max-w-3xl"
				headerLeading={
					<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xl">
						{renderSquadIcon(squad.icon, "size-5")}
					</div>
				}
			>
				<Typography variant="body-sm" className="text-muted-foreground">
					{isLoading ? "Buscando o histórico do squad..." : "Este run pode ter sido removido ou ainda não carregou."}
				</Typography>
			</AppSheet>
		);
	}

	return (
		<>
			<AppSheet
				open
				onOpenChange={onOpenChange}
				title={`Histórico: ${squad.name}`}
				description={`${squadRuns.length} execuç${squadRuns.length === 1 ? "ão" : "ões"} registrada${squadRuns.length === 1 ? "" : "s"}.`}
				contentClassName="sm:max-w-3xl"
				headerLeading={
					<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xl">
						{renderSquadIcon(squad.icon, "size-5")}
					</div>
				}
			>
				{squadRuns.length === 0 ? (
					<Typography variant="body-sm" className="text-muted-foreground">
						Nenhuma execução ainda.
					</Typography>
				) : (
					<div className="flex flex-col gap-2">
						{squadRuns.map((run) => {
							const fileCount = run.files?.length ?? 0;
							return (
								<button
									key={run.id}
									type="button"
									onClick={() => setSelectedRunId(run.id)}
									className="hover:bg-muted/60 flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors"
								>
									<Badge variant={runStatusVariant[run.status]}>{runStatusLabel[run.status]}</Badge>
									<Typography variant="body-sm" className="min-w-0 flex-1 truncate">
										{run.input}
									</Typography>
									{fileCount > 0 && (
										<span className="text-muted-foreground flex shrink-0 items-center gap-1">
											<Paperclip className="size-3.5" />
											<Typography variant="caption" as="span">
												{fileCount}
											</Typography>
										</span>
									)}
									<Typography variant="caption" className="text-muted-foreground shrink-0">
										{formatRunDuration(run.startedAt, run.endedAt)}
									</Typography>
									<ChevronRight className="text-muted-foreground size-4 shrink-0" />
								</button>
							);
						})}
					</div>
				)}
			</AppSheet>

			{selectedRun && (
				<RunDetailSheet
					open
					onOpenChange={(next) => !next && setSelectedRunId(null)}
					squad={squad}
					run={selectedRun}
					onRan={openRunDialogFor}
				/>
			)}
		</>
	);
};

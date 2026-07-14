import { Badge, Typography } from "@/components";
import { renderSquadIcon } from "@/components/orchestrator/icon-picker/render-squad-icon";
import { useOrchestratorRuntimeStore } from "@/features/security/orchestrator-shared/model";
import type { Trigger } from "@/features/security/orchestrator-shared/types";
import type { SquadSummary } from "@/features/security/squads/api";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

const triggerLabel = (trigger: Trigger): string => {
	if (trigger.type === "manual") return "Manual";
	if (trigger.type === "schedule") return `Agendado - ${trigger.every}${trigger.enabled ? "" : " (off)"}`;

	return "Encadeado";
};

const statusLabel: Record<string, string> = {
	idle: "Ocioso",
	running: "Rodando",
	paused: "Pausado",
	completed: "Concluido",
	checkpoint: "Checkpoint",
	awaiting_input: "Aguardando resposta",
	aborted: "Abortado",
};

const SquadStatusBadge = ({ squadId }: { squadId: string }) => {
	const status = useOrchestratorRuntimeStore((s) => s.runtimes[squadId]?.status ?? "idle");
	return <Badge variant="secondary">{statusLabel[status]}</Badge>;
};

export const useSquadTableColumns = () =>
	useMemo<ColumnDef<SquadSummary>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Squad",
				cell: ({ row }) => (
					<div className="flex min-w-0 items-center gap-3">
						<div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg text-xl" aria-hidden>
							{renderSquadIcon(row.original.icon, "size-4")}
						</div>
						<div className="flex min-w-0 flex-col gap-0.5">
							<Typography variant="body-sm" className="truncate font-medium">
								{row.original.name}
							</Typography>
							<Typography variant="caption" className="text-muted-foreground truncate">
								{row.original.description}
							</Typography>
						</div>
					</div>
				),
				meta: {
					mobileHeader: true,
					mobileOrder: 1,
				},
			},
			{
				accessorKey: "trigger",
				header: "Gatilho",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground">
						{triggerLabel(row.original.trigger)}
					</Typography>
				),
				meta: {
					mobileLabel: "Gatilho",
					mobileOrder: 2,
				},
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => <SquadStatusBadge squadId={row.original.id} />,
				meta: {
					mobileStatus: true,
					mobileOrder: 3,
				},
			},
		],
		[],
	);

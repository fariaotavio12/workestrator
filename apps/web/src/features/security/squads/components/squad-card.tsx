import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { renderSquadIcon } from "@/components/orchestrator/icon-picker/render-squad-icon";
import { Typography } from "@/components/typography";
import { Copy, Pause, Trash2, Users } from "lucide-react";
import type { Squad, Trigger } from "@/features/security/orchestrator-shared/types";

const EVERY_LABEL: Record<"5m" | "1h" | "daily", string> = { "5m": "5 min", "1h": "1 hora", daily: "diário" };

const triggerLabel = (t: Trigger): string => {
	if (t.type === "manual") return "Manual";
	if (t.type === "schedule") return `Agendado · a cada ${EVERY_LABEL[t.every]}`;
	return "Encadeado";
};

type Props = {
	squad: Squad;
	onOpen?: (squad: Squad) => void;
	onDuplicate?: (squad: Squad) => void;
	onDelete?: (squad: Squad) => void;
};

export const SquadCard = ({ squad, onOpen, onDuplicate, onDelete }: Props) => {
	const occupied = squad.seats.filter((s) => s.agentId).length;

	return (
		<Card className="hover:border-ring flex flex-col transition-colors">
			<CardContent className="flex flex-1 flex-col gap-4 p-4">
				<button type="button" onClick={() => onOpen?.(squad)} className="flex flex-1 flex-col gap-4 text-left">
					<div className="flex items-start justify-between gap-3">
						<div className="flex items-center gap-3">
							<span className="bg-muted flex size-11 items-center justify-center rounded-xl text-2xl">
								{renderSquadIcon(squad.icon, "size-5")}
							</span>
							<div className="flex min-w-0 flex-col">
								<Typography variant="title-sm" className="truncate">
									{squad.name}
								</Typography>
								<Typography variant="caption" className="text-muted-foreground">
									{triggerLabel(squad.trigger)}
								</Typography>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							{squad.trigger.type === "schedule" && !squad.trigger.enabled && (
								<Badge variant="outline" className="text-muted-foreground gap-1">
									<Pause className="size-3" />
									Pausado
								</Badge>
							)}
							<Badge variant="secondary">{squad.runtime.status}</Badge>
						</div>
					</div>

					<Typography variant="body-sm" className="text-muted-foreground line-clamp-2">
						{squad.description || "Sem descrição."}
					</Typography>

					<div className="text-muted-foreground mt-auto flex items-center gap-1.5">
						<Users className="size-4" />
						<Typography variant="caption" as="span">
							{occupied}/{squad.seats.length} cadeiras ocupadas
						</Typography>
					</div>
				</button>

				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="flex-1" onClick={() => onOpen?.(squad)}>
						Abrir escritório
					</Button>
					{onDuplicate && (
						<Button variant="outline" size="icon-sm" aria-label="Duplicar" onClick={() => onDuplicate(squad)}>
							<Copy />
						</Button>
					)}
					{onDelete && (
						<Button variant="error" size="icon-sm" aria-label="Excluir" onClick={() => onDelete(squad)}>
							<Trash2 />
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

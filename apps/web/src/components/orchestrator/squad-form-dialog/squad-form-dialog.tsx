import { cn } from "@/app/utils/cn";
import {
	AppSheet,
	Button,
	FieldWrapper,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
	Textarea,
	notify,
} from "@/components";
import { IconPicker } from "@/components/orchestrator/icon-picker/icon-picker";
import { renderSquadIcon } from "@/components/orchestrator/icon-picker/render-squad-icon";
import { Boxes } from "lucide-react";
import { useState } from "react";
import type { Trigger } from "@/features/security/orchestrator-shared/types";
import { useUpdateSquad } from "@/features/security/squad-detail/api";
import { useCreateSquad, useSquadsQuery } from "@/features/security/squads/api";
import type { SquadSummary } from "@/features/security/squads/api";

const DEFAULT_ICON = "lucide:boxes";

type TriggerType = Trigger["type"];

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Quando presente, edita; senão, cria. */
	squad?: SquadSummary;
	onSaved?: (squad: SquadSummary) => void;
};

export const SquadFormDialog = ({ open, onOpenChange, squad, onSaved }: Props) => {
	if (!open) return null;

	return <SquadFormDialogContent open={open} onOpenChange={onOpenChange} squad={squad} onSaved={onSaved} />;
};

const SquadFormDialogContent = ({ open, onOpenChange, squad, onSaved }: Props) => {
	const { data: squads = [] } = useSquadsQuery();
	const createSquad = useCreateSquad();
	const updateSquad = useUpdateSquad(squad?.id ?? "");
	const isEdit = Boolean(squad);

	const initialTrigger = squad?.trigger ?? { type: "manual" as const };
	const [name, setName] = useState(squad?.name ?? "");
	const [description, setDescription] = useState(squad?.description ?? "");
	const [icon, setIcon] = useState(squad?.icon ?? DEFAULT_ICON);
	const [triggerType, setTriggerType] = useState<TriggerType>(initialTrigger.type);
	const [every, setEvery] = useState<"5m" | "1h" | "daily">(
		initialTrigger.type === "schedule" ? initialTrigger.every : "1h",
	);
	const [enabled, setEnabled] = useState(initialTrigger.type === "schedule" ? initialTrigger.enabled : false);
	const [onCompleteSquadId, setOnCompleteSquadId] = useState(
		initialTrigger.type === "onComplete" ? initialTrigger.squadId : "",
	);
	const [error, setError] = useState<string | undefined>(undefined);

	const otherSquads = squads.filter((s) => s.id !== squad?.id);

	const buildTrigger = (): Trigger => {
		if (triggerType === "schedule") return { type: "schedule", every, enabled };
		if (triggerType === "onComplete") return { type: "onComplete", squadId: onCompleteSquadId };
		return { type: "manual" };
	};

	const submit = async () => {
		if (!name.trim()) {
			setError("Nome é obrigatório");
			return;
		}
		if (triggerType === "onComplete" && !onCompleteSquadId) {
			setError("Escolha o squad que dispara este.");
			return;
		}
		const draft = { name: name.trim(), description: description.trim(), icon, trigger: buildTrigger() };
		if (squad) {
			await updateSquad.mutateAsync(draft);
			onSaved?.({ ...squad, ...draft });
			notify.success("Squad atualizado");
		} else {
			const created = await createSquad.mutateAsync(draft);
			onSaved?.(created);
			notify.success("Squad criado");
		}
		onOpenChange(false);
	};

	return (
		<AppSheet
			open={open}
			onOpenChange={onOpenChange}
			title={isEdit ? "Editar squad" : "Novo squad"}
			description="Nome, identidade e como o squad é disparado."
			headerLeading={
				<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
					<Boxes className="size-5" />
				</div>
			}
			footer={
				<>
					<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button size="sm" onClick={submit}>
						{isEdit ? "Salvar" : "Criar squad"}
					</Button>
				</>
			}
		>
			<Input
				label="Nome"
				placeholder="Ex.: Conteúdo Instagram"
				value={name}
				onChange={(e) => setName(e.target.value)}
				error={error && !name.trim() ? error : undefined}
			/>

			<Textarea
				label="Descrição"
				placeholder="O que este squad faz..."
				rows={3}
				value={description}
				onChange={(e) => setDescription(e.target.value)}
			/>

			<FieldWrapper label="Ícone">
				<IconPicker value={icon} onSelect={setIcon} onClear={() => setIcon(DEFAULT_ICON)}>
					<button
						type="button"
						className={cn(
							"border-border hover:border-primary flex size-10 items-center justify-center rounded-lg border text-xl transition-colors",
						)}
					>
						{renderSquadIcon(icon, "size-5")}
					</button>
				</IconPicker>
			</FieldWrapper>

			<FieldWrapper label="Gatilho de execução" description="Como o squad começa a rodar.">
				<Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="manual">Manual (botão Rodar)</SelectItem>
						<SelectItem value="schedule">Agendado (timer)</SelectItem>
						<SelectItem value="onComplete">Quando outro squad terminar</SelectItem>
					</SelectContent>
				</Select>
			</FieldWrapper>

			{triggerType === "schedule" && (
				<>
					<FieldWrapper label="A cada">
						<Select value={every} onValueChange={(v) => setEvery(v as typeof every)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="5m">5 minutos</SelectItem>
								<SelectItem value="1h">1 hora</SelectItem>
								<SelectItem value="daily">Diário</SelectItem>
							</SelectContent>
						</Select>
					</FieldWrapper>

					<Switch
						id="schedule-enabled"
						label={enabled ? "Agendamento ativo" : "Agendamento pausado"}
						description={
							enabled
								? "O squad roda sozinho no intervalo definido acima."
								: "Pausado: o agendamento continua salvo, mas não dispara sozinho até você reativar."
						}
						checked={enabled}
						onCheckedChange={setEnabled}
					/>

					<p className="text-muted-foreground text-xs">
						No modo cliente o timer só roda com a aba aberta. Agendamento durável precisa de backend.
					</p>
				</>
			)}

			{triggerType === "onComplete" && (
				<FieldWrapper label="Disparar quando terminar" error={error && !onCompleteSquadId ? error : undefined}>
					<Select value={onCompleteSquadId} onValueChange={setOnCompleteSquadId}>
						<SelectTrigger>
							<SelectValue placeholder="Selecione um squad" />
						</SelectTrigger>
						<SelectContent>
							{otherSquads.map((s) => (
								<SelectItem key={s.id} value={s.id}>
									<span className="flex items-center gap-2">
										{renderSquadIcon(s.icon, "size-3.5")}
										{s.name}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldWrapper>
			)}
		</AppSheet>
	);
};

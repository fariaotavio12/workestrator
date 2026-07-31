import { cn } from "@/app/utils/cn";
import { FieldWrapper, Input, ModelCombobox, MultiCombobox, Switch, Typography } from "@/components";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { ACCENT_COLORS } from "@/features/security/orchestrator-shared/data/constants";
import type {
	CharacterName,
	ModelProvider,
	NotificationChannel,
	SquadApprover,
} from "@/features/security/orchestrator-shared/types";
import { Palette, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { CharacterPicker } from "../character-picker";
import type { AgentFormValues } from "./schema";

type Props = {
	providers: ModelProvider[];
	providerId: string;
	model: string;
	character: CharacterName;
	usedCharacters?: ReadonlySet<CharacterName>;
	accentColor: string;
	requiresCheckpoint: boolean;
	requiresCheckpointAfter: boolean;
	canExecute: boolean;
	notifyEnabled: boolean;
	notifyChannelId: string | null;
	notificationChannels: NotificationChannel[];
	approvers: SquadApprover[];
	approverUserIds: string[];
	ownerCanDecide: boolean;
	errors: FieldErrors<AgentFormValues>;
	register: UseFormRegister<AgentFormValues>;
	setValue: UseFormSetValue<AgentFormValues>;
	setRequiresCheckpoint: (value: boolean) => void;
	setRequiresCheckpointAfter: (value: boolean) => void;
	setCanExecute: (value: boolean) => void;
	setNotifyEnabled: (value: boolean) => void;
	setNotifyChannelId: (value: string | null) => void;
	setApproverUserIds: (ids: string[]) => void;
	setOwnerCanDecide: (value: boolean) => void;
};

const NONE_CHANNEL = "__none__";

export const AgentProfileTab = ({
	providers,
	providerId,
	model,
	character,
	usedCharacters,
	accentColor,
	requiresCheckpoint,
	requiresCheckpointAfter,
	canExecute,
	notifyEnabled,
	notifyChannelId,
	notificationChannels,
	approvers,
	approverUserIds,
	ownerCanDecide,
	errors,
	register,
	setValue,
	setRequiresCheckpoint,
	setRequiresCheckpointAfter,
	setCanExecute,
	setNotifyEnabled,
	setNotifyChannelId,
	setApproverUserIds,
	setOwnerCanDecide,
}: Props) => (
	<div className="flex flex-col gap-6">
		<section className="flex flex-col gap-4">
			<SectionHeading icon={<UserRound className="size-4" />}>Identidade</SectionHeading>

			<div className="grid gap-4 sm:grid-cols-2">
				<Input
					wrapperClassName="w-full"
					label="Nome"
					placeholder="Ex.: Camila Copy"
					error={errors.name?.message}
					{...register("name")}
				/>
				<Input
					wrapperClassName="w-full"
					label="Papel"
					placeholder="Ex.: Redatora"
					error={errors.role?.message}
					{...register("role")}
				/>
			</div>

			<ModelCombobox
				label="Modelo"
				error={errors.providerId?.message ?? errors.model?.message}
				description="Agrupado pelo provider cadastrado. Cadastre mais em Modelos."
				providers={providers}
				value={providerId && model ? { providerId, model } : undefined}
				onChange={(next) => {
					setValue("providerId", next.providerId, { shouldValidate: true });
					setValue("model", next.model, { shouldValidate: true });
				}}
			/>
		</section>

		<section className="flex flex-col gap-3">
			<SectionHeading icon={<ShieldCheck className="size-4" />}>Execução</SectionHeading>

			<div className="border-border rounded-lg border">
				<SwitchRow
					label="Permitir acesso ao workspace"
					description="Libera leitura e gravação de arquivos para este agent, mesmo sem scripts anexados."
					checked={canExecute}
					onChange={setCanExecute}
				/>
			</div>
		</section>

		<section className="flex flex-col gap-3">
			<SectionHeading icon={<ShieldCheck className="size-4" />}>Aprovações</SectionHeading>

			<div className="border-border divide-border divide-y rounded-lg border">
				<SwitchRow
					label="Requer aprovação antes de agir"
					description="Pausa para você aprovar antes deste agent ser acionado."
					checked={requiresCheckpoint}
					onChange={setRequiresCheckpoint}
				/>
				<SwitchRow
					label="Requer aprovação antes de seguir"
					description="Pausa após a resposta, antes do coordenador seguir adiante."
					checked={requiresCheckpointAfter}
					onChange={setRequiresCheckpointAfter}
				/>
			</div>

			{(requiresCheckpoint || requiresCheckpointAfter) && (
				<>
					<div className="border-border divide-border divide-y rounded-lg border">
						<SwitchRow
							label="Avisar externamente (n8n)"
							description="Dispara um webhook quando o checkpoint abre — a decisão continua sempre dentro do Workestrator."
							checked={notifyEnabled}
							onChange={setNotifyEnabled}
						/>
						{notifyEnabled && (
							<div className="p-3">
								<FieldWrapper label="Conexão de notificação">
									<Select
										value={notifyChannelId ?? NONE_CHANNEL}
										onValueChange={(value) => setNotifyChannelId(value === NONE_CHANNEL ? null : value)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione uma conexão" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={NONE_CHANNEL}>Nenhuma</SelectItem>
											{notificationChannels.map((channel) => (
												<SelectItem key={channel.id} value={channel.id}>
													{channel.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FieldWrapper>
							</div>
						)}
					</div>

					<div className="border-border divide-border flex flex-col divide-y rounded-lg border">
						<div className="p-3">
							<MultiCombobox
								label="Quem, além de você, pode decidir"
								description="Aprovadores do pool do squad atribuídos aos checkpoints deste agent."
								options={approvers}
								getOptionKey={(approver) => approver.approverUserId}
								getOptionLabel={(approver) => approver.displayName || approver.email}
								values={approvers.filter((approver) => approverUserIds.includes(approver.approverUserId))}
								onChange={(next) => setApproverUserIds(next.map((approver) => approver.approverUserId))}
								placeholder={approvers.length === 0 ? "Nenhum aprovador no pool do squad" : "Selecione aprovadores"}
								disabled={approvers.length === 0}
							/>
						</div>
						<SwitchRow
							label="Eu também posso decidir"
							description={
								approverUserIds.length === 0
									? "Desabilitado: atribua ao menos um aprovador para poder se retirar da decisão."
									: "Desligar retira você da decisão deste agent — só quem está na lista acima decide."
							}
							checked={ownerCanDecide}
							onChange={setOwnerCanDecide}
							disabled={approverUserIds.length === 0}
						/>
					</div>
				</>
			)}
		</section>

		<section className="flex flex-col gap-4">
			<SectionHeading icon={<Palette className="size-4" />}>Aparência</SectionHeading>

			<FieldWrapper
				label="Personagem"
				description="O bonequinho que representa o agent no escritório. Os marcados já pertencem a outro agent do squad."
			>
				<CharacterPicker
					value={character}
					usedNames={usedCharacters}
					onChange={(nameValue) => setValue("character", nameValue, { shouldValidate: true })}
				/>
			</FieldWrapper>

			<FieldWrapper label="Cor de destaque">
				<div className="flex flex-wrap gap-2">
					{ACCENT_COLORS.map((color) => (
						<button
							type="button"
							key={color}
							aria-label={color}
							aria-pressed={accentColor === color}
							onClick={() => setValue("accentColor", color, { shouldValidate: true })}
							className={cn(
								"size-8 rounded-full border-2 transition-transform hover:scale-110",
								accentColor === color ? "border-foreground" : "border-transparent",
							)}
							style={{ backgroundColor: color }}
						/>
					))}
				</div>
			</FieldWrapper>
		</section>
	</div>
);

const SectionHeading = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
	<div className="text-foreground flex items-center gap-2">
		<span className="text-muted-foreground">{icon}</span>
		<Typography variant="title-sm">{children}</Typography>
	</div>
);

type SwitchRowProps = {
	label: string;
	description: string;
	checked: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
};

const SwitchRow = ({ label, description, checked, onChange, disabled }: SwitchRowProps) => (
	<div className="flex items-center justify-between gap-4 p-3">
		<div className="min-w-0">
			<Typography variant="body-sm" className="font-medium">
				{label}
			</Typography>
			<Typography variant="caption" className="text-muted-foreground">
				{description}
			</Typography>
		</div>
		<Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
	</div>
);

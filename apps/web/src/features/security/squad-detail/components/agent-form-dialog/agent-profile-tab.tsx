import { cn } from "@/app/utils/cn";
import { FieldWrapper, Input, ModelCombobox, Switch, Typography } from "@/components";
import { ACCENT_COLORS } from "@/features/security/orchestrator-shared/data/constants";
import type { CharacterName, ModelProvider } from "@/features/security/orchestrator-shared/types";
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
	accentColor: string;
	requiresCheckpoint: boolean;
	requiresCheckpointAfter: boolean;
	errors: FieldErrors<AgentFormValues>;
	register: UseFormRegister<AgentFormValues>;
	setValue: UseFormSetValue<AgentFormValues>;
	setRequiresCheckpoint: (value: boolean) => void;
	setRequiresCheckpointAfter: (value: boolean) => void;
};

export const AgentProfileTab = ({
	providers,
	providerId,
	model,
	character,
	accentColor,
	requiresCheckpoint,
	requiresCheckpointAfter,
	errors,
	register,
	setValue,
	setRequiresCheckpoint,
	setRequiresCheckpointAfter,
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
		</section>

		<section className="flex flex-col gap-4">
			<SectionHeading icon={<Palette className="size-4" />}>Aparência</SectionHeading>

			<FieldWrapper label="Personagem" description="O bonequinho que representa o agent no escritório.">
				<CharacterPicker
					value={character}
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
};

const SwitchRow = ({ label, description, checked, onChange }: SwitchRowProps) => (
	<div className="flex items-center justify-between gap-4 p-3">
		<div className="min-w-0">
			<Typography variant="body-sm" className="font-medium">
				{label}
			</Typography>
			<Typography variant="caption" className="text-muted-foreground">
				{description}
			</Typography>
		</div>
		<Switch checked={checked} onCheckedChange={onChange} />
	</div>
);

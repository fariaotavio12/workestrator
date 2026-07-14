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
	Typography,
	notify,
} from "@/components";
import { useCreateProvider, useUpdateProvider } from "@/features/security/models/api";
import {
	AgentCallError,
	callAgentStep,
	fetchProviderModels,
} from "@/features/security/orchestrator-shared/runtime/model-client";
import type { ModelProvider, ProviderKind } from "@/features/security/orchestrator-shared/types";
import { useSecretsQuery } from "@/features/security/secrets/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Cpu, Download, LoaderCircle, Plug, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
/** Kinds com endpoint HTTP OpenAI-compat conhecido — dá pra buscar `/models` em vez de digitar de cabeça. */
const DISCOVERABLE_KINDS: ProviderKind[] = ["openai", "openai-compat"];

const KIND_LABEL: Record<ProviderKind, string> = {
	"claude-cli": "Claude Code (CLI local)",
	"codex-cli": "Codex (CLI local)",
	"gpt-cli": "GPT CLI (CLI local)",
	"anthropic-api": "Anthropic API",
	openai: "OpenAI",
	"openai-compat": "Compatível com OpenAI (endpoint custom)",
};

/** CLIs locais já autenticados na máquina — sem API key, sem base URL. */
const LOCAL_CLI_KINDS: ProviderKind[] = ["claude-cli", "codex-cli", "gpt-cli"];

/**
 * CLIs locais não expõem um endpoint HTTP `/models` pra descobrir os modelos (isso só existe pros
 * kinds OpenAI-compat). Como equivalente, oferecemos uma lista conhecida pra preencher de uma vez —
 * o usuário edita/remove o que não quiser. Confira os ids contra a versão instalada do CLI.
 */
const SUGGESTED_CLI_MODELS: Partial<Record<ProviderKind, { value: string; label: string }[]>> = {
	"claude-cli": [
		{ value: "claude-opus-4-8", label: "Claude Opus 4.8" },
		{ value: "claude-sonnet-5", label: "Claude Sonnet 5" },
		{ value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
	],
	// Conta ChatGPT no Codex recusa qualquer modelo forçado via `-m` — o valor `cli-default` faz o
	// runner NÃO passar `-m` e usar o modelo padrão da conta (sempre válido). `gpt-5-codex` só funciona
	// no Codex autenticado por API key da OpenAI.
	"codex-cli": [
		{ value: "cli-default", label: "Padrão da conta (recomendado — conta ChatGPT)" },
		{ value: "gpt-5-codex", label: "GPT-5 Codex (só com API key)" },
	],
	"gpt-cli": [{ value: "gpt-5", label: "GPT-5" }],
};

const schema = z
	.object({
		label: z.string().min(1, "Nome é obrigatório"),
		kind: z.enum(["claude-cli", "codex-cli", "gpt-cli", "anthropic-api", "openai", "openai-compat"]),
		baseUrl: z.string().optional(),
		apiKeyRef: z.string().optional(),
		// Sem mínimo: providers com endpoint conhecido resolvem o modelo em tempo de execução
		// (ver `resolveModel` no runner) — cadastrar um `value` exato deixou de ser obrigatório.
		models: z.array(z.object({ value: z.string().min(1, "Obrigatório"), label: z.string().min(1, "Obrigatório") })),
	})
	.refine((v) => v.kind !== "openai-compat" || Boolean(v.baseUrl?.trim()), {
		message: "Informe a base URL para um endpoint compatível com OpenAI",
		path: ["baseUrl"],
	});

type ProviderFormValues = z.infer<typeof schema>;

const emptyValues: ProviderFormValues = {
	label: "",
	kind: "openai",
	baseUrl: "",
	apiKeyRef: "",
	models: [],
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	provider?: ModelProvider;
};

export const ProviderFormDialog = ({ open, onOpenChange, provider }: Props) => {
	const createProvider = useCreateProvider();
	const updateProvider = useUpdateProvider();
	const { data: secrets = [] } = useSecretsQuery();
	const isEdit = Boolean(provider);

	const {
		register,
		handleSubmit,
		reset,
		control,
		setValue,
		formState: { errors },
	} = useForm<ProviderFormValues>({
		mode: "onTouched",
		resolver: zodResolver(schema),
		defaultValues: emptyValues,
	});

	const { fields, append, remove, replace } = useFieldArray({ control, name: "models" });
	const [isFetchingModels, setIsFetchingModels] = useState(false);
	const [isTesting, setIsTesting] = useState(false);

	useEffect(() => {
		if (!open) return;
		reset(
			provider
				? {
						label: provider.label,
						kind: provider.kind,
						baseUrl: provider.baseUrl ?? "",
						apiKeyRef: provider.apiKeyRef ?? "",
						models: provider.models,
					}
				: emptyValues,
		);
	}, [open, provider, reset]);

	const kind = useWatch({ control, name: "kind" });
	const baseUrl = useWatch({ control, name: "baseUrl" });
	const apiKeyRef = useWatch({ control, name: "apiKeyRef" });
	const watchedModels = useWatch({ control, name: "models" });

	const handleKindChange = (nextKind: ProviderKind) => {
		setValue("kind", nextKind, { shouldValidate: true });
		if (LOCAL_CLI_KINDS.includes(nextKind)) {
			setValue("baseUrl", "");
			setValue("apiKeyRef", "");
		}
		const hasConfiguredModels = watchedModels?.some((model) => model.value.trim() || model.label.trim());
		const suggestedModels = SUGGESTED_CLI_MODELS[nextKind];
		if (!hasConfiguredModels && suggestedModels) {
			replace(suggestedModels);
		}
	};

	const fetchModels = async () => {
		const resolvedBaseUrl = baseUrl?.trim() || (kind === "openai" ? OPENAI_DEFAULT_BASE_URL : "");
		if (!resolvedBaseUrl) {
			notify.error("Informe a Base URL antes de buscar os modelos.");
			return;
		}
		setIsFetchingModels(true);
		try {
			const models = await fetchProviderModels(resolvedBaseUrl, apiKeyRef?.trim() || undefined);
			if (models.length === 0) {
				notify.warning("O endpoint não retornou nenhum modelo.");
				return;
			}
			replace(models);
			notify.success(`${models.length} modelo(s) encontrado(s)`);
		} catch (err) {
			notify.error(err instanceof Error ? err.message : "Falha ao buscar modelos.");
		} finally {
			setIsFetchingModels(false);
		}
	};

	// Funciona para qualquer kind (CLI local ou API) porque reusa o mesmo caminho de execução real
	// dos agents (`callAgentStep` -> runner local) — não é um endpoint separado de "ping".
	const testConnection = async () => {
		const testModel = fields[0]?.value?.trim();
		if (!testModel) {
			notify.error("Cadastre ao menos um modelo antes de testar a conexão.");
			return;
		}
		setIsTesting(true);
		try {
			await callAgentStep(
				{
					systemPrompt: "Responda apenas com a palavra: ok",
					prompt: "ok",
					model: testModel,
					providerKind: kind,
					baseUrl: kind === "openai-compat" ? baseUrl?.trim() : undefined,
					apiKeyRef: LOCAL_CLI_KINDS.includes(kind) ? undefined : apiKeyRef?.trim() || undefined,
				},
				new AbortController().signal,
			);
			notify.success("Conexão funcionando — o provider respondeu.");
		} catch (err) {
			notify.error(err instanceof AgentCallError ? err.message : "Não foi possível conectar a esse provider.");
		} finally {
			setIsTesting(false);
		}
	};

	const onSubmit = async (values: ProviderFormValues) => {
		const draft = {
			label: values.label,
			kind: values.kind,
			baseUrl: values.kind === "openai-compat" ? values.baseUrl?.trim() : undefined,
			apiKeyRef: LOCAL_CLI_KINDS.includes(values.kind) ? undefined : values.apiKeyRef?.trim() || undefined,
			models: values.models,
		};

		try {
			if (provider) {
				await updateProvider.mutateAsync({ id: provider.id, payload: draft });
				notify.success("Provider atualizado");
			} else {
				await createProvider.mutateAsync(draft);
				notify.success("Provider criado");
			}
			onOpenChange(false);
		} catch {
			// Provider API hooks already show the API error toast.
		}
	};

	return (
		<AppSheet
			open={open}
			onOpenChange={onOpenChange}
			title={isEdit ? "Editar provider" : "Novo provider"}
			description="Cadastre um provider de modelo para os agents usarem."
			contentClassName="sm:max-w-xl"
			headerLeading={
				<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
					<Cpu className="size-5" />
				</div>
			}
			footer={
				<>
					<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="provider-form"
						size="sm"
						disabled={createProvider.isPending || updateProvider.isPending}
					>
						{isEdit ? "Salvar" : "Criar provider"}
					</Button>
				</>
			}
		>
			<form id="provider-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
				<Input label="Nome" placeholder="Ex.: OpenAI" error={errors.label?.message} {...register("label")} />

				<FieldWrapper label="Tipo">
					<Select value={kind} onValueChange={(v) => handleKindChange(v as ProviderKind)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(KIND_LABEL) as ProviderKind[]).map((k) => (
								<SelectItem key={k} value={k}>
									{KIND_LABEL[k]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldWrapper>

				{kind === "openai-compat" && (
					<Input
						label="Base URL"
						placeholder="https://api.exemplo.com/v1"
						error={errors.baseUrl?.message}
						{...register("baseUrl")}
					/>
				)}

				{!LOCAL_CLI_KINDS.includes(kind) && (
					<FieldWrapper
						label="Conexão de credencial (opcional)"
						description="Referência à credencial cifrada no backend. Cadastre em Conexões."
						error={errors.apiKeyRef?.message}
					>
						<Select value={apiKeyRef || "none"} onValueChange={(v) => setValue("apiKeyRef", v === "none" ? "" : v)}>
							<SelectTrigger>
								<SelectValue placeholder="Nenhuma" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Nenhuma</SelectItem>
								{secrets.map((secret) => (
									<SelectItem key={secret.id} value={secret.id}>
										{secret.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FieldWrapper>
				)}

				<FieldWrapper label="Modelos" error={errors.models?.message}>
					{DISCOVERABLE_KINDS.includes(kind) && (
						<Typography variant="caption" className="text-muted-foreground mb-2 block">
							Endpoint compatível com OpenAI — dá pra buscar os modelos disponíveis em vez de digitar o id de cabeça.
						</Typography>
					)}
					{kind === "codex-cli" && (
						<Typography variant="caption" className="text-muted-foreground mb-2 block">
							Use cli-default para contas ChatGPT. O runner deixa o Codex escolher o modelo permitido pela conta.
						</Typography>
					)}
					{fields.length > 0 && (
						<div className="flex flex-col gap-2">
							{fields.map((field, index) => (
								<div key={field.id} className="flex items-start gap-2">
									<Input
										wrapperClassName="flex-1"
										placeholder="valor (ex.: gpt-5)"
										error={errors.models?.[index]?.value?.message}
										{...register(`models.${index}.value`)}
									/>
									<Input
										wrapperClassName="flex-1"
										placeholder="rótulo (ex.: GPT-5)"
										error={errors.models?.[index]?.label?.message}
										{...register(`models.${index}.label`)}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="text-destructive mt-1"
										aria-label="Remover modelo"
										onClick={() => remove(index)}
									>
										<Trash2 />
									</Button>
								</div>
							))}
						</div>
					)}
					<div className="mt-2 flex flex-wrap gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => append({ value: "", label: "" })}>
							<Plus />
							Adicionar modelo
						</Button>
						{DISCOVERABLE_KINDS.includes(kind) && (
							<Button type="button" variant="outline" size="sm" disabled={isFetchingModels} onClick={fetchModels}>
								<Download />
								{isFetchingModels ? "Buscando..." : "Buscar modelos"}
							</Button>
						)}
						{SUGGESTED_CLI_MODELS[kind] && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => replace(SUGGESTED_CLI_MODELS[kind] ?? [])}
							>
								<Download />
								Preencher sugestões
							</Button>
						)}
						<Button type="button" variant="outline" size="sm" disabled={isTesting} onClick={testConnection}>
							{isTesting ? <LoaderCircle className="animate-spin" /> : <Plug />}
							{isTesting ? "Testando..." : "Testar conexão"}
						</Button>
					</div>
				</FieldWrapper>

				{LOCAL_CLI_KINDS.includes(kind) && (
					<Typography variant="caption" className="text-muted-foreground">
						Roda via CLI local já autenticado na máquina — sem API key.
					</Typography>
				)}
			</form>
		</AppSheet>
	);
};

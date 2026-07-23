import { AppSheet, Button, Stepper, type StepperStep } from "@/components";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { testTool, useCreateScript, useUpdateScript, type TestToolResult } from "@/features/security/scripts/api";
import {
	EMPTY_SCRIPT_FORM_VALUES,
	findTemplateById,
	inferTemplateFromKind,
	type ScriptFormValues,
	type ToolTemplate,
} from "@/features/security/scripts/data/tool-templates";
import type { Script } from "@/features/security/orchestrator-shared/types";
import { notify } from "@/components";
import { StepAuth } from "./step-auth";
import { StepCatalog } from "./step-catalog";
import { StepConfigure } from "./step-configure";
import { StepTest } from "./step-test";

const schema = z
	.object({
		name: z.string().min(1, "Nome é obrigatório"),
		description: z.string(),
		kind: z.enum(["command", "inline", "file", "http", "mcp", "connector"]),
		command: z.string(),
		args: z.string(),
		language: z.enum(["bash", "node", "python"]),
		content: z.string(),
		path: z.string(),
		method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
		urlTemplate: z.string(),
		headers: z.record(z.string(), z.string()),
		bodySchema: z.string(),
		responseMap: z.string(),
		transport: z.enum(["stdio", "http"]),
		url: z.string(),
		env: z.record(z.string(), z.string()),
		toolAllowlist: z.string(),
		connectorProvider: z.enum(["composio", "zapier", "n8n", "youtube", "instagram"]),
		configRecord: z.record(z.string(), z.string()),
		authRef: z.string(),
	})
	.refine((v) => v.kind !== "command" || Boolean(v.command?.trim()), {
		message: "Informe o comando",
		path: ["command"],
	})
	.refine((v) => v.kind !== "inline" || Boolean(v.content?.trim()), {
		message: "Escreva o conteúdo da ferramenta",
		path: ["content"],
	})
	.refine((v) => v.kind !== "file" || Boolean(v.path?.trim()), {
		message: "Informe o caminho",
		path: ["path"],
	})
	.refine((v) => v.kind !== "http" || Boolean(v.urlTemplate?.trim()), {
		message: "Informe a URL",
		path: ["urlTemplate"],
	})
	.refine((v) => v.kind !== "mcp" || v.transport !== "stdio" || Boolean(v.command?.trim()), {
		message: "Informe o comando que sobe o servidor MCP",
		path: ["command"],
	})
	.refine((v) => v.kind !== "mcp" || v.transport !== "http" || Boolean(v.url?.trim()), {
		message: "Informe a URL do servidor MCP",
		path: ["url"],
	})
	.refine((v) => v.kind !== "connector" || Boolean(v.connectorProvider), {
		message: "Selecione o provider do conector",
		path: ["connectorProvider"],
	});

/** Kinds que referenciam uma conexão (nunca o valor cru — só a referência resolvida pelo runner). */
const KINDS_WITH_AUTH_REF = new Set<ScriptFormValues["kind"]>(["http", "mcp", "connector"]);

/** Monta o payload real do `Script` a partir dos valores "achatados" do form — usado tanto pelo
 * teste (passo 4) quanto pelo submit final, pra testar exatamente o que vai ser salvo. */
const buildDraft = (values: ScriptFormValues) => {
	const isMcpStdio = values.kind === "mcp" && values.transport === "stdio";
	const isMcpHttp = values.kind === "mcp" && values.transport === "http";
	const configJson = Object.keys(values.configRecord).length > 0 ? JSON.stringify(values.configRecord) : undefined;
	return {
		name: values.name,
		description: values.description?.trim() || undefined,
		kind: values.kind,
		command: values.kind === "command" || isMcpStdio ? values.command?.trim() : undefined,
		args:
			(values.kind === "command" || isMcpStdio) && values.args?.trim() ? values.args.trim().split(/\s+/) : undefined,
		language: values.kind === "inline" ? values.language : undefined,
		content: values.kind === "inline" ? values.content : undefined,
		path: values.kind === "file" ? values.path?.trim() : undefined,
		method: values.kind === "http" ? values.method : undefined,
		urlTemplate: values.kind === "http" ? values.urlTemplate?.trim() : undefined,
		// Sempre manda o mapa (mesmo vazio) pros kinds que têm headers: o update do backend é merge
		// (`request.headers ?: current.headers`), então `undefined` = "não mexe" e removeria a
		// possibilidade de limpar. Um `{}` explícito sobrescreve e zera os headers.
		headers: values.kind === "http" || isMcpHttp ? values.headers : undefined,
		bodySchema: values.kind === "http" ? values.bodySchema?.trim() || undefined : undefined,
		responseMap: values.kind === "http" ? values.responseMap?.trim() || undefined : undefined,
		transport: values.kind === "mcp" ? values.transport : undefined,
		url: isMcpHttp ? values.url?.trim() : undefined,
		env: values.kind === "mcp" ? values.env : undefined,
		toolAllowlist:
			values.kind === "mcp" && values.toolAllowlist?.trim()
				? values.toolAllowlist
						.split(",")
						.map((tool) => tool.trim())
						.filter(Boolean)
				: undefined,
		connectorProvider: values.kind === "connector" ? values.connectorProvider : undefined,
		config: values.kind === "connector" ? configJson : undefined,
		authRef: KINDS_WITH_AUTH_REF.has(values.kind) ? values.authRef?.trim() || undefined : undefined,
	};
};

const scriptToFormValues = (script: Script): ScriptFormValues => ({
	name: script.name,
	description: script.description ?? "",
	kind: script.kind,
	command: script.command ?? "",
	args: script.args?.join(" ") ?? "",
	language: script.language ?? "bash",
	content: script.content ?? "",
	path: script.path ?? "",
	method: script.method ?? "GET",
	urlTemplate: script.urlTemplate ?? "",
	headers: script.headers ?? {},
	bodySchema: script.bodySchema ?? "",
	responseMap: script.responseMap ?? "",
	transport: script.transport ?? "stdio",
	url: script.url ?? "",
	env: script.env ?? {},
	toolAllowlist: script.toolAllowlist?.join(", ") ?? "",
	connectorProvider: script.connectorProvider ?? "composio",
	configRecord: script.config ? (JSON.parse(script.config) as Record<string, string>) : {},
	authRef: script.authRef ?? "",
});

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Quando presente, o wizard edita a ferramenta; senão, cria uma nova. */
	script?: Script;
	/** Conteúdo pré-preenchido (ex.: "Salvar como ferramenta" a partir de uma saída de run). */
	prefill?: { name?: string; content?: string };
	/** Chamado com a ferramenta criada/atualizada após salvar — permite o chamador anexá-la em algo (ex.: um agent). */
	onSaved?: (script: Script) => void;
};

export const ScriptWizard = ({ open, onOpenChange, script, prefill, onSaved }: Props) => {
	if (!open) return null;
	return (
		<ScriptWizardContent open={open} onOpenChange={onOpenChange} script={script} prefill={prefill} onSaved={onSaved} />
	);
};

const ScriptWizardContent = ({ open, onOpenChange, script, prefill, onSaved }: Props) => {
	const createScript = useCreateScript();
	const updateScript = useUpdateScript();
	const isEdit = Boolean(script);

	const initialTemplate = useMemo<ToolTemplate | null>(() => {
		if (script) return inferTemplateFromKind(script.kind);
		if (prefill?.content) return findTemplateById("inline") ?? null;
		return null;
	}, [script, prefill]);

	const [template, setTemplate] = useState<ToolTemplate | null>(initialTemplate);
	const [stepId, setStepId] = useState<"catalog" | "configure" | "auth" | "test">(
		initialTemplate ? "configure" : "catalog",
	);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<TestToolResult | null>(null);
	const [testSkipped, setTestSkipped] = useState(false);

	const {
		register,
		handleSubmit,
		reset,
		control,
		setValue,
		getValues,
		trigger,
		formState: { errors },
	} = useForm<ScriptFormValues>({
		mode: "onTouched",
		resolver: zodResolver(schema),
		defaultValues: EMPTY_SCRIPT_FORM_VALUES,
	});

	useEffect(() => {
		if (!open) return;
		if (script) {
			reset(scriptToFormValues(script));
			return;
		}
		if (prefill?.content) {
			reset({ ...EMPTY_SCRIPT_FORM_VALUES, kind: "inline", name: prefill.name ?? "", content: prefill.content });
			return;
		}
		reset(EMPTY_SCRIPT_FORM_VALUES);
	}, [open, script, prefill, reset]);

	const selectTemplate = (next: ToolTemplate) => {
		setTemplate(next);
		reset({ ...EMPTY_SCRIPT_FORM_VALUES, ...next.defaults, kind: next.kind });
		setTestResult(null);
		setTestSkipped(false);
		setStepId("configure");
	};

	const steps: StepperStep[] = useMemo(() => {
		const base: StepperStep[] = [
			{ id: "catalog", label: "Catálogo" },
			{ id: "configure", label: "Configurar" },
		];
		if (template?.requiresAuth) base.push({ id: "auth", label: "Autenticar" });
		base.push({ id: "test", label: "Testar" });
		return base;
	}, [template]);

	const goBack = () => {
		if (stepId === "test") {
			setTestResult(null);
			setTestSkipped(false);
			setStepId(template?.requiresAuth ? "auth" : "configure");
		} else if (stepId === "auth") {
			setStepId("configure");
		} else if (stepId === "configure") {
			setStepId("catalog");
		}
	};

	const goNext = async () => {
		if (stepId === "configure") {
			const valid = await trigger();
			if (!valid) return;
			setStepId(template?.requiresAuth ? "auth" : "test");
			return;
		}
		if (stepId === "auth") {
			setStepId("test");
			return;
		}
		if (stepId === "test") await submit();
	};

	const runTest = async () => {
		setIsTesting(true);
		setTestResult(null);
		try {
			const result = await testTool(buildDraft(getValues()));
			setTestResult(result);
		} finally {
			setIsTesting(false);
		}
	};

	const submit = handleSubmit(async (values) => {
		const draft = buildDraft(values);

		try {
			const saved = script
				? await updateScript.mutateAsync({ id: script.id, payload: draft })
				: await createScript.mutateAsync(draft);
			notify.success(script ? "Ferramenta atualizada" : "Ferramenta criada");
			onSaved?.(saved);
			onOpenChange(false);
		} catch {
			// Script API hooks already show the API error toast.
		}
	});

	const isLastStep = stepId === "test";
	const canSubmit = !isLastStep || Boolean(testResult?.ok) || testSkipped;
	const authRef = useWatch({ control, name: "authRef" });

	return (
		<AppSheet
			open={open}
			onOpenChange={onOpenChange}
			title={isEdit ? "Editar ferramenta" : "Nova ferramenta"}
			description={
				stepId === "catalog" ? "Escolha o que você quer que o agente consiga fazer." : (template?.label ?? "")
			}
			contentClassName="sm:max-w-2xl"
			headerLeading={
				<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
					<Wrench className="size-5" />
				</div>
			}
			footer={
				stepId === "catalog" ? undefined : (
					<>
						<Button type="button" variant="outline" size="sm" onClick={goBack}>
							<ArrowLeft />
							Voltar
						</Button>
						{isLastStep && !canSubmit && (
							<Button type="button" variant="ghost" size="sm" onClick={() => setTestSkipped(true)}>
								Pular teste
							</Button>
						)}
						<Button
							type="button"
							size="sm"
							onClick={goNext}
							disabled={!canSubmit || createScript.isPending || updateScript.isPending}
						>
							{isLastStep ? (isEdit ? "Salvar" : "Criar ferramenta") : "Avançar"}
							{!isLastStep && <ArrowRight />}
						</Button>
					</>
				)
			}
		>
			<div className="flex flex-col gap-6">
				{template && <Stepper steps={steps} activeStepId={stepId} />}

				{stepId === "catalog" && <StepCatalog onSelect={selectTemplate} />}
				{stepId === "configure" && template && (
					<StepConfigure
						template={template}
						control={control}
						errors={errors}
						register={register}
						setValue={setValue}
					/>
				)}
				{stepId === "auth" && <StepAuth authRef={authRef} onChange={(v) => setValue("authRef", v)} />}
				{stepId === "test" && <StepTest isTesting={isTesting} result={testResult} onTest={runTest} />}
			</div>
		</AppSheet>
	);
};

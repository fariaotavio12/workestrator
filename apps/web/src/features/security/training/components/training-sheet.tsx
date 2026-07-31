import { AppSheet, Badge, Button, DiffViewer, ErrorState, notify, Textarea, Typography } from "@/components";
import { useSquadQuery } from "@/features/security/squad-detail/api";
import { useRunsQuery } from "@/features/security/executions/api";
import { useTrainingStore } from "@/features/security/orchestrator-shared/model";
import {
	applyLesson,
	applyPromptPatch,
	checkPromptGuard,
	resolveBlamedAgent,
	startTraining,
	stopTraining,
} from "@/features/security/orchestrator-shared/runtime/training-runtime";
import { retryLastStep } from "@/features/security/orchestrator-shared/runtime/orchestrator-runtime";
import type { TrainingBlameVerdict, TrainingLesson } from "@/features/security/orchestrator-shared/types";
import { createTwoFilesPatch } from "diff";
import { BookOpen, Loader2, RotateCw, Wand2 } from "lucide-react";
import { useMemo } from "react";

/**
 * Quem o treinador responsabilizou. Só `agent` habilita alteração de prompt — as demais são saídas
 * legítimas do diagnóstico, não falhas (RF8).
 */
const VERDICT_LABEL: Record<TrainingBlameVerdict, string> = {
	agent: "Erro do agente",
	briefing: "Erro do briefing",
	upstream_step: "Erro de um passo anterior",
	tooling: "Falha de ferramenta ou infraestrutura",
	unclear: "Evidências insuficientes",
};

const VERDICT_HINT: Record<TrainingBlameVerdict, string> = {
	agent: "",
	briefing: "O pedido era ambíguo. Ajustar o prompt do agente aqui esconderia o problema real.",
	upstream_step: "O insumo chegou errado. A correção pertence ao passo anterior, não a quem foi reprovado.",
	tooling: "Falha técnica não é erro de processo — não gera treinamento.",
	unclear: "Não há evidência suficiente para atribuir o erro. Nenhuma alteração é proposta.",
};

type Props = {
	/** Chamado após "refazer o passo" — a tela de origem fecha e o RunDialog assume. */
	onRetried?: () => void;
};

export const TrainingSheet = ({ onRetried }: Props) => {
	const {
		open,
		status,
		context,
		proposal,
		lessonDraft,
		error,
		rawOutput,
		promptBlockedReason,
		applying,
		applied,
		close,
		setLessonDraft,
		setApplying,
		setPromptBlockedReason,
		markApplied,
	} = useTrainingStore();

	const { data: squad } = useSquadQuery(context?.squadId);
	const { data: runs } = useRunsQuery(context?.squadId ?? "");

	const run = useMemo(() => runs?.find((item) => item.id === context?.runId), [runs, context?.runId]);
	const rejection = useMemo(
		() => run?.rejections?.find((item) => item.id === context?.rejectionId),
		[run, context?.rejectionId],
	);
	const agent = useMemo(
		() => (squad && run && rejection ? resolveBlamedAgent(squad, run, rejection) : undefined),
		[squad, run, rejection],
	);

	const promptDiff = useMemo(() => {
		if (!agent || !proposal?.promptPatch) return "";
		return createTwoFilesPatch(
			"systemPrompt (atual)",
			"systemPrompt (proposto)",
			agent.systemPrompt,
			proposal.promptPatch.proposedSystemPrompt,
			undefined,
			undefined,
			{ context: 3 },
		);
	}, [agent, proposal]);

	const handleClose = () => {
		if (status === "running") stopTraining();
		close();
	};

	const retry = () => {
		if (squad && run && rejection) startTraining(squad, run, rejection);
	};

	const saveLesson = async () => {
		if (!squad || !run || !rejection || !lessonDraft) return;
		setApplying(true);
		const result = await applyLesson(squad, run, rejection, lessonDraft);
		setApplying(false);
		if (!result.ok) {
			notify.error(result.error);
			return;
		}
		markApplied({ lessonDocumentId: result.document.id });
		notify.success("Lição salva na base de conhecimento do squad.");
	};

	const savePrompt = async () => {
		if (!squad || !run || !rejection || !agent || !proposal?.promptPatch) return;
		const guard = checkPromptGuard(agent.systemPrompt, proposal.promptPatch.proposedSystemPrompt);
		if (!guard.ok) {
			setPromptBlockedReason(guard.error);
			return;
		}
		setApplying(true);
		const result = await applyPromptPatch(squad, agent, proposal.promptPatch.proposedSystemPrompt, {
			reason: proposal.promptPatch.rationale || proposal.diagnosis,
			runId: run.id,
			rejectionId: rejection.id,
		});
		setApplying(false);
		if (!result.ok) {
			notify.error(result.error);
			return;
		}
		setPromptBlockedReason(null);
		markApplied({ promptApplied: true });
		notify.success("Prompt atualizado. A versão anterior ficou no histórico do agente.");
	};

	// O vínculo reverso (`rejection.training.retriedRunId`) depende da persistência das reprovações, que
	// pertence à fase 1 — o run refeito já aponta para o run de origem via `resumedFromRunId`.
	const retryStep = () => {
		if (!squad || !run) return;
		retryLastStep(squad.id, run);
		close();
		onRetried?.();
	};

	const patchField = (field: keyof TrainingLesson, value: string) => {
		if (!lessonDraft) return;
		setLessonDraft({ ...lessonDraft, [field]: value });
	};

	const canApplyAnything = Boolean(applied.lessonDocumentId || applied.promptApplied);

	return (
		<AppSheet
			open={open}
			onOpenChange={(next) => !next && handleClose()}
			title="Treinar o agente"
			description={
				agent
					? `${agent.name} — ${agent.role}`
					: "Análise da reprovação: o que aconteceu e o que dá para corrigir de forma durável."
			}
			contentClassName="sm:max-w-3xl"
			footer={
				<div className="flex flex-wrap justify-end gap-2">
					{canApplyAnything && run && (
						<Button type="button" size="sm" onClick={retryStep}>
							<RotateCw />
							Refazer o passo
						</Button>
					)}
				</div>
			}
		>
			{status === "running" && (
				<div className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-16">
					<Loader2 className="size-6 animate-spin" />
					<Typography variant="body-sm">
						Analisando a reprovação. É uma chamada ao modelo do coordenador, fora do run.
					</Typography>
				</div>
			)}

			{status === "error" && (
				<div className="flex flex-col gap-4">
					<ErrorState title="O treinamento não concluiu" message={error ?? undefined} onRetry={retry} />
					{rawOutput && (
						<details className="border-border rounded-lg border p-3">
							<summary className="text-muted-foreground cursor-pointer text-xs">Ver a saída crua do modelo</summary>
							<pre className="mt-3 overflow-x-auto font-mono text-xs whitespace-pre-wrap">{rawOutput}</pre>
						</details>
					)}
				</div>
			)}

			{status === "ready" && proposal && (
				<div className="flex flex-col gap-6">
					<section className="flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<Typography variant="ui-header">Diagnóstico</Typography>
							<Badge variant={proposal.blameVerdict === "agent" ? "warning" : "secondary"}>
								{VERDICT_LABEL[proposal.blameVerdict]}
							</Badge>
							{typeof proposal.confidence === "number" && (
								<Badge variant="secondary">confiança {Math.round(proposal.confidence * 100)}%</Badge>
							)}
						</div>
						<Typography variant="body-sm">{proposal.diagnosis}</Typography>
						{proposal.blameVerdict !== "agent" && (
							<Typography variant="body-sm" className="text-muted-foreground">
								{VERDICT_HINT[proposal.blameVerdict]}
							</Typography>
						)}
					</section>

					{lessonDraft && (
						<section className="flex flex-col gap-3">
							<Typography variant="ui-header">Lição aprendida</Typography>
							<Typography variant="body-sm" className="text-muted-foreground">
								Escreva com o vocabulário do problema — é assim que ela será encontrada quando o cenário se repetir.
							</Typography>
							<Textarea
								label="Título"
								value={lessonDraft.title}
								onChange={(e) => patchField("title", e.target.value)}
								rows={1}
							/>
							<Textarea
								label="Quando se aplica"
								value={lessonDraft.scenario}
								onChange={(e) => patchField("scenario", e.target.value)}
								rows={3}
							/>
							<Textarea
								label="O que deu errado"
								value={lessonDraft.mistake}
								onChange={(e) => patchField("mistake", e.target.value)}
								rows={3}
							/>
							<Textarea
								label="Regra"
								value={lessonDraft.rule}
								onChange={(e) => patchField("rule", e.target.value)}
								rows={3}
							/>
							<Textarea
								label="Exemplo"
								description="Opcional."
								value={lessonDraft.example ?? ""}
								onChange={(e) => patchField("example", e.target.value)}
								rows={3}
							/>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="self-start"
								disabled={applying || Boolean(applied.lessonDocumentId)}
								onClick={saveLesson}
							>
								<BookOpen />
								{applied.lessonDocumentId ? "Lição salva" : "Salvar na base"}
							</Button>
						</section>
					)}

					{proposal.promptPatch && agent && (
						<section className="flex flex-col gap-3">
							<Typography variant="ui-header">Alteração do systemPrompt</Typography>
							<Typography variant="body-sm" className="text-muted-foreground">
								{proposal.promptPatch.rationale}
							</Typography>
							<DiffViewer patch={promptDiff} />
							{promptBlockedReason && (
								<Typography variant="body-sm" className="text-destructive">
									{promptBlockedReason}
								</Typography>
							)}
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="self-start"
								disabled={applying || applied.promptApplied}
								onClick={savePrompt}
							>
								<Wand2 />
								{applied.promptApplied ? "Prompt aplicado" : "Aplicar prompt"}
							</Button>
						</section>
					)}
				</div>
			)}
		</AppSheet>
	);
};

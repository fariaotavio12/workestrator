// Providers de modelo cadastrados (substitui data/models.ts) — seed do que já funciona (claude-cli)
// + exemplos de outros providers para o multi-model. claude-cli/codex-cli/gpt-cli/openai/openai-compat
// já executam de verdade via runner.ts; só anthropic-api ainda está pendente.
import type { ModelProvider, OrchestratorConfig, ProviderKind } from "../types";

export const EXECUTABLE_PROVIDER_KINDS = ["claude-cli", "codex-cli", "gpt-cli", "openai", "openai-compat"] as const satisfies readonly ProviderKind[];

export const providerExecutes = (kind?: ProviderKind): boolean =>
	!!kind && (EXECUTABLE_PROVIDER_KINDS as readonly ProviderKind[]).includes(kind);

const ISO = "2026-07-08T10:00:00.000Z";

export const seedProviders = (): ModelProvider[] => [
	{
		id: "provider-claude-cli",
		label: "Claude Code (CLI local)",
		kind: "claude-cli",
		models: [
			{ value: "claude-opus-4-8", label: "Claude Opus 4.8" },
			{ value: "claude-sonnet-5", label: "Claude Sonnet 5" },
			{ value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
		],
		createdAt: ISO,
		updatedAt: ISO,
	},
	{
		id: "provider-codex-cli",
		label: "Codex (CLI local)",
		kind: "codex-cli",
		models: [
			{ value: "cli-default", label: "Padrão da conta Codex" },
			{ value: "gpt-5-codex", label: "GPT-5 Codex" },
		],
		createdAt: ISO,
		updatedAt: ISO,
	},
	{
		id: "provider-openai",
		label: "OpenAI",
		kind: "openai",
		apiKeyRef: "OPENAI_API_KEY",
		models: [{ value: "gpt-5", label: "GPT-5" }],
		createdAt: ISO,
		updatedAt: ISO,
	},
	{
		id: "provider-gemini",
		label: "Google Gemini",
		kind: "openai-compat",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
		apiKeyRef: "GEMINI_API_KEY",
		models: [{ value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }],
		createdAt: ISO,
		updatedAt: ISO,
	},
];

export const DEFAULT_PROVIDER_ID = "provider-claude-cli";
export const DEFAULT_MODEL = "claude-opus-4-8";

export const modelLabel = (providers: ModelProvider[], providerId: string, model: string): string =>
	providers.find((p) => p.id === providerId)?.models.find((m) => m.value === model)?.label ?? model;

export const providerLabel = (providers: ModelProvider[], providerId: string): string =>
	providers.find((p) => p.id === providerId)?.label ?? providerId;

/** Config padrão do coordenador — usada em squads novos e na migração de squads antigos sem orquestrador. */
export const createDefaultOrchestratorConfig = (): OrchestratorConfig => ({
	systemPrompt:
		"Você coordena este squad. A cada passo, decida qual agent sentado deve agir a seguir, considerando " +
		"o briefing e o que já foi produzido, até a tarefa estar completa.",
	modelRef: { providerId: DEFAULT_PROVIDER_ID, model: DEFAULT_MODEL },
	maxSteps: 8,
});

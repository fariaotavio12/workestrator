import type { ModelProvider, ProviderKind } from "@/features/security/orchestrator-shared/types";

export type ProviderPayload = {
	label: string;
	kind: ProviderKind;
	baseUrl?: string;
	apiKeyRef?: string;
	models?: ModelProvider["models"];
};

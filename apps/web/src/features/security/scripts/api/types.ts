import type { Script, ScriptKind } from "@/features/security/orchestrator-shared/types";

export type ScriptPayload = {
	name: string;
	description?: string;
	kind: ScriptKind;
	command?: string;
	args?: string[];
	language?: Script["language"];
	content?: string;
	path?: string;
	method?: Script["method"];
	urlTemplate?: string;
	headers?: Record<string, string>;
	bodySchema?: string;
	responseMap?: string;
	transport?: Script["transport"];
	url?: string;
	env?: Record<string, string>;
	toolAllowlist?: string[];
	connectorProvider?: Script["connectorProvider"];
	config?: string;
	authRef?: string;
};

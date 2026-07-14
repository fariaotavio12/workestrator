import type { Script } from "@/features/security/orchestrator-shared/types";

export const scriptCommandLabel = (script: Script): string => {
	switch (script.kind) {
		case "command":
			return [script.command, ...(script.args ?? [])].filter(Boolean).join(" ");
		case "file":
			return script.path ?? `scripts/${script.name}`;
		case "http":
			return [script.method, script.urlTemplate].filter(Boolean).join(" ") || `scripts/${script.name}`;
		case "mcp":
			return script.transport === "http"
				? (script.url ?? `scripts/${script.name}`)
				: [script.command, ...(script.args ?? [])].filter(Boolean).join(" ");
		case "connector":
			return script.connectorProvider ?? `scripts/${script.name}`;
		default:
			return `scripts/${script.name}`;
	}
};

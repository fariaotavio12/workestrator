export const approvalsKeys = {
	all: ["approvals"] as const,
	detail: (id: string) => [...approvalsKeys.all, id] as const,
	run: (id: string) => [...approvalsKeys.all, id, "run"] as const,
	byRun: (runId: string) => [...approvalsKeys.all, "run", runId] as const,
	assignedToMe: (status?: string) => [...approvalsKeys.all, "assigned-to-me", status ?? "all"] as const,
};

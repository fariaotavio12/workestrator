export const assistantSessionsKeys = {
	all: ["assistant-sessions"] as const,
	list: () => [...assistantSessionsKeys.all, "list"] as const,
	detail: (id: string) => [...assistantSessionsKeys.all, "detail", id] as const,
};

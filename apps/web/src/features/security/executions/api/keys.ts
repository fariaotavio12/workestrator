export const executionsKeys = {
	all: ["runs"] as const,
	recent: (params?: unknown) => [...executionsKeys.all, "recent", params] as const,
	bySquad: (squadId: string) => [...executionsKeys.all, squadId] as const,
};

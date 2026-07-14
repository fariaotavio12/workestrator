export const squadsKeys = {
	all: ["squads"] as const,
	list: () => [...squadsKeys.all, "list"] as const,
};

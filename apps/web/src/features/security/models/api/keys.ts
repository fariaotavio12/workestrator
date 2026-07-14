export const providersKeys = {
	all: ["providers"] as const,
	list: () => [...providersKeys.all, "list"] as const,
};

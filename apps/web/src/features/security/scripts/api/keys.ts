export const scriptsKeys = {
	all: ["scripts"] as const,
	list: () => [...scriptsKeys.all, "list"] as const,
};

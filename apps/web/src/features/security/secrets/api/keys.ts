export const secretsKeys = {
	all: ["secrets"] as const,
	list: () => [...secretsKeys.all, "list"] as const,
};

export const connectorsKeys = {
	all: ["connectors"] as const,
	catalog: () => [...connectorsKeys.all, "catalog"] as const,
};

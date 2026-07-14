export const squadDetailKeys = {
	all: ["squad-detail"] as const,
	detail: (squadId: string) => [...squadDetailKeys.all, squadId] as const,
};

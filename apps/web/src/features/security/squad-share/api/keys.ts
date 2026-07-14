export const squadShareKeys = {
	all: ["squad-share"] as const,
	preview: (token: string) => [...squadShareKeys.all, "preview", token] as const,
};

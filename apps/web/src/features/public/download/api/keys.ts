export const downloadKeys = {
	all: ["download"] as const,
	latestRelease: () => [...downloadKeys.all, "latest-release"] as const,
};

import type { GetExploreAssetsParams } from "./types";

export const exploreKeys = {
	all: ["explore"] as const,
	assets: (params?: GetExploreAssetsParams) => [...exploreKeys.all, "assets", params] as const,
	myAssets: (params?: GetExploreAssetsParams) => [...exploreKeys.all, "my-assets", params] as const,
	mcpPreset: () => [...exploreKeys.all, "mcp-preset"] as const,
};

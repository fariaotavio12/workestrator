import type { ApiRequestParams } from "@/app/api/types";

export type ExploreAssetKind = "SQUAD" | "SKILL" | "KNOWLEDGE" | "SCRIPT" | "COMMAND" | "MCP";

export type ExploreAsset = {
	id: string;
	kind: ExploreAssetKind;
	title: string;
	description: string;
	authorName: string;
	tags: string[];
	payload: unknown;
	visibility: "PRIVATE" | "PUBLIC";
	originAssetId?: string | null;
	importCount: number;
	isVerified: boolean;
	createdAt: string;
	updatedAt: string;
};

export type ImportedExploreAsset = {
	id: string;
	sourceAssetId?: string | null;
	kind: ExploreAssetKind;
	title: string;
	visibility: "PRIVATE" | "PUBLIC";
	createdAt: string;
};

export type CreateExploreAssetRequest = {
	kind: ExploreAssetKind;
	title: string;
	description: string;
	tags: string[];
	payload?: unknown;
	visibility: "PRIVATE" | "PUBLIC";
};

export type ExploreMcpTool = {
	name: string;
	description: string;
	method: string;
	path: string;
};

export type ExploreMcpPreset = {
	name: string;
	description: string;
	transport: string;
	baseUrl: string;
	headers: Record<string, string>;
	tools: ExploreMcpTool[];
	assets: ExploreAsset[];
};

export type ExploreAssetFilter = {
	type?: ExploreAssetKind;
	search?: string;
};

export type GetExploreAssetsParams = ApiRequestParams<ExploreAsset, ExploreAssetFilter>;

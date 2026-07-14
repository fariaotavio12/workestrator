export type GitHubReleaseAssetDto = {
	id: number;
	name: string;
	browser_download_url: string;
	content_type: string;
	size: number;
	download_count: number;
};

export type GitHubReleaseDto = {
	id: number;
	name: string | null;
	tag_name: string;
	html_url: string;
	body: string | null;
	published_at: string | null;
	prerelease: boolean;
	draft: boolean;
	assets: GitHubReleaseAssetDto[];
};

export type DownloadPlatform = "windows" | "macos" | "linux" | "other";

export type DownloadAsset = {
	id: number;
	name: string;
	url: string;
	size: number;
	downloadCount: number;
	platform: DownloadPlatform;
};

export type DownloadRelease = {
	name: string;
	version: string;
	url: string;
	publishedAt: string | null;
	isPrerelease: boolean;
	assets: DownloadAsset[];
};

export type DownloadReleaseManifest = {
	latest: DownloadRelease | null;
	releases: DownloadRelease[];
};

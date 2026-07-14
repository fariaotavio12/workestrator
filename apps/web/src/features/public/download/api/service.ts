import { useQuery } from "@tanstack/react-query";
import { downloadKeys } from "./keys";
import type {
	DownloadAsset,
	DownloadPlatform,
	DownloadRelease,
	DownloadReleaseManifest,
	GitHubReleaseDto,
} from "./types";

const RELEASES_ENDPOINT = "https://api.github.com/repos/fariaotavio12/front-workestrador/releases";
const RELEASES_MANIFEST_ENDPOINT = "/releases.json";

const INSTALLER_EXTENSIONS = [".exe", ".msi", ".dmg", ".appimage", ".deb", ".rpm", ".zip"];

const getPlatform = (assetName: string): DownloadPlatform => {
	const normalized = assetName.toLowerCase();

	if (normalized.includes("win") || normalized.endsWith(".exe") || normalized.endsWith(".msi")) {
		return "windows";
	}

	if (normalized.includes("mac") || normalized.includes("darwin") || normalized.endsWith(".dmg")) {
		return "macos";
	}

	if (
		normalized.includes("linux") ||
		normalized.endsWith(".appimage") ||
		normalized.endsWith(".deb") ||
		normalized.endsWith(".rpm")
	) {
		return "linux";
	}

	return "other";
};

const isInstallerAsset = (assetName: string) => {
	const normalized = assetName.toLowerCase();

	return INSTALLER_EXTENSIONS.some((extension) => normalized.endsWith(extension)) && !normalized.endsWith(".blockmap");
};

const toDownloadAsset = (asset: GitHubReleaseDto["assets"][number]): DownloadAsset => ({
	id: asset.id,
	name: asset.name,
	url: asset.browser_download_url,
	size: asset.size,
	downloadCount: asset.download_count,
	platform: getPlatform(asset.name),
});

const toDownloadRelease = (release: GitHubReleaseDto): DownloadRelease => ({
	name: release.name || release.tag_name,
	version: release.tag_name,
	url: release.html_url,
	publishedAt: release.published_at,
	isPrerelease: release.prerelease,
	assets: release.assets.filter((asset) => isInstallerAsset(asset.name)).map(toDownloadAsset),
});

const fetchManifestRelease = async (): Promise<DownloadRelease | null | undefined> => {
	const response = await fetch(RELEASES_MANIFEST_ENDPOINT, {
		headers: {
			Accept: "application/json",
		},
	});

	if (response.status === 404) {
		return undefined;
	}

	if (!response.ok) {
		throw new Error("Não foi possível carregar o manifesto de releases.");
	}

	const manifest = (await response.json()) as DownloadReleaseManifest;

	return manifest.latest ?? manifest.releases.find((release) => release.assets.length > 0) ?? null;
};

const fetchGitHubRelease = async (): Promise<DownloadRelease | null> => {
	const response = await fetch(RELEASES_ENDPOINT, {
		headers: {
			Accept: "application/vnd.github+json",
		},
	});

	if (!response.ok) {
		throw new Error("Não foi possível carregar as releases.");
	}

	const releases = (await response.json()) as GitHubReleaseDto[];
	const release = releases.find((item) => !item.draft) ?? null;

	return release ? toDownloadRelease(release) : null;
};

const fetchLatestRelease = async (): Promise<DownloadRelease | null> => {
	const manifestRelease = await fetchManifestRelease();

	if (manifestRelease !== undefined) {
		return manifestRelease;
	}

	return fetchGitHubRelease();
};

export const useLatestDownloadRelease = () =>
	useQuery({
		queryKey: downloadKeys.latestRelease(),
		queryFn: fetchLatestRelease,
		staleTime: 1000 * 60 * 5,
	});

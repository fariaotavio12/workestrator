import { appBrand } from "@/app/config/branding";
import { Rotas } from "@/app/routing/variables";
import { Badge, Button, Skeleton } from "@/components";
import { CustomLink } from "@/components/link";
import { Typography } from "@/components/typography";
import { useLatestDownloadRelease, type DownloadAsset, type DownloadPlatform } from "@/features/public/download/api";
import { cn } from "@/app/utils/cn";
import { MonitorDown } from "lucide-react";

const platformLabels: Record<DownloadPlatform, string> = {
	windows: "Windows",
	macos: "macOS",
	linux: "Linux",
	other: "seu sistema",
};

const getRecommendedAsset = (assets: DownloadAsset[]) => {
	const platform = navigator.platform.toLowerCase();

	if (platform.includes("win")) return assets.find((asset) => asset.platform === "windows") ?? assets[0];
	if (platform.includes("mac")) return assets.find((asset) => asset.platform === "macos") ?? assets[0];
	if (platform.includes("linux")) return assets.find((asset) => asset.platform === "linux") ?? assets[0];

	return assets[0];
};

type Props = {
	className?: string;
	entrarId?: string;
};

/** Card de "Fim da visita": baixar o app desktop + versão atual, no lugar do Criar conta/Entrar do design original. */
export const EndOfVisitCard = ({ className, entrarId }: Props) => {
	const { data: release, isLoading } = useLatestDownloadRelease();
	const assets = release?.assets ?? [];
	const recommendedAsset = assets.length > 0 ? getRecommendedAsset(assets) : undefined;

	return (
		<div className={cn("flex flex-col items-center gap-3 text-center", className)}>
			<Typography variant="section-label" className="text-gold">
				Fim da visita
			</Typography>
			<Typography variant="title-lg">O baú é seu.</Typography>
			<Typography variant="body-sm" className="text-muted-foreground">
				Baixe o {appBrand.name}, monte o primeiro squad e deixe o orquestrador trabalhar.
			</Typography>

			{isLoading ? (
				<Skeleton className="h-11 w-48 rounded-full" />
			) : (
				<div className="flex flex-wrap items-center justify-center gap-2">
					{recommendedAsset ? (
						<Button asChild size="lg">
							<a href={recommendedAsset.url}>
								<MonitorDown className="size-4" />
								Baixar para {platformLabels[recommendedAsset.platform]}
							</a>
						</Button>
					) : (
						<CustomLink to={Rotas.desprotegidas.landingPages.download} size="lg">
							<MonitorDown className="size-4" />
							Ver downloads
						</CustomLink>
					)}
					<CustomLink id={entrarId} to={Rotas.desprotegidas.auth.login} variant="outline" size="lg">
						Entrar
					</CustomLink>
				</div>
			)}

			{release && (
				<div className="flex items-center gap-2">
					<Badge variant="secondary">{release.version}</Badge>
					<Typography variant="caption" className="text-muted-foreground">
						{assets.length} instalador{assets.length === 1 ? "" : "es"} disponível{assets.length === 1 ? "" : "eis"}
					</Typography>
				</div>
			)}
		</div>
	);
};

import { appBrand } from "@/app/config/branding";
import { Rotas } from "@/app/routing/variables";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	EmptyState,
	ErrorState,
	Skeleton,
	Typography,
} from "@/components";
import { useLatestDownloadRelease, type DownloadAsset, type DownloadPlatform } from "@/features/public/download/api";
import { CustomLink } from "@/components/link";
import { CheckCircle2, Download, ExternalLink, Laptop, MonitorDown } from "lucide-react";

const platformLabels: Record<DownloadPlatform, string> = {
	windows: "Windows",
	macos: "macOS",
	linux: "Linux",
	other: "Outro",
};

const platformOrder: DownloadPlatform[] = ["windows", "macos", "linux", "other"];

const formatBytes = (bytes: number) => {
	if (!bytes) return "Tamanho não informado";

	const units = ["B", "KB", "MB", "GB"];
	const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / 1024 ** index;

	return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDate = (date: string | null) => {
	if (!date) return "Data não informada";

	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(date));
};

const getRecommendedAsset = (assets: DownloadAsset[]) => {
	const platform = navigator.platform.toLowerCase();

	if (platform.includes("win")) return assets.find((asset) => asset.platform === "windows") ?? assets[0];
	if (platform.includes("mac")) return assets.find((asset) => asset.platform === "macos") ?? assets[0];
	if (platform.includes("linux")) return assets.find((asset) => asset.platform === "linux") ?? assets[0];

	return assets[0];
};

const DownloadSkeleton = () => (
	<div className="grid gap-4 md:grid-cols-3">
		{[0, 1, 2].map((item) => (
			<Card key={item} size="sm">
				<CardHeader>
					<Skeleton className="h-5 w-28" />
					<Skeleton className="h-4 w-36" />
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<Skeleton className="h-10 w-full rounded-full" />
					<Skeleton className="h-4 w-24" />
				</CardContent>
			</Card>
		))}
	</div>
);

const AssetCard = ({ asset, isRecommended }: { asset: DownloadAsset; isRecommended: boolean }) => (
	<Card size="sm">
		<CardHeader>
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-2">
					<CardTitle>
						<Typography variant="title-sm">{platformLabels[asset.platform]}</Typography>
					</CardTitle>
					<Typography variant="body-sm" className="text-muted-foreground break-all">
						{asset.name}
					</Typography>
				</div>
				{isRecommended && <Badge variant="secondary">Recomendado</Badge>}
			</div>
		</CardHeader>
		<CardContent className="flex flex-col gap-4">
			<Button asChild className="w-full">
				<a href={asset.url}>
					<Download className="size-4" />
					Baixar
				</a>
			</Button>
			<div className="flex flex-wrap items-center gap-3">
				<Typography variant="caption" className="text-muted-foreground">
					{formatBytes(asset.size)}
				</Typography>
				<Typography variant="caption" className="text-muted-foreground">
					{asset.downloadCount} downloads
				</Typography>
			</div>
		</CardContent>
	</Card>
);

export const PageDownload = () => {
	const { data: release, isLoading, isError, refetch } = useLatestDownloadRelease();
	const assets = release?.assets ?? [];
	const recommendedAsset = assets.length > 0 ? getRecommendedAsset(assets) : undefined;
	const sortedAssets = [...assets].sort(
		(a, b) => platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform) || a.name.localeCompare(b.name),
	);

	return (
		<div className="flex w-full flex-col">
			<section className="w-full border-b">
				<div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-20 lg:py-24">
					<div className="flex max-w-3xl flex-col gap-6">
						<Badge variant="outline" className="w-fit">
							Desktop app
						</Badge>
						<div className="flex flex-col gap-4">
							<Typography variant="display-lg">Baixar {appBrand.name}</Typography>
							<Typography variant="body-md" className="text-muted-foreground max-w-2xl">
								Instale o app desktop para rodar squads, scripts e execuções locais com a parte privada do orquestrador.
							</Typography>
						</div>
						<div className="flex flex-wrap gap-3">
							{recommendedAsset ? (
								<Button asChild size="lg">
									<a href={recommendedAsset.url}>
										<MonitorDown className="size-4" />
										Baixar para {platformLabels[recommendedAsset.platform]}
									</a>
								</Button>
							) : (
								<Button size="lg" variant="outline" disabled>
									<MonitorDown className="size-4" />
									Sem instalador publicado
								</Button>
							)}
							{release?.url && (
								<Button asChild size="lg" variant="outline">
									<a href={release.url}>
										<ExternalLink className="size-4" />
										Notas da versão
									</a>
								</Button>
							)}
							<CustomLink to={Rotas.desprotegidas.landingPages.participate} size="lg" variant="ghost">
								Sugerir melhoria
							</CustomLink>
						</div>
					</div>

					<Card className="self-start">
						<CardHeader>
							<CardTitle>
								<Typography variant="title-md">Release atual</Typography>
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							{isLoading ? (
								<>
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-4 w-48" />
									<Skeleton className="h-4 w-36" />
								</>
							) : release ? (
								<>
									<div className="flex flex-wrap items-center gap-2">
										<Typography variant="title-lg">{release.version}</Typography>
										{release.isPrerelease && <Badge variant="warning">Pre-release</Badge>}
									</div>
									<Typography variant="body-sm" className="text-muted-foreground">
										Publicado em {formatDate(release.publishedAt)}
									</Typography>
									<div className="flex items-center gap-2">
										<CheckCircle2 className="text-primary size-4" />
										<Typography variant="body-sm">{assets.length} arquivo(s) de instalação disponível(is)</Typography>
									</div>
								</>
							) : (
								<div className="flex items-center gap-2">
									<Laptop className="text-muted-foreground size-4" />
									<Typography variant="body-sm" className="text-muted-foreground">
										Nenhuma release publicada ainda.
									</Typography>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</section>

			<section className="w-full">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-16 md:px-10 lg:px-20">
					<div className="flex flex-col gap-3">
						<Typography variant="title-lg">Instaladores</Typography>
						<Typography variant="body-sm" className="text-muted-foreground max-w-2xl">
							Escolha o arquivo compatível com seu sistema operacional. Sempre que o CI publicar uma nova release, esta
							lista passa a apontar para os assets mais recentes do manifesto público.
						</Typography>
					</div>

					{isLoading ? (
						<DownloadSkeleton />
					) : isError ? (
						<ErrorState
							title="Não foi possível carregar as releases"
							message="Confira a página pública de releases ou tente novamente em alguns instantes."
							onRetry={() => refetch()}
						/>
					) : sortedAssets.length === 0 ? (
						<EmptyState
							title="Nenhum instalador publicado"
							message="Assim que o workflow de release publicar os artefatos do Electron, os downloads aparecem aqui."
							icon={MonitorDown}
						/>
					) : (
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{sortedAssets.map((asset) => (
								<AssetCard key={asset.id} asset={asset} isRecommended={asset.id === recommendedAsset?.id} />
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	);
};

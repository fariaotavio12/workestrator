import { usePaginatedData } from "@/app/hooks/usePaginatedData";
import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, Input, Skeleton, Typography } from "@/components";
import {
	useImportExploreAsset,
	useExploreAssetsQuery,
	type ExploreAsset,
	type ExploreAssetFilter,
	type ExploreAssetKind,
} from "@/features/public/explore/api";
import {
	Boxes,
	ChevronLeft,
	ChevronRight,
	Command,
	Globe2,
	Library,
	Plug,
	Search,
	ShieldCheck,
	Sparkles,
	Terminal,
	Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const assetKinds: Array<{ label: string; value?: ExploreAssetKind }> = [
	{ label: "Todos" },
	{ label: "Squads", value: "SQUAD" },
	{ label: "Skills", value: "SKILL" },
	{ label: "Conhecimento", value: "KNOWLEDGE" },
	{ label: "Scripts", value: "SCRIPT" },
	{ label: "Comandos", value: "COMMAND" },
	{ label: "MCP", value: "MCP" },
];

const kindMeta: Record<ExploreAssetKind, { label: string; icon: typeof Sparkles }> = {
	SQUAD: { label: "Squad", icon: Boxes },
	SKILL: { label: "Skill", icon: Sparkles },
	KNOWLEDGE: { label: "Conhecimento", icon: Library },
	SCRIPT: { label: "Script", icon: Terminal },
	COMMAND: { label: "Comando", icon: Command },
	MCP: { label: "MCP", icon: Plug },
};

const AssetSkeleton = () => (
	<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{[0, 1, 2, 3, 4, 5].map((item) => (
			<Card key={item} size="sm" className="min-h-60">
				<CardContent className="flex h-full flex-col gap-4">
					<Skeleton className="size-10 rounded-lg" />
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-4/5" />
					<div className="mt-auto flex gap-2">
						<Skeleton className="h-7 w-16 rounded-full" />
						<Skeleton className="h-7 w-20 rounded-full" />
					</div>
				</CardContent>
			</Card>
		))}
	</div>
);

const AssetCard = ({
	asset,
	isAuthenticated,
	onImport,
	isImporting,
}: {
	asset: ExploreAsset;
	isAuthenticated: boolean;
	onImport: (assetId: string) => void;
	isImporting: boolean;
}) => {
	const meta = kindMeta[asset.kind];
	const Icon = meta.icon;

	return (
		<Card size="sm" className="min-h-64">
			<CardContent className="flex h-full flex-col gap-4">
				<div className="flex items-start justify-between gap-3">
					<div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border">
						<Icon className="size-5" />
					</div>
					<div className="flex items-center gap-2">
						{asset.isVerified && (
							<Badge variant="secondary">
								<ShieldCheck className="size-3" />
								Verificado
							</Badge>
						)}
						<Badge variant="outline">{meta.label}</Badge>
					</div>
				</div>

				<div className="flex min-h-0 flex-1 flex-col gap-2">
					<Typography variant="title-sm">{asset.title}</Typography>
					<Typography variant="body-sm" className="text-muted-foreground line-clamp-3">
						{asset.description}
					</Typography>
				</div>

				<div className="flex flex-wrap gap-2">
					{asset.tags.map((tag) => (
						<Badge key={tag} variant="outline" className="px-2 py-1">
							{tag}
						</Badge>
					))}
				</div>

				<div className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
					<div>
						<Typography variant="caption" className="text-muted-foreground">
							por {asset.authorName}
						</Typography>
						<Typography variant="caption" className="text-muted-foreground block">
							{asset.importCount} importacoes
						</Typography>
					</div>
					{isAuthenticated ? (
						<Button variant="outline" size="sm" disabled={isImporting} onClick={() => onImport(asset.id)}>
							{isImporting && <Loader2 className="animate-spin" />}
							Importar
						</Button>
					) : (
						<Button asChild variant="outline" size="sm">
							<Link to={Rotas.desprotegidas.auth.login} state={{ from: Rotas.desprotegidas.landingPages.explore }}>
								Importar
							</Link>
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export const PageExplore = () => {
	const navigate = useNavigate();
	const { user, isInitializing } = useAuth();
	const importAsset = useImportExploreAsset();
	const [search, setSearch] = useState("");
	const [type, setType] = useState<ExploreAssetKind | undefined>();
	const filter = useMemo<ExploreAssetFilter>(() => ({ search: search.trim() || undefined, type }), [search, type]);
	const { data, isLoading, isError, refetch, pagination, updatePagination } = usePaginatedData<
		ExploreAsset,
		ExploreAssetFilter
	>({
		query: useExploreAssetsQuery,
		filter,
		storageKey: "exploreAssetsPagination",
	});

	const handleImport = (assetId: string) => {
		if (!user) {
			navigate(Rotas.desprotegidas.auth.login, { state: { from: Rotas.desprotegidas.landingPages.explore } });
			return;
		}

		importAsset.mutate(assetId);
	};

	return (
		<div className="flex w-full flex-col">
			<section className="w-full border-b">
				<div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 md:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:px-20 lg:py-24">
					<div className="flex max-w-3xl flex-col gap-5">
						<Badge variant="outline" className="w-fit">
							Explore
						</Badge>
						<Typography variant="display-lg">Recursos da comunidade para importar e adaptar.</Typography>
					</div>
					<div className="flex flex-col justify-end gap-5">
						<Typography variant="body-md" className="text-muted-foreground max-w-xl">
							Descubra squads, skills, conhecimento, scripts, comandos e presets MCP publicados pela comunidade.
							Importe para sua biblioteca e adapte ao seu fluxo.
						</Typography>
						<div className="text-muted-foreground flex items-center gap-2">
							<Globe2 className="size-4" />
							<Typography variant="caption">{pagination.totalElements} recurso(s) publico(s)</Typography>
						</div>
					</div>
				</div>
			</section>

			<section className="w-full">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 md:px-10 lg:px-20">
					<div className="bg-background flex flex-col gap-4 rounded-lg border p-4">
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Buscar por nome, tag ou descricao"
							iconLeft={<Search className="size-4" />}
						/>
						<div className="flex flex-wrap gap-2">
							{assetKinds.map((item) => {
								const active = item.value === type || (!item.value && !type);

								return (
									<Button
										key={item.label}
										type="button"
										variant={active ? "default" : "outline"}
										size="sm"
										onClick={() => setType(item.value)}
									>
										{item.label}
									</Button>
								);
							})}
						</div>
					</div>

					{isLoading ? (
						<AssetSkeleton />
					) : isError ? (
						<ErrorState
							title="Nao foi possivel carregar o Explore"
							message="Tente novamente em alguns instantes."
							onRetry={() => refetch()}
						/>
					) : data.length === 0 ? (
						<EmptyState
							icon={Search}
							title="Nenhum recurso encontrado"
							message="Ajuste a busca ou escolha outro tipo de recurso."
						/>
					) : (
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{data.map((asset) => (
								<AssetCard
									key={asset.id}
									asset={asset}
									isAuthenticated={!!user && !isInitializing}
									onImport={handleImport}
									isImporting={importAsset.isPending && importAsset.variables === asset.id}
								/>
							))}
						</div>
					)}

					<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
						<Typography variant="caption" className="text-muted-foreground">
							Pagina {pagination.totalPages === 0 ? 0 : pagination.page + 1} de {pagination.totalPages}
						</Typography>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={pagination.page <= 0}
								onClick={() => updatePagination({ page: Math.max(pagination.page - 1, 0) })}
							>
								<ChevronLeft />
								Anterior
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={pagination.page + 1 >= pagination.totalPages}
								onClick={() => updatePagination({ page: pagination.page + 1 })}
							>
								Proxima
								<ChevronRight />
							</Button>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
};

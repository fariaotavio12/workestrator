import { usePaginatedData } from "@/app/hooks/usePaginatedData";
import { Rotas } from "@/app/routing/variables";
import {
	Badge,
	Button,
	Card,
	CardContent,
	EmptyState,
	ErrorState,
	PageHeader,
	Skeleton,
	Typography,
} from "@/components";
import {
	useMyExploreAssetsQuery,
	usePublishExploreAsset,
	useUnpublishExploreAsset,
	type ExploreAsset,
	type ExploreAssetFilter,
	type ExploreAssetKind,
} from "@/features/public/explore/api";
import { Boxes, Command, Globe2, Library, Lock, Plug, Search, Sparkles, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";

const kindLabel: Record<ExploreAssetKind, string> = {
	SQUAD: "Squad",
	SKILL: "Skill",
	KNOWLEDGE: "Conhecimento",
	SCRIPT: "Script",
	COMMAND: "Comando",
	MCP: "MCP",
};

const kindIcon: Record<ExploreAssetKind, typeof Sparkles> = {
	SQUAD: Boxes,
	SKILL: Sparkles,
	KNOWLEDGE: Library,
	SCRIPT: Terminal,
	COMMAND: Command,
	MCP: Plug,
};

const AssetSkeleton = () => (
	<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
		{[0, 1, 2].map((item) => (
			<Card key={item} size="sm">
				<CardContent className="flex flex-col gap-4">
					<Skeleton className="size-10 rounded-lg" />
					<Skeleton className="h-5 w-44" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-9 w-full rounded-lg" />
				</CardContent>
			</Card>
		))}
	</div>
);

const AssetCard = ({
	asset,
	onPublish,
	onUnpublish,
	isMutating,
}: {
	asset: ExploreAsset;
	onPublish: (id: string) => void;
	onUnpublish: (id: string) => void;
	isMutating: boolean;
}) => {
	const Icon = kindIcon[asset.kind];
	const isPublic = asset.visibility === "PUBLIC";

	return (
		<Card size="sm" className="min-h-64">
			<CardContent className="flex h-full flex-col gap-4">
				<div className="flex items-start justify-between gap-3">
					<div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border">
						<Icon className="size-5" />
					</div>
					<div className="flex flex-wrap justify-end gap-2">
						<Badge variant="outline">{kindLabel[asset.kind]}</Badge>
						<Badge variant={isPublic ? "secondary" : "outline"}>
							{isPublic ? <Globe2 className="size-3" /> : <Lock className="size-3" />}
							{isPublic ? "Público" : "Privado"}
						</Badge>
					</div>
				</div>

				<div className="flex flex-1 flex-col gap-2">
					<Typography variant="title-sm">{asset.title}</Typography>
					<Typography variant="body-sm" className="text-muted-foreground line-clamp-3">
						{asset.description}
					</Typography>
				</div>

				<div className="flex flex-wrap gap-2">
					{asset.tags.slice(0, 4).map((tag) => (
						<Badge key={tag} variant="outline" className="px-2 py-1">
							{tag}
						</Badge>
					))}
				</div>

				<div className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
					<Typography variant="caption" className="text-muted-foreground">
						{asset.originAssetId ? "Importado" : "Criado por você"}
					</Typography>
					<Button
						type="button"
						variant={isPublic ? "outline" : "default"}
						size="sm"
						disabled={isMutating}
						onClick={() => (isPublic ? onUnpublish(asset.id) : onPublish(asset.id))}
					>
						{isPublic ? "Despublicar" : "Publicar"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};

export const PageCommunityAssets = () => {
	const navigate = useNavigate();
	const publishAsset = usePublishExploreAsset();
	const unpublishAsset = useUnpublishExploreAsset();
	const { data, isLoading, isError, refetch, pagination, updatePagination } = usePaginatedData<
		ExploreAsset,
		ExploreAssetFilter
	>({
		query: useMyExploreAssetsQuery,
		filter: {},
		storageKey: "myExploreAssetsPagination",
	});

	const isMutating = publishAsset.isPending || unpublishAsset.isPending;

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				eyebrow="Comunidade"
				title="Meus recursos"
				description="Recursos importados, criados ou publicados no Explore. Publique quando quiser compartilhar com a comunidade."
				actions={
					<div className="flex gap-2">
						<Button type="button" variant="outline" onClick={() => navigate(Rotas.desprotegidas.landingPages.explore)}>
							<Search />
							Explorar
						</Button>
						<Button type="button" onClick={() => navigate(Rotas.protegidas.orchestrator.skills)}>
							<Sparkles />
							Criar skill
						</Button>
					</div>
				}
			/>

			<section className="flex flex-col gap-4 px-4">
				{isLoading ? (
					<AssetSkeleton />
				) : isError ? (
					<ErrorState
						title="Não foi possível carregar seus recursos"
						message="Tente novamente em alguns instantes."
						onRetry={() => refetch()}
					/>
				) : data.length === 0 ? (
					<EmptyState
						icon={Library}
						title="Nenhum recurso salvo"
						message="Importe recursos do Explore ou crie uma skill para começar sua biblioteca."
						actionLabel="Explorar recursos"
						onAction={() => navigate(Rotas.desprotegidas.landingPages.explore)}
					/>
				) : (
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{data.map((asset) => (
							<AssetCard
								key={asset.id}
								asset={asset}
								onPublish={(id) => publishAsset.mutate(id)}
								onUnpublish={(id) => unpublishAsset.mutate(id)}
								isMutating={isMutating}
							/>
						))}
					</div>
				)}

				<div className="flex items-center justify-between border-t pt-4">
					<Typography variant="caption" className="text-muted-foreground">
						Página {pagination.totalPages === 0 ? 0 : pagination.page + 1} de {pagination.totalPages}
					</Typography>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={pagination.page <= 0}
							onClick={() => updatePagination({ page: Math.max(pagination.page - 1, 0) })}
						>
							Anterior
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={pagination.page + 1 >= pagination.totalPages}
							onClick={() => updatePagination({ page: pagination.page + 1 })}
						>
							Próxima
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
};

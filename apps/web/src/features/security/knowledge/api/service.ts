import { api } from "@/app/api/clients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { knowledgeKeys } from "./keys";
import type { ChunkSearchResult, CollectionPayload, KnowledgeCollection, KnowledgeDocument } from "./types";

// --- Collections ---

export const fetchCollections = async (): Promise<KnowledgeCollection[]> => {
	const { data } = await api.get<KnowledgeCollection[]>("/knowledge");
	return data;
};

export const useCollectionsQuery = () => useQuery({ queryKey: knowledgeKeys.collections(), queryFn: fetchCollections });

const useInvalidateCollections = () => {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: knowledgeKeys.collections() });
};

/** Criação de coleção chamável fora de componente React (o runtime do treinamento não é React). */
export const createCollectionApi = async (payload: CollectionPayload): Promise<KnowledgeCollection> => {
	const { data } = await api.post<KnowledgeCollection>("/knowledge", payload);
	return data;
};

export const useCreateCollection = () => {
	const invalidate = useInvalidateCollections();
	return useMutation({ mutationFn: createCollectionApi, onSuccess: invalidate });
};

export const useUpdateCollection = () => {
	const invalidate = useInvalidateCollections();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: Partial<CollectionPayload> }) =>
			api.put<KnowledgeCollection>(`/knowledge/${id}`, payload).then((r) => r.data),
		onSuccess: invalidate,
	});
};

export const useDeleteCollection = () => {
	const invalidate = useInvalidateCollections();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/knowledge/${id}`),
		onSuccess: invalidate,
	});
};

// --- Documents ---

export const fetchDocuments = async (collectionId: string): Promise<KnowledgeDocument[]> => {
	const { data } = await api.get<KnowledgeDocument[]>(`/knowledge/${collectionId}/documents`);
	return data;
};

/** Enquanto houver documento em ingestão (`pending`/`processing`), refaz o fetch a cada 3s. */
export const useDocumentsQuery = (collectionId: string) =>
	useQuery({
		queryKey: knowledgeKeys.documents(collectionId),
		queryFn: () => fetchDocuments(collectionId),
		enabled: Boolean(collectionId),
		refetchInterval: (query) => {
			const docs = query.state.data as KnowledgeDocument[] | undefined;
			const processing = docs?.some((doc) => doc.status === "pending" || doc.status === "processing");
			return processing ? 3000 : false;
		},
	});

/** Upload chamável fora de componente React (o runtime do treinamento sintetiza o `.md` da lição). */
export const uploadKnowledgeDocumentApi = async (collectionId: string, file: File): Promise<KnowledgeDocument> => {
	const form = new FormData();
	form.append("file", file);
	const { data } = await api.post<KnowledgeDocument>(`/knowledge/${collectionId}/documents`, form);
	return data;
};

export const useUploadDocument = (collectionId: string) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (file: File) => uploadKnowledgeDocumentApi(collectionId, file),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: knowledgeKeys.documents(collectionId) });
			queryClient.invalidateQueries({ queryKey: knowledgeKeys.collections() });
		},
	});
};

export const useDeleteDocument = (collectionId: string) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (documentId: string) => api.delete(`/knowledge/${collectionId}/documents/${documentId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: knowledgeKeys.documents(collectionId) });
			queryClient.invalidateQueries({ queryKey: knowledgeKeys.collections() });
		},
	});
};

// --- Search (usado fora de componente React, pelo runtime do orquestrador) ---

/** Busca top-K trechos relevantes nas coleções indicadas. Retorna [] em qualquer falha (RAG é best-effort). */
/** `topK` é **por coleção** (o backend particiona por base), não o total devolvido. */
export const searchKnowledgeMulti = async (
	collectionIds: string[],
	query: string,
	topK = 5,
	minScore = 0.2,
): Promise<ChunkSearchResult[]> => {
	if (collectionIds.length === 0 || !query.trim()) return [];
	const { data } = await api.post<ChunkSearchResult[]>("/knowledge/search", {
		collectionIds,
		query,
		topK,
		minScore,
	});
	return data;
};

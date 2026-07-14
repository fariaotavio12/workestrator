export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export type KnowledgeCollection = {
	id: string;
	name: string;
	description?: string | null;
	documentCount: number;
	createdAt: string;
	updatedAt: string;
};

export type KnowledgeDocument = {
	id: string;
	collectionId: string;
	filename: string;
	mimeType?: string | null;
	sizeBytes: number;
	r2Url?: string | null;
	status: DocumentStatus;
	errorMessage?: string | null;
	chunkCount: number;
	createdAt: string;
	updatedAt: string;
};

export type CollectionPayload = {
	name: string;
	description?: string;
};

/** Um trecho recuperado numa busca por similaridade — usado na injeção de contexto do run. */
export type ChunkSearchResult = {
	chunkId: string;
	documentId: string;
	filename: string;
	content: string;
	score: number;
};

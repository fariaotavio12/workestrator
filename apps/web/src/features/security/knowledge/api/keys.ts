export const knowledgeKeys = {
	all: ["knowledge"] as const,
	collections: () => [...knowledgeKeys.all, "collections"] as const,
	documents: (collectionId: string) => [...knowledgeKeys.all, "documents", collectionId] as const,
};

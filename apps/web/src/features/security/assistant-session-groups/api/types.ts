export type AssistantSessionGroup = {
	id: string;
	name: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type CreateAssistantSessionGroupPayload = {
	name: string;
	sortOrder?: number;
};

export type UpdateAssistantSessionGroupPayload = Partial<CreateAssistantSessionGroupPayload>;

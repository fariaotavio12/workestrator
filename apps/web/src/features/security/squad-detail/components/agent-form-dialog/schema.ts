import { z } from "zod";

export const agentFormSchema = z.object({
	name: z.string().min(1, "Nome e obrigatorio"),
	role: z.string().min(1, "Papel e obrigatorio"),
	providerId: z.string().min(1, "Selecione um provider"),
	model: z.string().min(1, "Selecione um modelo"),
	systemPrompt: z.string().min(1, "Descreva o que o agent faz"),
	character: z.string().min(1),
	accentColor: z.string().min(1),
});

export type AgentFormValues = z.infer<typeof agentFormSchema>;

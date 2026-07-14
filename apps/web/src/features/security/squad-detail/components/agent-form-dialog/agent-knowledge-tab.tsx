import { MultiCombobox, Typography } from "@/components";
import type { KnowledgeCollection } from "@/features/security/knowledge/api";
import { Library } from "lucide-react";

type Props = {
	collections: KnowledgeCollection[];
	knowledgeCollectionIds: string[];
	setKnowledgeCollectionIds: (value: string[]) => void;
};

export const AgentKnowledgeTab = ({ collections, knowledgeCollectionIds, setKnowledgeCollectionIds }: Props) => (
	<section className="flex flex-col gap-3">
		<div className="flex items-center gap-2">
			<Library className="text-muted-foreground size-4" />
			<Typography variant="title-sm">Bases de conhecimento (RAG)</Typography>
		</div>
		<Typography variant="body-sm" className="text-muted-foreground">
			O agent recupera trechos relevantes destas bases e os injeta no contexto a cada passo. Vazio = sem RAG.
			Gerencie as bases em Conhecimento.
		</Typography>
		<MultiCombobox<KnowledgeCollection>
			options={collections}
			getOptionKey={(collection) => collection.id}
			getOptionLabel={(collection) => collection.name}
			values={collections.filter((collection) => knowledgeCollectionIds.includes(collection.id))}
			onChange={(next) => setKnowledgeCollectionIds(next.map((collection) => collection.id))}
			placeholder="Selecione uma ou mais bases"
			showCheckBoxes
			showClearAllOption
		/>
	</section>
);

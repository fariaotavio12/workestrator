import { ScriptWizard } from "@/features/security/scripts/components/script-wizard";
import type { Script } from "@/features/security/orchestrator-shared/types";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Quando presente, o formulário edita a ferramenta; senão, cria uma nova. */
	script?: Script;
	/** Conteúdo pré-preenchido (ex.: "Salvar como ferramenta" a partir de uma saída de run). */
	prefill?: { name?: string; content?: string };
	/** Chamado com a ferramenta criada/atualizada após salvar — permite o chamador anexá-la em algo (ex.: um agent). */
	onSaved?: (script: Script) => void;
};

/**
 * Casca fina — o formulário em si é o wizard guiado (catálogo de integrações → configurar →
 * autenticar), ver `docs/plano-redesign-scripts-wizard.md`. Mantido como componente próprio (em vez
 * de importar `ScriptWizard` direto nos call sites) só pra preservar o caminho de import existente
 * (`@/components/orchestrator`) sem precisar tocar em `page-scripts.tsx`/`agent-form-dialog.tsx`.
 */
export const ScriptFormDialog = ({ open, onOpenChange, script, prefill, onSaved }: Props) => (
	<ScriptWizard open={open} onOpenChange={onOpenChange} script={script} prefill={prefill} onSaved={onSaved} />
);

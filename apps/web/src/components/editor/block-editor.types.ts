export type BlockEditorProps = {
	/** Conteúdo em markdown (derivado / compat / fallback legado). */
	value?: string;
	/** Conteúdo rico (JSON dos blocos do editor); fonte de verdade quando presente. */
	valueRich?: string | null;
	editable?: boolean;
	/** Emite o markdown derivado a cada alteração. */
	onChange?: (value: string) => void;
	/** Emite o JSON rico (JSON.stringify dos blocos) a cada alteração. */
	onChangeRich?: (valueRich: string) => void;
	/**
	 * Chamado quando um bloco de anexo é removido do conteúdo pelo usuário (o id
	 * do anexo é extraído da URL do bloco). Permite excluir o anexo correspondente.
	 */
	onAttachmentRemoved?: (attachmentId: number) => void;
	/**
	 * Função de upload injetada. Recebe o arquivo e devolve a URL (e nome) do
	 * recurso enviado. Quando ausente, o upload via drag/paste/toolbar é desabilitado.
	 * @param file Arquivo a enviar.
	 * @returns URL como string ou objeto `{ url, name }`.
	 */
	uploadFile?: (file: File) => Promise<{ url: string; name: string } | string>;
};

/** Handle imperativo do editor, exposto via ref. */
export type BlockEditorHandle = {
	/** Remove do conteúdo o(s) bloco(s) que referenciam o anexo informado. */
	removeAttachmentBlock: (attachmentId: number) => void;
};

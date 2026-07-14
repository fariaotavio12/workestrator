export type SkillTemplate = {
	id: string;
	name: string;
	description: string;
	tags: string[];
	visibility: "private" | "public";
	content: string;
};

export const skillTemplates: SkillTemplate[] = [
	{
		id: "skill-builder",
		name: "Skill Builder",
		description: "Ajuda a transformar uma rotina repetivel em uma skill clara e reutilizavel.",
		tags: ["skill", "authoring"],
		visibility: "private",
		content: `# Skill Builder

## Objetivo

Transformar uma rotina repetivel em uma skill reutilizavel no Workestrator.

## Quando usar

- Quando o usuario quiser criar uma skill nova.
- Quando existir um processo recorrente que precisa de checklist.
- Quando uma tarefa precisar ser compartilhada com a comunidade.

## Passos

1. Entender objetivo, entradas e resultado esperado.
2. Definir gatilhos de uso.
3. Criar passos claros e verificaveis.
4. Adicionar exemplos de prompt.
5. Definir checklist de qualidade.

## Checklist

- [ ] A skill tem objetivo claro.
- [ ] Os gatilhos sao objetivos.
- [ ] Os passos podem ser executados por outro assistente.
- [ ] Existem criterios de pronto.
`,
	},
	{
		id: "release-review",
		name: "Release Review",
		description: "Revisa um pacote de mudancas antes de publicar em dev ou producao.",
		tags: ["release", "review"],
		visibility: "private",
		content: `# Release Review

## Objetivo

Revisar uma mudanca antes de publicar.

## Entradas

- Branch
- Diff
- Checks locais
- Ambiente alvo

## Passos

1. Conferir escopo do diff.
2. Identificar risco de regressao.
3. Rodar validacoes relevantes.
4. Preparar resumo de release.
5. Confirmar plano de rollback quando necessario.
`,
	},
	{
		id: "community-import",
		name: "Community Import",
		description: "Avalia se um recurso publico pode ser importado com seguranca.",
		tags: ["community", "explore"],
		visibility: "public",
		content: `# Community Import

## Objetivo

Avaliar e importar recursos publicos do Explore.

## Passos

1. Ler descricao, tags e autor.
2. Verificar permissoes solicitadas.
3. Identificar dependencias externas.
4. Importar como copia privada por padrao.
5. Registrar origem e versao importada.
`,
	},
];

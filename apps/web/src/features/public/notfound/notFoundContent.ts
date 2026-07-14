/**
 * Conteúdo centralizado da Página NotFound
 * Todas as escritas utilizadas no componente PageNotFound
 */

export const notFoundContent = {
	error: {
		code: "404",
		title: "Página não encontrada",
		description:
			"A página que você procura não existe ou foi movida. Não se preocupe, vamos ajudá-lo a encontrar o caminho certo.",
	},

	suggestions: [
		{
			title: "Verifique a URL",
			description: "Certifique-se de que o endereço foi digitado corretamente.",
			icon: "link",
		},
		{
			title: "Volte ao início",
			description: "Retorne para a página inicial e comece novamente.",
			icon: "home",
		},
		{
			title: "Entre em contato",
			description: "Se o problema persistir, entre em contato com nosso suporte.",
			icon: "support",
		},
	],

	cta: {
		backButton: {
			label: "Voltar",
			description: "Retornar à página anterior",
		},
		homeButton: {
			label: "Ir para Início",
			description: "Voltar à página inicial",
		},
		contactButton: {
			label: "Falar com Suporte",
			description: "Contate nosso time de suporte",
		},
	},

	hint: "Dica: Use o menu de navegação para encontrar o que procura.",
};

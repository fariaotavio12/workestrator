// Catálogo de templates do wizard de ferramentas — data-driven: adicionar uma integração nova é
// adicionar 1 objeto aqui, sem tocar no resto do wizard. `kind`/`defaults` mapeiam pro modelo de
// dados `Script` já existente (nenhuma migração); o wizard só monta a UI em cima dele.
import type { ConnectorProvider, HttpMethod, McpTransport, ScriptKind } from "../../orchestrator-shared/types";
import { Bot, FileText, Github, Globe, Instagram, Server, Slack, Terminal, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Forma "achatada" do formulário do wizard — headers/env/config viram `Record` (KeyValueEditor), não JSON cru. */
export type ScriptFormValues = {
	name: string;
	description: string;
	kind: ScriptKind;
	command: string;
	args: string;
	language: "bash" | "node" | "python";
	content: string;
	path: string;
	method: HttpMethod;
	urlTemplate: string;
	headers: Record<string, string>;
	bodySchema: string;
	responseMap: string;
	transport: McpTransport;
	url: string;
	env: Record<string, string>;
	toolAllowlist: string;
	connectorProvider: ConnectorProvider;
	configRecord: Record<string, string>;
	authRef: string;
};

export const EMPTY_SCRIPT_FORM_VALUES: ScriptFormValues = {
	name: "",
	description: "",
	kind: "command",
	command: "",
	args: "",
	language: "bash",
	content: "",
	path: "",
	method: "GET",
	urlTemplate: "",
	headers: {},
	bodySchema: "",
	responseMap: "",
	transport: "stdio",
	url: "",
	env: {},
	toolAllowlist: "",
	connectorProvider: "composio",
	configRecord: {},
	authRef: "",
};

export type ToolTemplateHelp = {
	/** Legenda extra mostrada no fim do passo "Configurar" — para avisos específicos do template. */
	note?: string;
};

export type ToolTemplate = {
	id: string;
	label: string;
	description: string;
	icon: LucideIcon;
	category: "ready" | "scratch";
	featured?: boolean;
	/** `kind` técnico que este template resolve — o usuário nunca escolhe isso diretamente. */
	kind: ScriptKind;
	defaults: Partial<ScriptFormValues>;
	/** Controla se o passo "Autenticar" aparece no wizard. */
	requiresAuth: boolean;
	help?: ToolTemplateHelp;
};

export const TOOL_TEMPLATES: ToolTemplate[] = [
	{
		id: "youtube",
		label: "YouTube",
		description: "Legendas, metadados e busca de vídeos",
		icon: Youtube,
		category: "ready",
		featured: true,
		kind: "connector",
		defaults: { connectorProvider: "youtube" },
		requiresAuth: false,
		help: {
			note:
				'Roda 100% local via "yt-dlp" (precisa estar no PATH da máquina do runner). O modo "oficial" ' +
				"(Data API v3) é opcional e configurado por variável de ambiente do app, não por aqui.",
		},
	},
	{
		id: "instagram-publisher",
		label: "Instagram Publisher",
		description: "Publicar carrossel aprovado no Instagram Business",
		icon: Instagram,
		category: "ready",
		featured: true,
		kind: "connector",
		defaults: {
			connectorProvider: "instagram",
			name: "Instagram Publisher",
			description: "Valida e publica carrossel no Instagram Business via Graph API.",
			toolAllowlist: "publish_carousel",
			env: {
				IMGBB_API_KEY: "$imgbb-api-key",
			},
		},
		requiresAuth: true,
		help: {
			note:
				"Conecte uma conta Instagram Business/Creator em Conexões e escolha essa conta no agente que usar a ferramenta. " +
				"Configure apenas o storage de mídia e rode primeiro com dryRun:true.",
		},
	},
	{
		id: "github",
		label: "GitHub",
		description: "Issues, PRs e repositórios",
		icon: Github,
		category: "ready",
		kind: "mcp",
		defaults: { transport: "stdio", command: "npx", args: "-y @modelcontextprotocol/server-github" },
		requiresAuth: true,
		help: {
			note:
				'Esse servidor espera a variável "GITHUB_PERSONAL_ACCESS_TOKEN". Depois de escolher o segredo, ' +
				'adicione essa chave nas "Variáveis de ambiente" com o valor "$<referência do segredo>".',
		},
	},
	{
		id: "slack",
		label: "Slack",
		description: "Enviar e ler mensagens",
		icon: Slack,
		category: "ready",
		kind: "mcp",
		defaults: { transport: "stdio", command: "npx", args: "-y @modelcontextprotocol/server-slack" },
		requiresAuth: true,
		help: {
			note:
				'Esse servidor espera variáveis como "SLACK_BOT_TOKEN". Depois de escolher o segredo, adicione ' +
				'essa chave nas "Variáveis de ambiente" com o valor "$<referência do segredo>".',
		},
	},
	{
		id: "http-generic",
		label: "API HTTP",
		description: "Qualquer endpoint REST seu",
		icon: Globe,
		category: "ready",
		kind: "http",
		defaults: { method: "GET" },
		requiresAuth: true,
	},
	{
		id: "command",
		label: "Comando local",
		description: "npm, git, python…",
		icon: Terminal,
		category: "scratch",
		kind: "command",
		defaults: {},
		requiresAuth: false,
	},
	{
		id: "inline",
		label: "Código inline",
		description: "Bash, Node ou Python",
		icon: Bot,
		category: "scratch",
		kind: "inline",
		defaults: { language: "bash" },
		requiresAuth: false,
	},
	{
		id: "mcp-server",
		label: "Servidor MCP avançado",
		description: "Exponha tools de um servidor local ou remoto",
		icon: Server,
		category: "scratch",
		kind: "mcp",
		defaults: { transport: "stdio" },
		requiresAuth: true,
	},
	{
		id: "file",
		label: "Arquivo",
		description: "Lido ao vivo da máquina do runner",
		icon: FileText,
		category: "scratch",
		kind: "file",
		defaults: {},
		requiresAuth: false,
	},
];

export const findTemplateById = (id: string): ToolTemplate | undefined => TOOL_TEMPLATES.find((t) => t.id === id);

/** Ao editar uma ferramenta existente, infere o template mais próximo a partir do `kind` salvo — usado
 * só pra decidir em qual "família" de campos o wizard abre; os valores reais vêm do próprio script. */
export const inferTemplateFromKind = (kind: ScriptKind): ToolTemplate =>
	TOOL_TEMPLATES.find((t) => t.kind === kind && t.category === "scratch") ??
	TOOL_TEMPLATES.find((t) => t.kind === kind) ??
	TOOL_TEMPLATES[0];

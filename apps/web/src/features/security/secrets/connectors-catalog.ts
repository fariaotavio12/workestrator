import type { SecretAuthType } from "@/features/security/orchestrator-shared/types";
import type { ConnectorResponse } from "@/features/security/secrets/api";
import {
	Bot,
	Building2,
	Camera,
	CheckSquare,
	Cloud,
	Github,
	Kanban,
	LayoutGrid,
	ListTodo,
	Mail,
	Megaphone,
	MessageCircle,
	MessagesSquare,
	Music2,
	NotebookText,
	Video,
	Webhook,
	type LucideIcon,
} from "lucide-react";

/**
 * Preset de conector — pré-preenche o `SecretFormDialog` (authType/tokenUrl/scopes) pra o usuário não
 * digitar URL de token de cabeça. `id` vira `Secret.connectorId` quando um secret é criado a partir
 * dele, usado só pra a UI mapear o status de conexão de volta pro card do catálogo.
 */
export type ConnectorPreset = {
	id: string;
	name: string;
	description: string;
	icon: LucideIcon;
	/** Classe Tailwind do chip de ícone do card — cor de marca aproximada, sem depender de logo externo. */
	colorClassName: string;
	authType: SecretAuthType;
	tokenUrl?: string;
	defaultScopes?: string;
	/**
	 * Endpoint de autorização do provider — presente só nos que suportam o fluxo `authorization_code`
	 * + PKCE via loopback (RFC 8252) disparado pelo botão "Conectar". Ausente = fluxo manual (o usuário
	 * cola o token direto no `SecretFormDialog`), único caminho viável pra credenciais que não são um
	 * OAuth público de verdade (PAT do GitHub, integration token do Notion, key do Composio).
	 */
	authUrl?: string;
};

type Presentation = { description: string; icon: LucideIcon; colorClassName: string };

/**
 * Apresentação visual (ícone/cor/copy) por preset — só isso mora no front. O backend (`GET
 * /connectors`, ver docs/plano-oauth-backend-token-lifecycle.md) manda só dado funcional
 * (authUrl/tokenUrl/authType/scopes). Um provider novo cadastrado só no `OAuthProviderCatalog` do
 * backend ainda aparece aqui — só que com `DEFAULT_PRESENTATION` até ganhar uma entrada nesta tabela.
 */
const PRESENTATION_BY_ID: Record<string, Presentation> = {
	google: {
		description: "Sheets, Gmail, Calendar e outras APIs do Google via OAuth2.",
		icon: Mail,
		colorClassName: "bg-red-500/10 text-red-600",
	},
	slack: {
		description: "Envio de mensagens e leitura de canais via Slack API.",
		icon: MessagesSquare,
		colorClassName: "bg-violet/10 text-violet",
	},
	notion: {
		description: "Leitura e escrita de páginas/databases do Notion.",
		icon: NotebookText,
		colorClassName: "bg-foreground/10 text-foreground",
	},
	github: {
		description: "Repositórios, issues e pull requests via GitHub API.",
		icon: Github,
		colorClassName: "bg-foreground/10 text-foreground",
	},
	composio: {
		description: "Gateway MCP com centenas de ferramentas prontas (Composio).",
		icon: Bot,
		colorClassName: "bg-info/10 text-info",
	},
	microsoft: {
		description: "Outlook, Teams, OneDrive e outras APIs da Microsoft via OAuth2.",
		icon: LayoutGrid,
		colorClassName: "bg-blue-500/10 text-blue-600",
	},
	atlassian: {
		description: "Jira e Confluence via OAuth2.",
		icon: Kanban,
		colorClassName: "bg-blue-500/10 text-blue-600",
	},
	discord: {
		description: "Envio de mensagens e leitura de canais via Discord API.",
		icon: MessageCircle,
		colorClassName: "bg-indigo-500/10 text-indigo-600",
	},
	dropbox: {
		description: "Armazenamento e arquivos via Dropbox API.",
		icon: Cloud,
		colorClassName: "bg-blue-500/10 text-blue-600",
	},
	hubspot: {
		description: "CRM e marketing via HubSpot API.",
		icon: Megaphone,
		colorClassName: "bg-orange-500/10 text-orange-600",
	},
	linear: {
		description: "Issues e projetos via Linear API.",
		icon: ListTodo,
		colorClassName: "bg-violet/10 text-violet",
	},
	asana: {
		description: "Tarefas e projetos via Asana API.",
		icon: CheckSquare,
		colorClassName: "bg-red-500/10 text-red-600",
	},
	salesforce: {
		description: "CRM via Salesforce API.",
		icon: Building2,
		colorClassName: "bg-blue-500/10 text-blue-600",
	},
	spotify: {
		description: "Playlists e player via Spotify API.",
		icon: Music2,
		colorClassName: "bg-green-500/10 text-green-600",
	},
	zoom: {
		description: "Reuniões e gravações via Zoom API.",
		icon: Video,
		colorClassName: "bg-blue-500/10 text-blue-600",
	},
	instagram: {
		description: "Perfil, mídia e publicação via Instagram API.",
		icon: Camera,
		colorClassName: "bg-pink-500/10 text-pink-600",
	},
	custom: {
		description: "Configure manualmente qualquer esquema de autenticação.",
		icon: Webhook,
		colorClassName: "bg-muted text-muted-foreground",
	},
};

const DEFAULT_PRESENTATION: Presentation = { description: "", icon: Webhook, colorClassName: "bg-muted text-muted-foreground" };

/** Converte o preset funcional do backend (`GET /connectors`) num `ConnectorPreset` completo pra UI. */
export const toConnectorPreset = (connector: ConnectorResponse): ConnectorPreset => {
	const presentation = PRESENTATION_BY_ID[connector.id] ?? DEFAULT_PRESENTATION;
	return {
		id: connector.id,
		name: connector.displayName,
		description: presentation.description,
		icon: presentation.icon,
		colorClassName: presentation.colorClassName,
		authType: connector.authType,
		tokenUrl: connector.tokenUrl,
		defaultScopes: connector.defaultScopes,
		authUrl: connector.authUrl,
	};
};

/**
 * Fallback estático — usado só enquanto `useConnectorsCatalogQuery` carrega ou se o backend falhar/
 * for uma versão antiga sem o endpoint `/connectors`. Mesmo conteúdo funcional de antes da Fase 4.
 */
export const CONNECTOR_CATALOG: ConnectorPreset[] = [
	{ id: "google", name: "Google", authType: "oauth2_refresh", authUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token", defaultScopes: "https://www.googleapis.com/auth/spreadsheets", ...PRESENTATION_BY_ID.google },
	{ id: "slack", name: "Slack", authType: "oauth2_refresh", authUrl: "https://slack.com/oauth/v2/authorize", tokenUrl: "https://slack.com/api/oauth.v2.access", ...PRESENTATION_BY_ID.slack },
	{ id: "instagram", name: "Instagram", authType: "oauth2_refresh", authUrl: "https://www.instagram.com/oauth/authorize", tokenUrl: "https://api.instagram.com/oauth/access_token", defaultScopes: "instagram_business_basic instagram_business_content_publish", ...PRESENTATION_BY_ID.instagram },
	{ id: "notion", name: "Notion", authType: "bearer", ...PRESENTATION_BY_ID.notion },
	{ id: "github", name: "GitHub", authType: "bearer", ...PRESENTATION_BY_ID.github },
	{ id: "composio", name: "Composio", authType: "header", ...PRESENTATION_BY_ID.composio },
	{ id: "custom", name: "Personalizado", authType: "bearer", ...PRESENTATION_BY_ID.custom },
];

import type { SecretAuthType } from "@/features/security/orchestrator-shared/types";
import { Braces, Hash, KeyRound, Link2, RefreshCw, RotateCw, UserRoundCheck } from "lucide-react";

export const AUTH_TYPE_LABEL: Record<SecretAuthType, string> = {
	bearer: "Bearer",
	header: "Header customizado",
	query: "Query param",
	basic: "Basic auth",
	oauth2_client_credentials: "OAuth2 - client credentials",
	oauth2_refresh: "OAuth2 - refresh token",
	raw: "Placeholder manual",
};

export const AUTH_TYPE_HINT: Record<SecretAuthType, string> = {
	bearer: "Authorization: Bearer <valor>",
	header: "Ex.: x-api-key",
	query: "Ex.: ?key=<valor>",
	basic: "Usuário + senha",
	oauth2_client_credentials: "Token trocado por client_id + secret",
	oauth2_refresh: "Token renovado por refresh token",
	raw: "$id em headers/env",
};

export const AUTH_TYPE_ICON: Record<SecretAuthType, typeof KeyRound> = {
	bearer: KeyRound,
	header: Hash,
	query: Link2,
	basic: UserRoundCheck,
	oauth2_client_credentials: RefreshCw,
	oauth2_refresh: RotateCw,
	raw: Braces,
};

export const AUTH_TYPES = Object.keys(AUTH_TYPE_LABEL) as SecretAuthType[];

export const VALUE_LABEL: Record<SecretAuthType, string> = {
	bearer: "Valor real (token)",
	header: "Valor real",
	query: "Valor real",
	basic: "Senha",
	oauth2_client_credentials: "Client secret",
	oauth2_refresh: "Refresh token",
	raw: "Valor real",
};

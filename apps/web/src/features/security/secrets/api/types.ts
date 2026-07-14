import type { SecretAuthType } from "@/features/security/orchestrator-shared/types";

export type CreateSecretPayload = {
	label: string;
	authType: SecretAuthType;
	metadata?: Record<string, string>;
	/** Valor real da credencial — cifrado no backend, nunca devolvido depois. */
	value: string;
	/** Id do preset do catálogo de conectores que originou este secret (ex.: "google"). */
	connectorId?: string;
};

export type UpdateSecretPayload = {
	label: string;
	authType: SecretAuthType;
	metadata?: Record<string, string>;
	connectorId?: string;
};

export type UpdateSecretValuePayload = {
	value: string;
};

/** `GET /connectors` — catálogo declarativo de plataformas OAuth do backend (`OAuthProviderCatalog`). */
export type ConnectorResponse = {
	id: string;
	displayName: string;
	iconKey: string;
	authType: SecretAuthType;
	authUrl?: string;
	tokenUrl?: string;
	defaultScopes?: string;
};

import type { SecretFormValues } from "./schema";

export const toMetadata = (values: SecretFormValues): Record<string, string> | undefined => {
	const entries: [string, string][] = [];
	if (values.authType === "header") {
		if (values.headerName?.trim()) entries.push(["headerName", values.headerName.trim()]);
		if (values.valuePrefix?.trim()) entries.push(["valuePrefix", values.valuePrefix.trim()]);
	}
	if (values.authType === "query" && values.queryParam?.trim()) entries.push(["queryParam", values.queryParam.trim()]);
	if (values.authType === "basic" && values.basicUsername?.trim())
		entries.push(["basicUsername", values.basicUsername.trim()]);
	if (values.authType.startsWith("oauth2")) {
		if (values.tokenUrl?.trim()) entries.push(["tokenUrl", values.tokenUrl.trim()]);
		if (values.clientId?.trim()) entries.push(["clientId", values.clientId.trim()]);
		if (values.scopes?.trim()) entries.push(["scopes", values.scopes.trim()]);
	}
	return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const toValue = (values: SecretFormValues): string => {
	const raw = values.value?.trim() ?? "";
	if (values.authType === "basic") return JSON.stringify({ password: raw });
	if (values.authType === "oauth2_client_credentials") return JSON.stringify({ clientSecret: raw });
	if (values.authType === "oauth2_refresh") return JSON.stringify({ refreshToken: raw });
	return raw;
};

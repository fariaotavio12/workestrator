// Tipos de `oauth1.mjs` pra quem importa direto de TS (`openai-tools.ts`, bundlado por esbuild —
// ver `scripts/build-electron.mjs`). O runtime é plain JS de propósito (D11/D12: roda sem passo de
// build, igual aos demais arquivos de `mcp-servers/`); este arquivo só existe pro type-checking.
export type OAuth1Credentials = {
	consumerKey: string;
	consumerSecret: string;
	token?: string;
	tokenSecret?: string;
	signatureMethod: string;
	realm?: string;
};

export declare function authorizationHeader(
	method: string,
	url: string,
	credentials: OAuth1Credentials,
	additionalParams?: Record<string, string>,
	nonce?: string,
	timestamp?: number,
): string;

export declare function signatureBaseString(method: string, url: string, params: Record<string, string>): string;

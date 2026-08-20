// Assinatura OAuth 1.0a (RFC 5849) para o executor local (Electron) — porta fiel, byte a byte, de
// `apps/api/src/main/kotlin/com/apibot/features/runstep/service/integration/OAuth1Signer.kt` (D11,
// D12: os dois executores precisam produzir a MESMA assinatura pra mesma entrada, RF11). Plain JS
// (não TS) de propósito, como os demais arquivos de `mcp-servers/`: roda direto via `node`/Electron
// `ELECTRON_RUN_AS_NODE=1`, sem passo de build, e é importado tanto pelo laço de tool calling
// (`openai-tools.ts`, bundlado por esbuild) quanto pelo processo MCP separado (`http-tool.mjs`).
//
// Diferente dos outros esquemas de auth, o cabeçalho não pode ser calculado uma vez e reaproveitado:
// a assinatura cobre método + URL final + nonce + timestamp, então cada requisição pede um header
// novo — por isso `authorizationHeader` é chamada por chamada, nos dois processos que conhecem a URL
// final (D2, D10).
import { createHmac, randomInt } from "node:crypto";

/** @typedef {{ consumerKey: string, consumerSecret: string, token?: string, tokenSecret?: string, signatureMethod: string, realm?: string }} OAuth1Credentials */

const VERSION = "1.0";
const NONCE_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Percent-encoding RFC 3986 (RFC 5849 §3.6). `encodeURIComponent` já cobre a RFC 3986 quase inteira —
 * a única diferença é que ele NÃO escapa `!`, `'`, `(`, `)`, `*` (esses cinco são "unreserved" no
 * `encodeURIComponent` do JS, mas não são unreserved na RFC 3986, que só isenta `A-Z a-z 0-9 - _ . ~`).
 * O Kotlin chega no mesmo alfabeto final pelo caminho oposto: `URLEncoder` faz form-encoding (escapa
 * demais — espaço vira `+`, `~` vira `%7E`) e o Kotlin desfaz isso com três `.replace`. Aqui só falta
 * escapar os cinco caracteres a mais que o JS deixa passar.
 */
const encode = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Mesmo efeito do `URLDecoder.decode(value, UTF_8)` do Kotlin: `+` também é espaço (form-decoding). */
const decode = (value) => decodeURIComponent(value.replace(/\+/g, "%20"));

const normalizedMethod = (raw) => {
	const upper = (raw ?? "").trim().toUpperCase();
	if (upper === "HMAC-SHA256" || upper === "HMACSHA256" || upper === "SHA256") return "HMAC-SHA256";
	if (upper === "PLAINTEXT") return "PLAINTEXT";
	return "HMAC-SHA1";
};

/** Os parâmetros da query entram na assinatura decodificados — a base string reencoda tudo. */
const queryParams = (rawQuery) => {
	if (!rawQuery) return [];
	return rawQuery
		.split("&")
		.filter((pair) => pair.length > 0)
		.map((pair) => {
			const index = pair.indexOf("=");
			return index < 0 ? [decode(pair), ""] : [decode(pair.slice(0, index)), decode(pair.slice(index + 1))];
		});
};

/** `scheme://host[:porta]/path` — sem query, sem fragment, porta default omitida (§3.4.1.2). */
const baseStringUri = (url) => {
	const scheme = url.protocol.replace(/:$/, "").toLowerCase();
	const host = url.hostname.toLowerCase();
	// `URL` já omite a porta quando ela é a default do scheme (80/http, 443/https) na serialização —
	// não precisa do ajuste manual que o Kotlin faz contra `java.net.URI` (que preserva porta explícita).
	const port = url.port ? `:${url.port}` : "";
	const path = url.pathname || "/";
	return `${scheme}://${host}${port}${path}`;
};

/** Exposta pro teste (D12): é aqui que mora a parte difícil da RFC (normalização de URL e de parâmetros). */
export const signatureBaseString = (method, url, params) => {
	const parsed = new URL(url);
	const provided = Object.entries(params);
	const normalizedParams = [...provided, ...queryParams(parsed.search.replace(/^\?/, ""))]
		.map(([key, value]) => [encode(key), encode(value)])
		.sort(([keyA, valueA], [keyB, valueB]) => (keyA === keyB ? (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) : keyA < keyB ? -1 : 1))
		.map(([key, value]) => `${key}=${value}`)
		.join("&");
	return `${method.toUpperCase()}&${encode(baseStringUri(parsed))}&${encode(normalizedParams)}`;
};

const buildOAuthParams = (credentials, nonce, timestamp) => {
	/** @type {Record<string,string>} */
	const params = {
		oauth_consumer_key: credentials.consumerKey,
		oauth_nonce: nonce,
		oauth_signature_method: normalizedMethod(credentials.signatureMethod),
		oauth_timestamp: String(timestamp),
		oauth_version: VERSION,
	};
	if (credentials.token && credentials.token.trim() !== "") params.oauth_token = credentials.token;
	return params;
};

const sign = (credentials, baseString) => {
	const signingKey = `${encode(credentials.consumerSecret)}&${encode(credentials.tokenSecret ?? "")}`;
	const method = normalizedMethod(credentials.signatureMethod);
	if (method === "PLAINTEXT") return signingKey;
	const algorithm = method === "HMAC-SHA256" ? "sha256" : "sha1";
	return createHmac(algorithm, signingKey).update(baseString, "utf8").digest("base64");
};

/** 11 caracteres alfanuméricos de fonte criptográfica — nunca `Math.random` (previsível). */
const randomNonce = () => {
	let result = "";
	for (let i = 0; i < 11; i++) result += NONCE_ALPHABET[randomInt(NONCE_ALPHABET.length)];
	return result;
};

/**
 * `additionalParams` são os parâmetros de um corpo `application/x-www-form-urlencoded`, que a RFC
 * manda entrar na assinatura (§3.4.1.3.1). Corpo JSON — o que as tools `kind: http` mandam — fica de
 * fora da base string (D6), então os dois chamadores (loop de tool calling, `http-tool.mjs`) nunca
 * preenchem este parâmetro.
 *
 * @param {string} method
 * @param {string} url
 * @param {OAuth1Credentials} credentials
 * @param {Record<string,string>} [additionalParams]
 * @param {string} [nonce]
 * @param {number} [timestamp]
 * @returns {string}
 */
export const authorizationHeader = (
	method,
	url,
	credentials,
	additionalParams = {},
	nonce = randomNonce(),
	timestamp = Math.floor(Date.now() / 1000),
) => {
	const oauthParams = buildOAuthParams(credentials, nonce, timestamp);
	const baseString = signatureBaseString(method, url, { ...oauthParams, ...additionalParams });
	const signature = sign(credentials, baseString);

	/** @type {[string, string][]} */
	const entries = [];
	if (credentials.realm && credentials.realm.trim() !== "") entries.push(["realm", credentials.realm]);
	entries.push(["oauth_consumer_key", credentials.consumerKey]);
	if (credentials.token && credentials.token.trim() !== "") entries.push(["oauth_token", credentials.token]);
	entries.push(["oauth_signature_method", normalizedMethod(credentials.signatureMethod)]);
	entries.push(["oauth_timestamp", String(timestamp)]);
	entries.push(["oauth_nonce", nonce]);
	entries.push(["oauth_version", VERSION]);
	entries.push(["oauth_signature", signature]);

	return `OAuth ${entries.map(([key, value]) => `${key}="${encode(value)}"`).join(",")}`;
};

import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authorizationHeader, signatureBaseString } from "./oauth1.mjs";

/**
 * Mesmos vetores de `OAuth1SignerTest.kt` (apps/api) — D12/RF11 exigem que os dois executores
 * produzam a mesma assinatura para a mesma entrada. Divergir aqui é 401 num executor e sucesso no
 * outro.
 */
const headerParams = (header: string): Record<string, string> => {
	expect(header.startsWith("OAuth ")).toBe(true);
	const entries = header
		.slice("OAuth ".length)
		.split(",")
		.map((entry) => {
			const eq = entry.indexOf("=");
			const key = entry.slice(0, eq).trim();
			const value = entry.slice(eq + 1).trim().replace(/^"|"$/g, "");
			return [key, value] as const;
		});
	return Object.fromEntries(entries);
};

describe("oauth1.mjs — base string segue o exemplo da RFC 5849 §3.4.1.3.1", () => {
	it("reproduz caractere a caractere", () => {
		const baseString = signatureBaseString(
			"POST",
			"http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b",
			{
				oauth_consumer_key: "9djdj82h48djs9d2",
				oauth_token: "kkk9d7dh3k39sjv7",
				oauth_signature_method: "HMAC-SHA1",
				oauth_timestamp: "137131201",
				oauth_nonce: "7d8f3e4a",
				c2: "",
				a3: "2 q",
			},
		);

		expect(baseString).toBe(
			"POST&http%3A%2F%2Fexample.com%2Frequest&a2%3Dr%2520b%26a3%3D2%2520q%26a3%3Da%26b5%3D%253D%25253D" +
				"%26c%2540%3D%26c2%3D%26oauth_consumer_key%3D9djdj82h48djs9d2%26oauth_nonce%3D7d8f3e4a" +
				"%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D137131201%26oauth_token%3Dkkk9d7dh3k39sjv7",
		);
	});
});

describe("oauth1.mjs — porta não default e query fora da URL (URL real do Fluig)", () => {
	it("mantém a porta na cadeia assinada e move os parâmetros de query pra lista ordenada", () => {
		const baseString = signatureBaseString(
			"post",
			"HTTP://187.72.197.247:8073/process-management/api/v2/requests/230598/move?draft=false",
			{ oauth_nonce: "abc" },
		);

		expect(baseString).toBe(
			"POST&http%3A%2F%2F187.72.197.247%3A8073%2Fprocess-management%2Fapi%2Fv2%2Frequests%2F230598%2Fmove" +
				"&draft%3Dfalse%26oauth_nonce%3Dabc",
		);
	});
});

describe("oauth1.mjs — header completo com assinatura HMAC-SHA1", () => {
	it("carrega os parâmetros oauth e a assinatura confere contra um HMAC calculado no próprio teste", () => {
		const credentials = {
			consumerKey: "fluig_avalia_chamados",
			consumerSecret: "consumer-secret",
			token: "843be26f-950d-4e76-9445-16abef73f22e",
			tokenSecret: "token-secret",
			signatureMethod: "HMAC-SHA1",
		};
		const url = "http://187.72.197.247:8073/process-management/api/v2/requests/230598/move";

		const params = headerParams(
			authorizationHeader("POST", url, credentials, {}, "OSAwERFOfov", 1787168122),
		);

		expect(params.oauth_consumer_key).toBe("fluig_avalia_chamados");
		expect(params.oauth_token).toBe("843be26f-950d-4e76-9445-16abef73f22e");
		expect(params.oauth_signature_method).toBe("HMAC-SHA1");
		expect(params.oauth_timestamp).toBe("1787168122");
		expect(params.oauth_nonce).toBe("OSAwERFOfov");
		expect(params.oauth_version).toBe("1.0");

		const expectedBaseString = signatureBaseString("POST", url, {
			oauth_consumer_key: credentials.consumerKey,
			oauth_token: credentials.token,
			oauth_signature_method: "HMAC-SHA1",
			oauth_timestamp: "1787168122",
			oauth_nonce: "OSAwERFOfov",
			oauth_version: "1.0",
		});
		const expectedSignature = createHmac("sha1", "consumer-secret&token-secret")
			.update(expectedBaseString, "utf8")
			.digest("base64");
		expect(decodeURIComponent(params.oauth_signature)).toBe(expectedSignature);
	});
});

describe("oauth1.mjs — sem token", () => {
	it("omite oauth_token e assina só com o consumer secret", () => {
		const header = authorizationHeader(
			"GET",
			"https://example.com/api",
			{ consumerKey: "ck", consumerSecret: "cs", signatureMethod: "HMAC-SHA1" },
			{},
			"nonce123456",
			1,
		);
		const params = headerParams(header);

		expect(params.oauth_token).toBeUndefined();
		const baseString = signatureBaseString("GET", "https://example.com/api", {
			oauth_consumer_key: "ck",
			oauth_signature_method: "HMAC-SHA1",
			oauth_timestamp: "1",
			oauth_nonce: "nonce123456",
			oauth_version: "1.0",
		});
		const expectedSignature = createHmac("sha1", "cs&").update(baseString, "utf8").digest("base64");
		expect(decodeURIComponent(params.oauth_signature)).toBe(expectedSignature);
	});
});

describe("oauth1.mjs — realm", () => {
	it("aparece como primeiro campo do header quando configurado", () => {
		const header = authorizationHeader("GET", "https://example.com/api", {
			consumerKey: "ck",
			consumerSecret: "cs",
			signatureMethod: "HMAC-SHA1",
			realm: "Fluig",
		});

		expect(header.startsWith('OAuth realm="Fluig",')).toBe(true);
	});
});

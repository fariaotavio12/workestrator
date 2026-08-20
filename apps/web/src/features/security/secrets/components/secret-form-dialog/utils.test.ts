import { describe, expect, it } from "vitest";
import type { SecretFormValues } from "./schema";
import { emptyValues } from "./schema";
import { toMetadata, toValue } from "./utils";

const oauth1Values = (overrides: Partial<SecretFormValues> = {}): SecretFormValues => ({
	...emptyValues,
	label: "Fluig",
	authType: "oauth1",
	value: "consumer-secret",
	consumerKey: "fluig_avalia_chamados",
	oauthToken: "843be26f-950d-4e76-9445-16abef73f22e",
	signatureMethod: "HMAC-SHA1",
	realm: "Fluig",
	tokenSecret: "token-secret",
	...overrides,
});

describe("toMetadata — oauth1", () => {
	it("carrega as quatro chaves não sensíveis, mapeando oauthToken para a chave token", () => {
		const metadata = toMetadata(oauth1Values());

		expect(metadata).toEqual({
			consumerKey: "fluig_avalia_chamados",
			token: "843be26f-950d-4e76-9445-16abef73f22e",
			signatureMethod: "HMAC-SHA1",
			realm: "Fluig",
		});
	});

	it("omite token e realm quando ausentes, sem entrar como string vazia", () => {
		const metadata = toMetadata(oauth1Values({ oauthToken: "", realm: "" }));

		expect(metadata).toEqual({
			consumerKey: "fluig_avalia_chamados",
			signatureMethod: "HMAC-SHA1",
		});
	});
});

describe("toValue — oauth1", () => {
	it("serializa consumerSecret e tokenSecret como JSON", () => {
		expect(JSON.parse(toValue(oauth1Values()))).toEqual({
			consumerSecret: "consumer-secret",
			tokenSecret: "token-secret",
		});
	});

	it("omite tokenSecret do JSON quando em branco, em vez de mandar string vazia", () => {
		expect(JSON.parse(toValue(oauth1Values({ tokenSecret: "" })))).toEqual({
			consumerSecret: "consumer-secret",
		});
	});
});

import { describe, expect, it } from "vitest";
import { emptyValues, secretFormSchema } from "./schema";

describe("secretFormSchema — oauth1 (RF5, critério 2)", () => {
	it("bloqueia salvar sem consumerKey, apontando o campo", () => {
		const result = secretFormSchema.safeParse({
			...emptyValues,
			label: "Fluig",
			authType: "oauth1",
			value: "consumer-secret",
			consumerKey: "",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) => i.path.join(".") === "consumerKey");
			expect(issue?.message).toBe("Chave do consumidor é obrigatória");
		}
	});

	it("aceita quando consumerKey está preenchida, token/realm/tokenSecret são opcionais", () => {
		const result = secretFormSchema.safeParse({
			...emptyValues,
			label: "Fluig",
			authType: "oauth1",
			value: "consumer-secret",
			consumerKey: "fluig_avalia_chamados",
		});

		expect(result.success).toBe(true);
	});

	it("não exige consumerKey para outros esquemas", () => {
		const result = secretFormSchema.safeParse({
			...emptyValues,
			label: "Anthropic",
			authType: "bearer",
			value: "sk-...",
		});

		expect(result.success).toBe(true);
	});
});

import { z } from "zod";

export const secretFormSchema = z
	.object({
		label: z.string().min(1, "Nome e obrigatorio"),
		authType: z.enum([
			"bearer",
			"header",
			"query",
			"basic",
			"oauth2_client_credentials",
			"oauth2_refresh",
			"oauth1",
			"raw",
		]),
		value: z.string().optional(),
		headerName: z.string().optional(),
		valuePrefix: z.string().optional(),
		queryParam: z.string().optional(),
		basicUsername: z.string().optional(),
		tokenUrl: z.string().optional(),
		clientId: z.string().optional(),
		scopes: z.string().optional(),
		consumerKey: z.string().optional(),
		oauthToken: z.string().optional(),
		tokenSecret: z.string().optional(),
		signatureMethod: z.enum(["HMAC-SHA1", "HMAC-SHA256", "PLAINTEXT"]).optional(),
		realm: z.string().optional(),
	})
	.refine((values) => values.authType !== "header" || Boolean(values.headerName?.trim()), {
		message: "Informe o nome do header",
		path: ["headerName"],
	})
	.refine((values) => values.authType !== "query" || Boolean(values.queryParam?.trim()), {
		message: "Informe o nome do query param",
		path: ["queryParam"],
	})
	.refine((values) => values.authType !== "basic" || Boolean(values.basicUsername?.trim()), {
		message: "Informe o usuário",
		path: ["basicUsername"],
	})
	.refine((values) => !values.authType.startsWith("oauth2") || Boolean(values.tokenUrl?.trim()), {
		message: "Informe a URL de token",
		path: ["tokenUrl"],
	})
	.refine((values) => values.authType !== "oauth1" || Boolean(values.consumerKey?.trim()), {
		message: "Chave do consumidor é obrigatória",
		path: ["consumerKey"],
	});

export type SecretFormValues = z.infer<typeof secretFormSchema>;

export const emptyValues: SecretFormValues = {
	label: "",
	authType: "bearer",
	value: "",
	headerName: "",
	valuePrefix: "",
	queryParam: "",
	basicUsername: "",
	tokenUrl: "",
	clientId: "",
	scopes: "",
	consumerKey: "",
	oauthToken: "",
	tokenSecret: "",
	signatureMethod: "HMAC-SHA1",
	realm: "",
};

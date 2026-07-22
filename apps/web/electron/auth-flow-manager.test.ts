import { describe, expect, it } from "vitest";

import {
	cancelAuthFlow,
	createAuthFlow,
	getAuthFlow,
	markAuthFlowOpened,
	resolveAuthFlow,
	validateInteractiveUrl,
} from "./auth-flow-manager";

describe("auth flow manager", () => {
	it("accepts HTTPS and loopback, but blocks unsafe URLs and embedded credentials", () => {
		expect(validateInteractiveUrl("https://accounts.example.com/authorize")).toBe(
			"https://accounts.example.com/authorize",
		);
		expect(validateInteractiveUrl("http://127.0.0.1:53682/callback")).toBe("http://127.0.0.1:53682/callback");
		expect(() => validateInteractiveUrl("http://example.com/authorize")).toThrow("HTTPS");
		expect(() => validateInteractiveUrl("https://user:secret@example.com/authorize")).toThrow("credenciais");
	});

	it("tracks an external authorization through opening and approval", () => {
		const created = createAuthFlow({
			kind: "external_authorization",
			label: "Conectar conta",
			url: "https://accounts.example.com/authorize",
		});
		expect(created.status).toBe("pending");
		expect(markAuthFlowOpened(created.id).status).toBe("opened");
		expect(resolveAuthFlow(created.id, true).status).toBe("approved");
		expect(getAuthFlow(created.id).resolvedAt).toBeTruthy();
	});

	it("cancels only a pending flow", () => {
		const created = createAuthFlow({ kind: "action_approval", label: "Publicar carrossel" });
		expect(cancelAuthFlow(created.id).status).toBe("cancelled");
		expect(cancelAuthFlow(created.id).status).toBe("cancelled");
	});
});

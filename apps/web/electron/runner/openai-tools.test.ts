import { afterEach, describe, expect, it, vi } from "vitest";
import {
	applyUrlTemplate,
	buildHttpTool,
	extractPath,
	extractPlaceholders,
	safeToolName,
	truncateToolResult,
	type HttpToolDef,
} from "./openai-tools";

const httpDef = (overrides: Partial<HttpToolDef> = {}): HttpToolDef => ({
	name: "buscar",
	method: "GET",
	urlTemplate: "https://serpapi.com/search.json?q={{query}}&api_key=abc",
	...overrides,
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("safeToolName", () => {
	it("sanitizes characters the OpenAI function-name grammar rejects", () => {
		expect(safeToolName("Buscar via serpapi", new Set())).toBe("Buscar_via_serpapi");
	});

	it("suffixes colliding names so dispatch cannot resolve to the wrong tool", () => {
		const taken = new Set<string>();
		expect(safeToolName("Buscar!", taken)).toBe("Buscar");
		expect(safeToolName("Buscar?", taken)).toBe("Buscar_2");
		expect(safeToolName("Buscar#", taken)).toBe("Buscar_3");
	});

	it("falls back to a usable name when sanitizing leaves nothing", () => {
		expect(safeToolName("!!!", new Set())).toBe("tool");
	});
});

describe("applyUrlTemplate", () => {
	it("url-encodes values so a multi-word query does not break the URL", () => {
		expect(applyUrlTemplate("https://x.com?q={{query}}", { query: "concursos TI & dados" })).toBe(
			"https://x.com?q=concursos%20TI%20%26%20dados",
		);
	});

	it("drops placeholders the model did not fill instead of leaving the literal braces", () => {
		expect(applyUrlTemplate("https://x.com?q={{query}}", {})).toBe("https://x.com?q=");
	});
});

describe("extractPath", () => {
	it("narrows the response to the mapped path", () => {
		expect(extractPath({ data: { items: [1, 2] } }, "data.items")).toEqual([1, 2]);
	});

	it("returns the whole value when no path is configured", () => {
		expect(extractPath({ a: 1 }, undefined)).toEqual({ a: 1 });
	});
});

describe("extractPlaceholders", () => {
	it("collects each placeholder once", () => {
		expect(extractPlaceholders("https://x.com?a={{q}}&b={{q}}&c={{page}}")).toEqual(["q", "page"]);
	});
});

describe("truncateToolResult", () => {
	it("keeps short results untouched", () => {
		expect(truncateToolResult("ok")).toBe("ok");
	});

	it("truncates oversized payloads so the next round does not blow a small context window", () => {
		const result = truncateToolResult("x".repeat(20_000));
		expect(result.length).toBeLessThan(20_000);
		expect(result).toContain("truncado");
	});
});

describe("buildHttpTool", () => {
	it("declares each URL placeholder as a required named property", () => {
		const tool = buildHttpTool(httpDef(), "buscar");
		const params = tool.definition.function.parameters as {
			required: string[];
			properties: { variables: { required: string[]; properties: Record<string, unknown> } };
		};
		expect(params.required).toContain("variables");
		expect(params.properties.variables.required).toEqual(["query"]);
		expect(params.properties.variables.properties).toHaveProperty("query");
	});

	it("omits the body property for GET", () => {
		const tool = buildHttpTool(httpDef(), "buscar");
		const params = tool.definition.function.parameters as { properties: Record<string, unknown> };
		expect(params.properties).not.toHaveProperty("body");
	});

	it("offers a body property for methods that carry one", () => {
		const tool = buildHttpTool(httpDef({ method: "POST" }), "criar");
		const params = tool.definition.function.parameters as { properties: Record<string, unknown> };
		expect(params.properties).toHaveProperty("body");
	});

	it("calls the templated URL and returns the mapped slice of the response", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ organic_results: [{ title: "Edital TI" }] }), { status: 200 }),
		);
		const tool = buildHttpTool(httpDef({ responseMap: "organic_results" }), "buscar");

		const result = await tool.execute({ variables: { query: "concursos TI" } });

		expect(fetchMock).toHaveBeenCalledWith(
			"https://serpapi.com/search.json?q=concursos%20TI&api_key=abc",
			expect.objectContaining({ method: "GET" }),
		);
		expect(result.ok).toBe(true);
		expect(JSON.parse(result.text)).toEqual([{ title: "Edital TI" }]);
	});

	it("reports an HTTP failure as a tool error instead of throwing", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("quota exceeded", { status: 429 }));
		const tool = buildHttpTool(httpDef(), "buscar");

		const result = await tool.execute({ variables: { query: "x" } });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("429");
	});

	it("reports a network failure as a tool error instead of throwing", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
		const tool = buildHttpTool(httpDef(), "buscar");

		const result = await tool.execute({ variables: { query: "x" } });

		expect(result.ok).toBe(false);
		expect(result.text).toContain("ECONNREFUSED");
	});
});

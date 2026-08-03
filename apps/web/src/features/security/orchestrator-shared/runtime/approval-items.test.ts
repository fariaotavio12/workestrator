import { describe, expect, it } from "vitest";
import type { ApprovalItemDraft } from "../types";
import { MAX_APPROVAL_ITEMS, parseApprovalItems, summarizeApprovalItems } from "./approval-items";

const processItem = (num: string, nome: string) => ({
	NUM_PROCESS: num,
	SOLICITANTE_NOME: nome,
	SOLICITANTE_NECESSIDADE: "Acesso ao ERP",
	SOLICITANTE_CRITICIDADE_SOLICITANTE: "alta",
	SOLICITANTE_CRITICIDADE_RECLASSIFICADA: "media",
	EXECUTOR_RESPONSAVEL: "Beto",
});

const draft = (overrides: Partial<ApprovalItemDraft> = {}): ApprovalItemDraft => ({
	ref: "P-1",
	label: "Item",
	data: {},
	...overrides,
});

describe("parseApprovalItems", () => {
	it("parses JSON wrapped in a ```json fence", () => {
		const raw = ["```json", JSON.stringify([processItem("2026-001", "Ana Souza")]), "```"].join("\n");

		const items = parseApprovalItems(raw);

		expect(items).toHaveLength(1);
		expect(items[0]?.ref).toBe("2026-001");
	});

	it("parses a bare JSON array", () => {
		const items = parseApprovalItems(JSON.stringify([processItem("2026-001", "Ana Souza"), processItem("2026-002", "Bruno Lima")]));

		expect(items.map((item) => item.ref)).toEqual(["2026-001", "2026-002"]);
	});

	it("extracts a JSON array embedded in surrounding prose", () => {
		const raw = `Analisei a fila e separei os pendentes:\n${JSON.stringify([processItem("2026-003", "Carla Dias")])}\nMe diga se posso seguir.`;

		const items = parseApprovalItems(raw);

		expect(items).toHaveLength(1);
		expect(items[0]?.ref).toBe("2026-003");
	});

	it("returns an empty list for prose with no array at all", () => {
		expect(parseApprovalItems("Não encontrei nada pendente na fila de hoje.")).toEqual([]);
	});

	it("returns an empty list for null, undefined and empty input", () => {
		expect(parseApprovalItems(null)).toEqual([]);
		expect(parseApprovalItems(undefined)).toEqual([]);
		expect(parseApprovalItems("")).toEqual([]);
		expect(parseApprovalItems("   \n  ")).toEqual([]);
	});

	it("returns an empty list for an array of scalars", () => {
		expect(parseApprovalItems('["2026-001", "2026-002"]')).toEqual([]);
		expect(parseApprovalItems("[1, 2, 3]")).toEqual([]);
	});

	it("returns an empty list for a mixed array of objects and scalars", () => {
		expect(parseApprovalItems(JSON.stringify([processItem("2026-001", "Ana Souza"), "2026-002"]))).toEqual([]);
	});

	it("returns an empty list for malformed JSON without throwing", () => {
		expect(() => parseApprovalItems('[{"NUM_PROCESS": "2026-001",}]')).not.toThrow();
		expect(parseApprovalItems('[{"NUM_PROCESS": "2026-001",}]')).toEqual([]);
		expect(parseApprovalItems('[{"NUM_PROCESS": "2026-001"')).toEqual([]);
	});

	it("truncates the list to MAX_APPROVAL_ITEMS", () => {
		const raw = JSON.stringify(
			Array.from({ length: MAX_APPROVAL_ITEMS + 50 }, (_, index) => processItem(`2026-${index}`, `Pessoa ${index}`)),
		);

		expect(parseApprovalItems(raw)).toHaveLength(MAX_APPROVAL_ITEMS);
	});

	it("picks the process number as ref and the human name as label", () => {
		const items = parseApprovalItems(JSON.stringify([processItem("2026-000123", "Ana Souza")]));

		expect(items[0]?.ref).toBe("2026-000123");
		expect(items[0]?.label).toBe("Ana Souza");
	});

	it("falls back to Item N when no key matches either heuristic", () => {
		const items = parseApprovalItems(JSON.stringify([{ foo: "bar" }, { baz: 7 }]));

		expect(items.map((item) => item.ref)).toEqual([undefined, undefined]);
		expect(items.map((item) => item.label)).toEqual(["Item 1", "Item 2"]);
	});

	it("truncates a very long label", () => {
		const items = parseApprovalItems(JSON.stringify([{ nome: "A".repeat(400) }]));

		const label = items[0]?.label ?? "";
		expect(label).toHaveLength(120);
		expect(label.endsWith("…")).toBe(true);
	});

	it("preserves data verbatim", () => {
		const source = processItem("2026-001", "Ana Souza");

		const items = parseApprovalItems(JSON.stringify([source]));

		expect(items[0]?.data).toEqual(source);
	});
});

describe("summarizeApprovalItems", () => {
	it("uses the singular noun for a single item", () => {
		expect(summarizeApprovalItems([draft({ ref: "2026-001" })])).toBe("1 item para revisar: 2026-001.");
	});

	it("uses the plural noun for more than one item", () => {
		const summary = summarizeApprovalItems([draft({ ref: "2026-001" }), draft({ ref: "2026-002" })]);

		expect(summary).toBe("2 itens para revisar: 2026-001, 2026-002.");
	});

	it("lists at most five refs and suffixes the remainder", () => {
		const items = Array.from({ length: 8 }, (_, index) => draft({ ref: `2026-00${index + 1}` }));

		expect(summarizeApprovalItems(items)).toBe(
			"8 itens para revisar: 2026-001, 2026-002, 2026-003, 2026-004, 2026-005 e mais 3.",
		);
	});

	it("falls back to the plain count when no item has a ref", () => {
		const items = [draft({ ref: undefined }), draft({ ref: undefined })];

		expect(summarizeApprovalItems(items)).toBe("2 itens para revisar.");
	});
});

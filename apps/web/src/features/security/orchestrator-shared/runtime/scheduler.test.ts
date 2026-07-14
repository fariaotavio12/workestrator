import { describe, expect, it } from "vitest";
import type { SquadDetail } from "@/features/security/squad-detail/api";
import type { SquadSummary } from "@/features/security/squads/api";
import { computeDueSquads, resolveScheduledBriefing } from "./scheduler";

const ISO = "2026-01-01T00:00:00.000Z";

const squad = (overrides: Partial<SquadSummary> & { id: string }): SquadSummary => ({
	name: "Squad",
	description: "",
	icon: "boxes",
	trigger: { type: "manual" },
	createdAt: ISO,
	updatedAt: ISO,
	...overrides,
});

const notActive = () => false;

const squadDetail = (overrides: Partial<SquadDetail> = {}): SquadDetail => ({
	id: "s1",
	name: "Squad",
	description: "",
	icon: "boxes",
	trigger: { type: "manual" },
	savedBriefing: null,
	agents: [],
	seats: [],
	orchestrator: { systemPrompt: "", modelRef: { providerId: "", model: "" }, maxSteps: 8 },
	createdAt: ISO,
	updatedAt: ISO,
	...overrides,
});

describe("computeDueSquads", () => {
	it("never selects a manual-trigger squad", () => {
		const lastFiredAt = new Map<string, number>();
		const result = computeDueSquads([squad({ id: "s1", trigger: { type: "manual" } })], 0, lastFiredAt, notActive);
		expect(result).toEqual([]);
	});

	it("never selects a disabled schedule trigger", () => {
		const lastFiredAt = new Map<string, number>();
		const result = computeDueSquads(
			[squad({ id: "s2", trigger: { type: "schedule", every: "5m", enabled: false } })],
			0,
			lastFiredAt,
			notActive,
		);
		expect(result).toEqual([]);
	});

	it("does not fire the first time it sees a squad — records a baseline instead", () => {
		const lastFiredAt = new Map<string, number>();
		const s = squad({ id: "s3", trigger: { type: "schedule", every: "5m", enabled: true } });
		const result = computeDueSquads([s], 1000, lastFiredAt, notActive);
		expect(result).toEqual([]);
		expect(lastFiredAt.get("s3")).toBe(1000);
	});

	it("does not fire again before the configured interval elapses", () => {
		const lastFiredAt = new Map([["s4", 1000]]);
		const s = squad({ id: "s4", trigger: { type: "schedule", every: "5m", enabled: true } });
		const result = computeDueSquads([s], 1000 + 4 * 60 * 1000, lastFiredAt, notActive);
		expect(result).toEqual([]);
	});

	it("fires once the configured interval has elapsed since the last firing", () => {
		const lastFiredAt = new Map([["s5", 1000]]);
		const s = squad({ id: "s5", trigger: { type: "schedule", every: "5m", enabled: true } });
		const result = computeDueSquads([s], 1000 + 5 * 60 * 1000, lastFiredAt, notActive);
		expect(result).toEqual([s]);
	});

	it("respects each trigger cadence (1h, daily) independently", () => {
		const lastFiredAt = new Map([
			["hourly", 0],
			["daily", 0],
		]);
		const hourly = squad({ id: "hourly", trigger: { type: "schedule", every: "1h", enabled: true } });
		const daily = squad({ id: "daily", trigger: { type: "schedule", every: "daily", enabled: true } });
		const oneHourLater = 60 * 60 * 1000;
		const result = computeDueSquads([hourly, daily], oneHourLater, lastFiredAt, notActive);
		expect(result).toEqual([hourly]);
	});

	it("skips a due squad when a run is already active for it", () => {
		const lastFiredAt = new Map([["s6", 1000]]);
		const s = squad({ id: "s6", trigger: { type: "schedule", every: "5m", enabled: true } });
		const result = computeDueSquads([s], 1000 + 5 * 60 * 1000, lastFiredAt, () => true);
		expect(result).toEqual([]);
	});
});

describe("resolveScheduledBriefing", () => {
	it("prefers the saved briefing over the squad description", () => {
		const s = squad({ id: "s7", description: "Descrição do squad" });
		const detail = squadDetail({ savedBriefing: "Briefing salvo pelo usuário" });
		expect(resolveScheduledBriefing(s, detail)).toBe("Briefing salvo pelo usuário");
	});

	it("falls back to the squad description when there is no saved briefing", () => {
		const s = squad({ id: "s8", description: "Descrição do squad" });
		const detail = squadDetail({ savedBriefing: null });
		expect(resolveScheduledBriefing(s, detail)).toBe("Descrição do squad");
	});

	it("falls back to a generic message when neither is set", () => {
		const s = squad({ id: "s9", name: "Radar", description: "" });
		const detail = squadDetail({ savedBriefing: null });
		expect(resolveScheduledBriefing(s, detail)).toBe('Execução agendada de "Radar".');
	});

	it("falls back to the description when the detail cache is empty (backend antigo/tick sem cache)", () => {
		const s = squad({ id: "s10", description: "Descrição do squad" });
		expect(resolveScheduledBriefing(s, undefined)).toBe("Descrição do squad");
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/security/approvals/api", () => ({
	getApprovalApi: vi.fn(),
}));

import { getApprovalApi } from "@/features/security/approvals/api";
import type { ApprovalRequest } from "../types";
import { activeApprovalWatchCount, startApprovalWatch, stopApprovalWatch } from "./approval-watcher";

const ISO = "2026-01-01T00:00:00.000Z";

const approvalRequest = (overrides: Partial<ApprovalRequest> & Pick<ApprovalRequest, "id" | "status">): ApprovalRequest => ({
	squadId: "squad-1",
	runId: "run-1",
	seatId: "s1",
	agentId: "a1",
	checkpointKind: "before",
	title: "Aprovação necessária",
	summary: "",
	canDecide: true,
	canCancel: true,
	createdAt: ISO,
	updatedAt: ISO,
	...overrides,
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
});

describe("approval-watcher", () => {
	it("não consulta o backend antes do primeiro intervalo (10s)", async () => {
		const onSettled = vi.fn();
		startApprovalWatch("appr-1", onSettled);

		expect(activeApprovalWatchCount()).toBe(1);
		expect(getApprovalApi).not.toHaveBeenCalled();

		stopApprovalWatch("appr-1");
		vi.useRealTimers();
	});

	it("mantém tentando (sem parar) enquanto o pedido segue pending", async () => {
		vi.mocked(getApprovalApi).mockResolvedValue(approvalRequest({ id: "appr-2", status: "pending" }));
		const onSettled = vi.fn();
		startApprovalWatch("appr-2", onSettled);

		await vi.advanceTimersByTimeAsync(10_000);

		expect(getApprovalApi).toHaveBeenCalledWith("appr-2");
		expect(onSettled).not.toHaveBeenCalled();
		expect(activeApprovalWatchCount()).toBe(1);

		stopApprovalWatch("appr-2");
		vi.useRealTimers();
	});

	it("aplica a decisão e para de tentar assim que o pedido sai de pending", async () => {
		const settled = approvalRequest({ id: "appr-3", status: "approved" });
		vi.mocked(getApprovalApi).mockResolvedValue(settled);
		const onSettled = vi.fn();
		startApprovalWatch("appr-3", onSettled);

		await vi.advanceTimersByTimeAsync(10_000);

		expect(onSettled).toHaveBeenCalledWith(settled);
		expect(activeApprovalWatchCount()).toBe(0);

		vi.useRealTimers();
	});

	it("erro de rede não chama onSettled — só tenta de novo no próximo tick", async () => {
		vi.mocked(getApprovalApi).mockRejectedValue(new Error("offline"));
		const onSettled = vi.fn();
		startApprovalWatch("appr-4", onSettled);

		await vi.advanceTimersByTimeAsync(10_000);

		expect(onSettled).not.toHaveBeenCalled();
		expect(activeApprovalWatchCount()).toBe(1);

		stopApprovalWatch("appr-4");
		vi.useRealTimers();
	});

	it("chamar startApprovalWatch duas vezes pro mesmo id não duplica o watcher", async () => {
		const onSettledA = vi.fn();
		const onSettledB = vi.fn();
		startApprovalWatch("appr-5", onSettledA);
		startApprovalWatch("appr-5", onSettledB);

		expect(activeApprovalWatchCount()).toBe(1);

		vi.mocked(getApprovalApi).mockResolvedValue(approvalRequest({ id: "appr-5", status: "rejected" }));
		await vi.advanceTimersByTimeAsync(10_000);

		// Só o primeiro registro conta — o segundo `startApprovalWatch` foi no-op.
		expect(onSettledA).toHaveBeenCalledTimes(1);
		expect(onSettledB).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it("stopApprovalWatch cancela antes do tick — onSettled nunca dispara", async () => {
		vi.mocked(getApprovalApi).mockResolvedValue(approvalRequest({ id: "appr-6", status: "approved" }));
		const onSettled = vi.fn();
		startApprovalWatch("appr-6", onSettled);

		stopApprovalWatch("appr-6");
		expect(activeApprovalWatchCount()).toBe(0);

		await vi.advanceTimersByTimeAsync(20_000);

		expect(onSettled).not.toHaveBeenCalled();
		expect(getApprovalApi).not.toHaveBeenCalled();

		vi.useRealTimers();
	});
});

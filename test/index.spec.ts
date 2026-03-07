import { SELF, env, introspectWorkflow } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Watchpoint worker", () => {
	it("lists pricing tiers and the Workers AI fallback status", async () => {
		const response = await SELF.fetch("http://example.com/api/pricing");
		expect(response.status).toBe(200);

		const body = await response.json<{
			primaryModelDisplayName: string;
			tiers: Array<{ id: string; modelName: string; x402Price: string }>;
		}>();

		expect(body.primaryModelDisplayName).toBe("GLM 4.7 Flash");
		expect(body.tiers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "standard",
					modelName: "@cf/zai-org/glm-4.7-flash",
					x402Price: "$0.07",
				}),
				expect.objectContaining({
					id: "premium",
					modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
					x402Price: "$0.18",
				}),
			]),
		);
	});

	it("returns 402 for the paid route without payment", async () => {
		const response = await SELF.fetch("http://example.com/api/watch/tiers/premium", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
			},
			body: JSON.stringify({
				targetUrl: "https://watchpoint.local/stable",
				tierId: "premium",
			}),
		});

		expect(response.status).toBe(402);
		expect(response.headers.get("payment-required")).not.toBeNull();
	});

	it("creates a paid watch, runs the baseline via workflow, and stores rich capture evidence", async () => {
		await using workflow = await introspectWorkflow(env.WATCH_WORKFLOW);

		const response = await SELF.fetch("http://example.com/api/watch/tiers/standard", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-watchpoint-dev-payment": "watchpoint-local-paid",
			},
			body: JSON.stringify({
				targetUrl: "https://watchpoint.local/slow-stable",
				tierId: "standard",
			}),
		});

		expect(response.status).toBe(201);
		const body = await response.json<{
			watch: {
				id: string;
				runCount: number;
				remainingRuns: number;
				activeWorkflow: { workflowId: string; status: string } | null;
			};
			x402: { tierId: string; modelName: string; price: string };
		}>();

		expect(body.watch.id).toMatch(/^watch_/);
		expect(body.watch.runCount).toBe(0);
		expect(body.watch.remainingRuns).toBe(3);
		expect(body.watch.activeWorkflow).not.toBeNull();
		expect(body.x402).toEqual({
			tierId: "standard",
			modelName: "@cf/zai-org/glm-4.7-flash",
			price: "$0.07",
		});

		const detail = await waitForWatch(body.watch.id, (candidate) => candidate.runs.length === 1);
		expect(detail.watch.runCount).toBe(1);
		expect(detail.watch.remainingRuns).toBe(2);
		expect(detail.watch.activeWorkflow).not.toBeNull();
		expect(detail.watch.status).toBe("waiting");
		expect(detail.watch.activeWorkflow?.status).toBe("waiting");
		expect(detail.watch.activeWorkflow?.nextScheduledAt).not.toBeNull();
		expect(detail.runs[0]?.status).toBe("succeeded");
		expect(detail.runs[0]?.steps.length).toBeGreaterThan(0);
		expect(detail.runs[0]?.steps[0]?.primaryActions.length).toBeGreaterThan(0);
	});

	it("detects regressions after a workflow-driven manual rescan", async () => {
		await using workflow = await introspectWorkflow(env.WATCH_WORKFLOW);

		const createResponse = await SELF.fetch("http://example.com/api/demo/watch", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				targetUrl: "https://watchpoint.local/regression",
				tierId: "standard",
			}),
		});
		expect(createResponse.status).toBe(201);
		const created = await createResponse.json<{ watch: { id: string } }>();
		await waitForWatch(created.watch.id, (detail) => detail.runs.length === 1);

		const rescanResponse = await SELF.fetch(`http://example.com/api/watch/${created.watch.id}/rescan`, {
			method: "POST",
		});
		expect(rescanResponse.status).toBe(202);

		const queued = await rescanResponse.json<{
			detail: { watch: { id: string; activeWorkflow: { workflowId: string; status: string } | null } };
			rescan: { accepted: boolean; reason: string };
		}>();
		expect(queued.detail.watch.activeWorkflow).not.toBeNull();
		expect(queued.rescan).toEqual({
			accepted: true,
			reason: "manual",
		});

		const detail = await waitForWatch(created.watch.id, (candidate) => candidate.runs.length === 2);
		expect(detail.watch.remainingRuns).toBe(1);
		expect(detail.watch.status).toBe("waiting");
		expect(detail.runs).toHaveLength(2);
		expect(detail.runs[1]?.kind).toBe("rescan");
		expect(detail.runs[1]?.diffReport.hasChanges).toBe(true);
		expect(detail.runs[1]?.diffReport.newIssues).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: "critical-error-surface" })]),
		);
	});

	it("rejects duplicate and exhausted manual rescans deterministically", async () => {
		await using workflow = await introspectWorkflow(env.WATCH_WORKFLOW);

		const createResponse = await SELF.fetch("http://example.com/api/demo/watch", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				targetUrl: "https://watchpoint.local/stable",
				tierId: "standard",
			}),
		});
		expect(createResponse.status).toBe(201);
		const created = await createResponse.json<{ watch: { id: string } }>();
		await waitForWatch(created.watch.id, (detail) => detail.runs.length === 1);

		const firstRescanPromise = SELF.fetch(`http://example.com/api/watch/${created.watch.id}/rescan`, {
			method: "POST",
		});
		const duplicateRescanPromise = SELF.fetch(`http://example.com/api/watch/${created.watch.id}/rescan`, {
			method: "POST",
		});

		const firstRescan = await firstRescanPromise;
		expect(firstRescan.status).toBe(202);
		const firstQueued = await firstRescan.json<{
			rescan: { accepted: boolean; reason: string };
		}>();
		expect(firstQueued.rescan.accepted).toBe(true);

		const duplicateRescan = await duplicateRescanPromise;
		expect(duplicateRescan.status).toBe(409);
		const duplicateBody = await duplicateRescan.json<{
			rescan: { accepted: boolean; reason: string };
			detail: WatchDetailResponse;
		}>();
		expect(duplicateBody.rescan).toEqual({
			accepted: false,
			reason: "already-running",
		});
		expect(duplicateBody.detail.watch.activeWorkflow?.status).toMatch(/queued|running/);

		await waitForWatch(created.watch.id, (detail) => detail.runs.length === 2);

		const secondRescan = await SELF.fetch(`http://example.com/api/watch/${created.watch.id}/rescan`, {
			method: "POST",
		});
		expect(secondRescan.status).toBe(202);
		await waitForWatch(created.watch.id, (detail) => detail.runs.length === 3);

		const exhaustedRescan = await SELF.fetch(`http://example.com/api/watch/${created.watch.id}/rescan`, {
			method: "POST",
		});
		expect(exhaustedRescan.status).toBe(409);
		const exhaustedBody = await exhaustedRescan.json<{
			rescan: { accepted: boolean; reason: string };
			detail: WatchDetailResponse;
		}>();
		expect(exhaustedBody.rescan).toEqual({
			accepted: false,
			reason: "exhausted",
		});
		expect(exhaustedBody.detail.watch.remainingRuns).toBe(0);
		expect(exhaustedBody.detail.watch.status).toBe("exhausted");
	});

	it("preserves run history after a failed baseline and a later successful recovery rescan", async () => {
		await using workflow = await introspectWorkflow(env.WATCH_WORKFLOW);

		const createResponse = await SELF.fetch("http://example.com/api/demo/watch", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				targetUrl: "https://watchpoint.local/recovering",
				tierId: "standard",
			}),
		});
		expect(createResponse.status).toBe(201);
		const created = await createResponse.json<{ watch: { id: string } }>();

		const failedBaseline = await waitForWatch(created.watch.id, (detail) => detail.runs.length === 1);
		expect(failedBaseline.runs[0]?.status).toBe("failed");
		expect(failedBaseline.watch.lastError).toContain("navigation-timeout");
		expect(failedBaseline.watch.status).toBe("waiting");

		const rescanResponse = await SELF.fetch(`http://example.com/api/watch/${created.watch.id}/rescan`, {
			method: "POST",
		});
		expect(rescanResponse.status).toBe(202);

		const recovered = await waitForWatch(created.watch.id, (detail) => detail.runs.length === 2);
		expect(recovered.runs[0]?.status).toBe("failed");
		expect(recovered.runs[1]?.status).toBe("succeeded");
		expect(recovered.runs[1]?.kind).toBe("rescan");
		expect(recovered.watch.remainingRuns).toBe(1);
	});
});

type WatchDetailResponse = {
	watch: {
		id: string;
		runCount: number;
		remainingRuns: number;
		status: string;
		lastError: string | null;
		activeWorkflow: { workflowId: string; status: string; nextScheduledAt: string | null } | null;
	};
	runs: Array<{
		kind: string;
		status: string;
		steps: Array<{
			primaryActions: string[];
			warnings: Array<{ code: string }>;
		}>;
		diffReport: { hasChanges: boolean; newIssues: Array<{ id: string }> };
	}>;
};

async function waitForWatch(
	watchId: string,
	predicate: (detail: WatchDetailResponse) => boolean,
): Promise<WatchDetailResponse> {
	const startedAt = Date.now();

	while (Date.now() - startedAt < 5_000) {
		const response = await SELF.fetch(`http://example.com/api/watch/${watchId}`);
		expect(response.status).toBe(200);
		const detail = await response.json<WatchDetailResponse>();
		if (predicate(detail)) {
			return detail;
		}

		await new Promise((resolve) => setTimeout(resolve, 20));
	}

	throw new Error(`Timed out while waiting for watch ${watchId}`);
}

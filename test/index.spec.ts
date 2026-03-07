import { SELF } from "cloudflare:test";
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
					modelName: "@cf/zai-org/glm-4.5-air-fp8",
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
		expect(await response.text()).toContain("$0.18");
	});

	it("creates a paid watch when the local dev payment bypass is provided", async () => {
		const response = await SELF.fetch("http://example.com/api/watch/tiers/standard", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-watchpoint-dev-payment": "watchpoint-local-paid",
			},
			body: JSON.stringify({
				targetUrl: "https://watchpoint.local/stable",
				tierId: "standard",
			}),
		});

		expect(response.status).toBe(201);
		const body = await response.json<{
			watch: { id: string; runCount: number; remainingRuns: number };
			x402: { modelName: string; price: string };
		}>();

		expect(body.watch.id).toMatch(/^watch_/);
		expect(body.watch.runCount).toBe(1);
		expect(body.watch.remainingRuns).toBe(2);
		expect(body.x402).toEqual({
			tierId: "standard",
			modelName: "@cf/zai-org/glm-4.5-air-fp8",
			price: "$0.07",
		});
	});

	it("detects regressions between the baseline and a manual rescan", async () => {
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

		const rescanResponse = await SELF.fetch(`http://example.com/api/watch/${created.watch.id}/rescan`, {
			method: "POST",
		});
		expect(rescanResponse.status).toBe(200);

		const detail = await rescanResponse.json<{
			watch: { remainingRuns: number };
			runs: Array<{
				kind: string;
				diffReport: { hasChanges: boolean; newIssues: Array<{ id: string }> };
				findings: Array<{ id: string }>;
			}>;
		}>();

		expect(detail.watch.remainingRuns).toBe(1);
		expect(detail.runs).toHaveLength(2);
		expect(detail.runs[1]?.kind).toBe("rescan");
		expect(detail.runs[1]?.diffReport.hasChanges).toBe(true);
		expect(detail.runs[1]?.diffReport.newIssues).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: "critical-error-surface" })]),
		);
	});
});

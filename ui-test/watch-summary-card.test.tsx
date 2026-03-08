import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WatchSummaryCard } from "../src/ui/components/watch-summary-card";
import type { WatchSnapshot } from "../src/ui/lib/contracts";

describe("WatchSummaryCard", () => {
	it("renders workflow status details for an existing watch", () => {
		const watch: WatchSnapshot = {
			id: "watch_123",
			targetUrl: "https://watchpoint.local/regression",
			status: "waiting",
			pricingTier: {
				id: "standard",
				displayName: "GLM 4.7 Flash",
				x402Price: "$0.07",
				includedRuns: 3,
				cadenceMinutes: 60,
				modelName: "@cf/zai-org/glm-4.7-flash",
				capacitySummary: "Fast, lower-cost monitoring for stable sites.",
				referenceDocsUrl: "https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/",
			},
			remainingRuns: 2,
			createdAt: "2026-03-07T09:00:00.000Z",
			lastRunAt: "2026-03-07T09:05:00.000Z",
			runCount: 1,
			lastError: null,
			activeWorkflow: {
				workflowId: "wf_123",
				workflowName: "WATCH_WORKFLOW",
				kind: "rescan",
				trigger: "automatic",
				status: "waiting",
				queuedAt: "2026-03-07T09:05:00.000Z",
				startedAt: null,
				nextScheduledAt: "2026-03-07T10:05:00.000Z",
			},
		};

		render(<WatchSummaryCard watch={watch} />);

		expect(screen.getByText("Watch summary")).toBeInTheDocument();
		expect(screen.getByText("https://watchpoint.local/regression")).toBeInTheDocument();
		expect(screen.getByText("automatic")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("None")).toBeInTheDocument();
	});
});

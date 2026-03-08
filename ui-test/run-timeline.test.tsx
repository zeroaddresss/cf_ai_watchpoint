import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunTimeline } from "../src/ui/components/run-timeline";
import type { WatchRun } from "../src/ui/lib/contracts";

describe("RunTimeline", () => {
	it("renders screenshot-backed run evidence when available", () => {
		const runs: WatchRun[] = [
			{
				id: "baseline_123",
				kind: "baseline",
				status: "succeeded",
				startedAt: "2026-03-07T09:00:00.000Z",
				completedAt: "2026-03-07T09:05:00.000Z",
				modelName: "@cf/zai-org/glm-4.7-flash",
				pageTitle: "Landing page healthy",
				canonicalUrl: "https://watchpoint.local/regression",
				contentDigest: "digest_1",
				steps: [
					{
						stepIndex: 0,
						url: "https://watchpoint.local/regression",
						title: "Landing page healthy",
						text: "CTA visible",
						textDigest: "text_digest_1",
						primaryActions: ["Start trial"],
						screenshotDataUrl: "data:image/png;base64,AAAA",
						warnings: [],
						capturedAt: "2026-03-07T09:00:00.000Z",
					},
				],
				narrativeSummary: "No meaningful changes detected.",
				findings: [
					{
						id: "cta-visible",
						title: "Primary CTA visible",
						severity: "info",
						evidence: "Hero CTA remained visible.",
					},
				],
				diffReport: {
					hasChanges: false,
					newIssues: [],
					resolvedIssues: [],
					regressions: [],
					stabilityNote: "Stable",
				},
			},
		];

		render(<RunTimeline runs={runs} />);

		expect(screen.getByText("Run timeline")).toBeInTheDocument();
		expect(screen.getByText("Landing page healthy")).toBeInTheDocument();
		expect(screen.getByAltText("Landing page healthy screenshot")).toBeInTheDocument();
		expect(screen.getByText("Primary CTA visible")).toBeInTheDocument();
	});
});

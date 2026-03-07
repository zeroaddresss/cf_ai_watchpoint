import { describe, expect, it } from "vitest";
import {
	CaptureSessionError,
	captureSession,
	getFixtureCaptureFailure,
	selectFollowUpUrl,
	type CaptureActionCandidate,
} from "../src/capture";

describe("captureSession", () => {
	it("keeps text evidence when screenshots are unavailable", async () => {
		const session = await captureSession(
			{
				WATCHPOINT_CAPTURE_MODE: "fixture",
			},
			{
				targetUrl: "https://watchpoint.local/screenshot-warning",
				runIndex: 0,
			},
		);

		expect(session.steps).toHaveLength(1);
		expect(session.steps[0]?.title).toBe("Screenshot degraded");
		expect(session.steps[0]?.screenshotDataUrl).toBeNull();
		expect(session.steps[0]?.warnings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: "screenshot-unavailable" })]),
		);
	});

	it("classifies fixture timeouts with a typed capture error", async () => {
		const error = getFixtureCaptureFailure({
			targetUrl: "https://watchpoint.local/recovering",
			runIndex: 0,
		});

		expect(error).toBeInstanceOf(CaptureSessionError);
		expect(error).toMatchObject({
			kind: "navigation-timeout",
		});
	});
});

describe("selectFollowUpUrl", () => {
	it("prefers a stable same-origin CTA over fragments, duplicates, and logout links", () => {
		const actions = [
			candidate("Pricing", "https://example.com/#pricing"),
			candidate("Logout", "https://example.com/logout"),
			candidate("Checkout", "https://example.com/checkout?source=hero"),
			candidate("Docs", "https://docs.example.com/guide"),
		];

		const selected = selectFollowUpUrl(actions, "https://example.com", "https://example.com/");
		expect(selected).toBe("https://example.com/checkout");
	});

	it("returns null when no meaningful follow-up URL exists", () => {
		const actions = [
			candidate("Overview", "https://example.com/#overview"),
			candidate("Current page", "https://example.com/?view=full"),
			candidate("External", "https://another.example.com/start"),
		];

		const selected = selectFollowUpUrl(actions, "https://example.com", "https://example.com/");
		expect(selected).toBeNull();
	});
});

function candidate(label: string, href: string | null): CaptureActionCandidate {
	return {
		label,
		href,
	};
}

import { describe, expect, it } from "vitest";
import { buildCurlSnippet } from "../src/ui/lib/curl-snippet";

describe("buildCurlSnippet", () => {
	it("targets the selected watch tier and payload", () => {
		const snippet = buildCurlSnippet("https://watchpoint.dev", "https://watchpoint.local/regression", "premium");

		expect(snippet).toContain("https://watchpoint.dev/api/watch/tiers/premium");
		expect(snippet).toContain('"targetUrl": "https://watchpoint.local/regression"');
		expect(snippet).toContain('"tierId": "premium"');
		expect(snippet).toContain("x-watchpoint-dev-payment");
	});
});

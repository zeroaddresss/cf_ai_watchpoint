import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App";

const pricingPayload = {
	primaryModelDisplayName: "GLM 4.7 Flash",
	primaryModelDocsUrl: "https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/",
	primaryModelStatus: "GLM 4.7 Flash is the baseline Workers AI model for Watchpoint.",
	tiers: [
		{
			id: "standard",
			displayName: "GLM 4.7 Flash",
			x402Price: "$0.07",
			includedRuns: 3,
			cadenceMinutes: 60,
			modelName: "@cf/zai-org/glm-4.7-flash",
			capacitySummary: "Fast, lower-cost monitoring for stable sites.",
			referenceDocsUrl: "https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/",
		},
		{
			id: "premium",
			displayName: "Llama 3.3 70B",
			x402Price: "$0.18",
			includedRuns: 5,
			cadenceMinutes: 30,
			modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
			capacitySummary: "Higher-capacity summaries and regression narratives.",
			referenceDocsUrl: "https://developers.cloudflare.com/agents/",
		},
	],
};

describe("App", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		window.history.replaceState({}, "", "/");
	});

	it("loads pricing data and renders the demo route shell", async () => {
		const fetchMock = vi.fn(async (input: string | URL | Request) => {
			const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
			if (requestUrl.endsWith("/api/pricing")) {
				return new Response(JSON.stringify(pricingPayload), {
					status: 200,
					headers: {
						"content-type": "application/json",
					},
				});
			}

			return new Response(JSON.stringify({ error: "Unexpected request" }), {
				status: 500,
				headers: {
					"content-type": "application/json",
				},
			});
		});

		vi.stubGlobal("fetch", fetchMock);
		window.history.replaceState({}, "", "/demo");

		render(<App />);

		expect(screen.queryByRole("heading", { name: /this is the fastest way to understand the product/i })).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Demo" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "API" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
		expect(screen.getByText("Watchpoint")).toBeInTheDocument();
		expect(screen.getByText(/cloudflare-native monitoring loop/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Demo" })).toHaveAttribute("aria-current", "page");

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /run free scan/i })).toBeInTheDocument();
		});

		expect(screen.getByRole("combobox", { name: /pricing tier/i })).toBeInTheDocument();
		expect(screen.getAllByText("HTTP API").length).toBeGreaterThan(0);
		expect(screen.getAllByText("MCP agent").length).toBeGreaterThan(0);
		fireEvent.click(screen.getByRole("button", { name: "Open Cloudflare Workers AI details" }));

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /cloudflare workers ai/i })).toBeInTheDocument();
		expect(screen.getByText(/turns captured evidence into findings/i)).toBeInTheDocument();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("renders the api route directly from its pathname", async () => {
		const fetchMock = vi.fn(async (input: string | URL | Request) => {
			const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
			if (requestUrl.endsWith("/api/pricing")) {
				return new Response(JSON.stringify(pricingPayload), {
					status: 200,
					headers: {
						"content-type": "application/json",
					},
				});
			}

			return new Response(JSON.stringify({ error: "Unexpected request" }), {
				status: 500,
				headers: {
					"content-type": "application/json",
				},
			});
		});

		vi.stubGlobal("fetch", fetchMock);
		window.history.replaceState({}, "", "/api");

		render(<App />);

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: /expose the same watch lifecycle as a paid x402 capability/i })).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText(/x402 http api/i)).toBeInTheDocument();
		});
		expect(screen.queryByRole("button", { name: /create demo watch/i })).not.toBeInTheDocument();
	});
});

import { createPaymentWrapper, x402ResourceServer } from "@x402/mcp";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { McpAgent } from "agents/mcp";
import { getAgentByName } from "agents";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getPricingTier, listPricingTiers } from "./pricing";
import { buildTierPaymentRequirements } from "./payment";

type TextToolResult = {
	content: Array<{
		type: "text";
		text: string;
	}>;
};

export class WatchpointMcpAgent extends McpAgent<Env, { ready: boolean }> {
	initialState = { ready: false };
	server = new McpServer({ name: "watchpoint", version: "0.0.0" });

	async init(): Promise<void> {
		this.server = new McpServer({ name: "watchpoint", version: "0.0.0" });

		this.server.registerTool(
			"list_pricing",
			{
				description: "List Watchpoint pricing tiers and associated Workers AI models.",
				outputSchema: z.object({
					tiers: z.array(
						z.object({
							id: z.string(),
							displayName: z.string(),
							x402Price: z.string(),
							modelName: z.string(),
							includedRuns: z.number(),
						}),
					),
				}),
			},
			async () => textToolResult(JSON.stringify({ tiers: listPricingTiers() })),
		);

		const standardPaid = await this.createPaidWrapper("standard");
		const premiumPaid = await this.createPaidWrapper("premium");

		this.server.registerTool(
			"create_watch_standard",
			{
				description: "Create a Watchpoint standard monitoring watch.",
				inputSchema: z.object({
					targetUrl: z.string().url(),
				}),
			},
			standardPaid(async ({ targetUrl }) => this.createWatch(targetUrl, "standard")),
		);

		this.server.registerTool(
			"create_watch_premium",
			{
				description: "Create a Watchpoint premium monitoring watch.",
				inputSchema: z.object({
					targetUrl: z.string().url(),
				}),
			},
			premiumPaid(async ({ targetUrl }) => this.createWatch(targetUrl, "premium")),
		);

		this.server.registerTool(
			"get_watch_status",
			{
				description: "Fetch the latest report for a Watchpoint watch id.",
				inputSchema: z.object({
					watchId: z.string(),
				}),
			},
			async ({ watchId }) => {
				const stub = await getAgentByName(this.env.WATCH_AGENT, watchId);
				const detail = await stub.getWatchDetail();
				return textToolResult(JSON.stringify(detail));
			},
		);
	}

	private async createPaidWrapper(tierId: "standard" | "premium") {
		const tier = getPricingTier(tierId);
		if (tier === null) {
			throw new Error(`Unknown tier ${tierId}`);
		}

		const facilitatorClient = new HTTPFacilitatorClient({
			url: this.env.WATCHPOINT_FACILITATOR_URL,
		});
		const resourceServer = new x402ResourceServer(facilitatorClient).register(
			this.env.WATCHPOINT_X402_NETWORK,
			new ExactEvmScheme(),
		);
		const accepts = await buildTierPaymentRequirements(this.env, tierId);
		return createPaymentWrapper(resourceServer, { accepts });
	}

	private async createWatch(targetUrl: string, tierId: "standard" | "premium") {
		const watchId = `watch_${crypto.randomUUID()}`;
		const stub = await getAgentByName(this.env.WATCH_AGENT, watchId);
		const detail = await stub.createWatch({ targetUrl, tierId });
		return textToolResult(JSON.stringify(detail));
	}
}

function textToolResult(text: string): TextToolResult {
	return {
		content: [
			{
				type: "text",
				text,
			},
		],
	};
}

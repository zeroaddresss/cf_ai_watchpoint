import { routeAgentRequest } from "agents";
import { Hono } from "hono";
import { WatchAgent } from "./watch-agent";
import { WatchpointMcpAgent } from "./mcp";
import { createPaidRouteMiddleware } from "./payment";
import { getPricingTier, listPricingTiers, primaryModelDisplayName, primaryModelDocsUrl } from "./pricing";
import { createWatch, getWatchDetail, triggerRescan } from "./watch-service";
import { WatchWorkflow } from "./watch-workflow";

const app = new Hono<{ Bindings: Env }>();
const mcpHandler = WatchpointMcpAgent.serve("/mcp", { binding: "WATCHPOINT_MCP" });

app.get("/api/health", (context) =>
	context.json({
		name: "Watchpoint",
		status: "ok",
		primaryModelDisplayName,
		primaryModelDocsUrl,
		workersAiBackends: listPricingTiers().map((tier) => ({
			tierId: tier.id,
			modelName: tier.modelName,
			price: tier.x402Price,
		})),
	}),
);

app.get("/api/pricing", (context) =>
	context.json({
		primaryModelDisplayName,
		primaryModelDocsUrl,
		primaryModelStatus: "GLM 4.7 Flash is the baseline Workers AI model for Watchpoint.",
		tiers: listPricingTiers(),
	}),
);

app.post("/api/demo/watch", async (context) => {
	const payload = await safeJson(context.req.raw);
	const detail = await createWatch(context.env, payload);
	if (detail === null) {
		return context.json({ error: "Invalid watch payload." }, 400);
	}

	return context.json(detail, 201);
});

app.use("/api/watch/tiers/standard", createPaidRouteMiddleware("standard"));
app.use("/api/watch/tiers/premium", createPaidRouteMiddleware("premium"));

app.post("/api/watch/tiers/:tierId", async (context) => {
	const tierId = context.req.param("tierId");
	const tier = getPricingTier(tierId);
	if (tier === null) {
		return context.json({ error: "Unknown pricing tier." }, 404);
	}

	const payload = await safeJson(context.req.raw);
	const detail = await createWatch(context.env, payload);
	if (detail === null) {
		return context.json({ error: "Invalid watch payload." }, 400);
	}

	return context.json(
		{
			...detail,
			x402: {
				tierId: tier.id,
				price: tier.x402Price,
				modelName: tier.modelName,
			},
		},
		201,
	);
});

app.get("/api/watch/:watchId", async (context) => {
	const detail = await getWatchDetail(context.env, context.req.param("watchId"));
	if (detail === null) {
		return context.json({ error: "Watch not found." }, 404);
	}

	return context.json(detail);
});

app.post("/api/watch/:watchId/rescan", async (context) => {
	const detail = await triggerRescan(context.env, context.req.param("watchId"));
	if (detail === null) {
		return context.json({ error: "Watch not found." }, 404);
	}

	return context.json(detail, 202);
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const agentResponse = await routeAgentRequest(request, env);
		if (agentResponse !== null) {
			return agentResponse;
		}

		const requestUrl = new URL(request.url);
		if (requestUrl.pathname.startsWith("/mcp")) {
			return mcpHandler.fetch(request, env, ctx);
		}

		if (requestUrl.pathname.startsWith("/api/")) {
			return app.fetch(request, env, ctx);
		}

		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;

export { WatchAgent, WatchWorkflow, WatchpointMcpAgent };

async function safeJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		return null;
	}
}

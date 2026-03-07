import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer, type PaymentRequirements } from "@x402/hono";
import type { MiddlewareHandler } from "hono";
import { getPricingTier, type PricingTierId } from "./pricing";

export const watchpointDevPaymentHeader = "x-watchpoint-dev-payment";

type AppMiddleware = MiddlewareHandler<{ Bindings: Env }>;

type CachedServer = {
	server: x402ResourceServer;
	initialization: Promise<void> | null;
};

const serverCache = new Map<string, CachedServer>();

export function createPaidRouteMiddleware(tierId: PricingTierId): AppMiddleware {
	return async (context, next) => {
		const bypassValue = context.env.WATCHPOINT_DEV_PAYMENT_BYPASS;
		if (context.req.header(watchpointDevPaymentHeader) === bypassValue) {
			await next();
			return;
		}

		const pricingTier = getPricingTier(tierId);
		if (pricingTier === null) {
			return context.json({ error: "Unknown pricing tier." }, 404);
		}

		await ensureResourceServerInitialized(context.env);

		const routes = {
			[`POST /api/watch/tiers/${pricingTier.id}`]: {
				accepts: buildTierPaymentConfig(context.env, tierId),
				description: `Create a ${pricingTier.displayName} watch pack`,
				mimeType: "application/json",
			},
		};
		const middleware = paymentMiddleware(
			routes,
			getResourceServer(context.env).server,
			undefined,
			undefined,
			false,
		);

		return middleware(context, next);
	};
}

export async function buildTierPaymentRequirements(
	env: Pick<
		Env,
		"WATCHPOINT_FACILITATOR_URL" | "WATCHPOINT_X402_NETWORK" | "WATCHPOINT_X402_PAY_TO"
	>,
	tierId: PricingTierId,
): Promise<PaymentRequirements[]> {
	const pricingTier = getPricingTier(tierId);
	if (pricingTier === null) {
		throw new Error(`Unknown pricing tier ${tierId}`);
	}

	await ensureResourceServerInitialized(env);
	return getResourceServer(env).server.buildPaymentRequirements(buildTierPaymentConfig(env, tierId));
}

function getResourceServer(
	env: Pick<
		Env,
		"WATCHPOINT_FACILITATOR_URL" | "WATCHPOINT_X402_NETWORK" | "WATCHPOINT_X402_PAY_TO"
	>,
): CachedServer {
	const cacheKey = `${env.WATCHPOINT_FACILITATOR_URL}:${env.WATCHPOINT_X402_NETWORK}:${env.WATCHPOINT_X402_PAY_TO}`;
	const cached = serverCache.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	const facilitatorClient = new HTTPFacilitatorClient({
		url: env.WATCHPOINT_FACILITATOR_URL,
	});
	const server = new x402ResourceServer(facilitatorClient).register(
		env.WATCHPOINT_X402_NETWORK,
		new ExactEvmScheme(),
	);

	const nextCache = {
		server,
		initialization: null,
	};
	serverCache.set(cacheKey, nextCache);
	return nextCache;
}

async function ensureResourceServerInitialized(
	env: Pick<
		Env,
		"WATCHPOINT_FACILITATOR_URL" | "WATCHPOINT_X402_NETWORK" | "WATCHPOINT_X402_PAY_TO"
	>,
): Promise<void> {
	const cached = getResourceServer(env);
	if (cached.initialization === null) {
		cached.initialization = cached.server.initialize();
	}

	await cached.initialization;
}

function buildTierPaymentConfig(
	env: Pick<Env, "WATCHPOINT_X402_NETWORK" | "WATCHPOINT_X402_PAY_TO">,
	tierId: PricingTierId,
): {
	scheme: "exact";
	network: Env["WATCHPOINT_X402_NETWORK"];
	payTo: string;
	price: NonNullable<ReturnType<typeof getPricingTier>>["x402Price"];
} {
	const pricingTier = getPricingTier(tierId);
	if (pricingTier === null) {
		throw new Error(`Unknown pricing tier ${tierId}`);
	}

	return {
		scheme: "exact",
		network: env.WATCHPOINT_X402_NETWORK,
		payTo: env.WATCHPOINT_X402_PAY_TO,
		price: pricingTier.x402Price,
	};
}

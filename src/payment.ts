import type { MiddlewareHandler } from "hono";
import { getPricingTier, type PricingTierId } from "./pricing";

export const watchpointDevPaymentHeader = "x-watchpoint-dev-payment";

type AppMiddleware = MiddlewareHandler<{ Bindings: Env }>;

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

		try {
			await context.req.raw.arrayBuffer();
		} catch {
			// Ignore body read failures while returning the payment challenge.
		}

		return context.json(
			{
				x402Version: 1,
				error: "Payment required",
				accepts: [
					{
						scheme: "exact",
						price: pricingTier.x402Price,
						network: context.env.WATCHPOINT_X402_NETWORK,
						payTo: context.env.WATCHPOINT_X402_PAY_TO,
					},
				],
				resource: {
					description: `Create a ${pricingTier.displayName} watch pack`,
					mimeType: "application/json",
				},
			},
			402,
		);
	};
}

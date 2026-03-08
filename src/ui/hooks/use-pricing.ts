import { startTransition, useEffect, useState } from "react";
import { fetchPricing } from "../lib/api-client";
import type { PricingResponse } from "../lib/contracts";

type PricingState =
	| { status: "loading" }
	| { status: "ready"; data: PricingResponse }
	| { status: "error"; message: string };

export function usePricing(): PricingState {
	const [state, setState] = useState<PricingState>({ status: "loading" });

	useEffect(() => {
		const controller = new AbortController();

		void fetchPricing(controller.signal)
			.then((data) => {
				startTransition(() => {
					setState({
						status: "ready",
						data,
					});
				});
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) {
					return;
				}

				const message = error instanceof Error ? error.message : "Failed to load Watchpoint pricing.";
				startTransition(() => {
					setState({
						status: "error",
						message,
					});
				});
			});

		return () => {
			controller.abort();
		};
	}, []);

	return state;
}

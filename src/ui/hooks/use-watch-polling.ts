import { fetchWatchDetail } from "../lib/api-client";
import type { WatchDetail } from "../lib/contracts";

const pollIntervalMs = 1_000;
const maxWaitMs = 150_000;

export function useWatchPolling() {
	async function waitForRunCount(
		watchId: string,
		expectedRunCount: number,
		onInterim: (detail: WatchDetail) => void,
	): Promise<WatchDetail> {
		const startedAt = Date.now();

		while (Date.now() - startedAt < maxWaitMs) {
			const detail = await fetchWatchDetail(watchId);
			onInterim(detail);

			if (detail.watch.runCount >= expectedRunCount) {
				return detail;
			}

			if (detail.watch.status === "failed" && detail.watch.lastError !== null) {
				throw new Error(detail.watch.lastError);
			}

			await delay(pollIntervalMs);
		}

		throw new Error(`Timed out while waiting for watch ${watchId} after ${Math.round(maxWaitMs / 1_000)} seconds.`);
	}

	return {
		waitForRunCount,
	};
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

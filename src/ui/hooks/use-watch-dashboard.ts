import { startTransition, useState } from "react";
import { ApiClientError, createDemoWatch, triggerManualRescan } from "../lib/api-client";
import type { WatchDetail } from "../lib/contracts";
import { useWatchPolling } from "./use-watch-polling";

export type NoticeTone = "neutral" | "success" | "warning" | "error";

export type DashboardNotice = {
	tone: NoticeTone;
	message: string;
};

type SubmissionState =
	| { phase: "idle" }
	| { phase: "creating" }
	| { phase: "rescanning" };

export function useWatchDashboard() {
	const { waitForRunCount } = useWatchPolling();
	const [detail, setDetail] = useState<WatchDetail | null>(null);
	const [notice, setNotice] = useState<DashboardNotice | null>(null);
	const [submission, setSubmission] = useState<SubmissionState>({ phase: "idle" });

	async function createWatch(targetUrl: string, tierId: "standard" | "premium"): Promise<void> {
		setSubmission({ phase: "creating" });
		setNotice({
			tone: "neutral",
			message: "Creating demo watch and queueing the baseline workflow.",
		});

		try {
			const created = await createDemoWatch(targetUrl, tierId);
			startTransition(() => {
				setDetail(created);
			});

			const completed = await waitForRunCount(created.watch.id, created.watch.runCount + 1, (nextDetail) => {
				startTransition(() => {
					setDetail(nextDetail);
				});
			});

			startTransition(() => {
				setDetail(completed);
				setNotice({
					tone: "success",
					message: `Baseline scan complete. Remaining runs: ${completed.watch.remainingRuns}.`,
				});
			});
		} catch (error: unknown) {
			handleApiError(error, "Watch creation failed.");
		} finally {
			setSubmission({ phase: "idle" });
		}
	}

	async function rescanWatch(): Promise<void> {
		if (detail === null) {
			return;
		}

		setSubmission({ phase: "rescanning" });
		setNotice({
			tone: "neutral",
			message: "Queueing manual re-scan.",
		});

		try {
			const result = await triggerManualRescan(detail.watch.id);
			if ("error" in result) {
				startTransition(() => {
					setDetail(result.detail);
					setNotice({
						tone: "warning",
						message: result.error,
					});
				});
				return;
			}

			startTransition(() => {
				setDetail(result.detail);
			});

			const completed = await waitForRunCount(result.detail.watch.id, result.detail.watch.runCount + 1, (nextDetail) => {
				startTransition(() => {
					setDetail(nextDetail);
				});
			});

			startTransition(() => {
				setDetail(completed);
				setNotice({
					tone: "success",
					message: `Manual re-scan complete. Remaining runs: ${completed.watch.remainingRuns}.`,
				});
			});
		} catch (error: unknown) {
			handleApiError(error, "Manual re-scan failed.");
		} finally {
			setSubmission({ phase: "idle" });
		}
	}

	function handleApiError(error: unknown, fallbackMessage: string): void {
		const apiError = error instanceof ApiClientError ? error : null;
		const nextDetail = apiError?.detail ?? null;
		const message = error instanceof Error ? error.message : fallbackMessage;

		startTransition(() => {
			if (nextDetail !== null) {
				setDetail(nextDetail);
			}
			setNotice({
				tone: "error",
				message,
			});
		});
	}

	return {
		detail,
		notice,
		submission,
		createWatch,
		rescanWatch,
	};
}

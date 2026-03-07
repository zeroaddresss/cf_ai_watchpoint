import { AgentWorkflow, type AgentWorkflowStep } from "agents/workflows";
import type { WorkflowEvent } from "cloudflare:workers";
import { analyzeCapturedSession } from "./analysis";
import { captureSession, getFixtureCaptureFailure, CaptureSessionError } from "./capture";
import {
	createRunId,
	emptyDiffReport,
	type RunKind,
	type WatchRun,
	type WatchWorkflowParams,
	type WatchWorkflowProgress,
	type WatchWorkflowResult,
	type WorkflowTrigger,
} from "./domain";
import { getPricingTier } from "./pricing";
import type { WatchAgent } from "./watch-agent";

type ManualRescanEvent = {
	requestedAt: string;
};

export class WatchWorkflow extends AgentWorkflow<WatchAgent, WatchWorkflowParams, WatchWorkflowProgress, Env> {
	override async run(
		event: Readonly<WorkflowEvent<WatchWorkflowParams>>,
		step: AgentWorkflowStep,
	): Promise<void> {
		for (let runIndex = 0; runIndex < event.payload.includedRuns; runIndex += 1) {
			const runKind: RunKind = runIndex === 0 ? "baseline" : "rescan";
			const trigger = runIndex === 0 ? "initial" : await waitForNextTrigger(step, event.payload.cadenceMinutes);
			const startedAt = new Date().toISOString();

			await this.reportProgress({
				kind: runKind,
				status: "running",
				startedAt,
			});

			const run = await step.do(
				`capture-and-analyze-${runIndex}`,
				{
					retries: {
						limit: 2,
						delay: "5 seconds",
						backoff: "exponential",
					},
					timeout: "2 minutes",
				},
				async () =>
					this.executeRun(
						runKind,
						event.payload.targetUrl,
						event.payload.pricingTierId,
						runIndex,
						startedAt,
					),
			);

			const result: WatchWorkflowResult = {
				kind: runKind,
				trigger,
				run,
			};

			await step.reportComplete(result);
		}
	}

	private async executeRun(
		kind: RunKind,
		targetUrl: string,
		pricingTierId: string,
		runIndex: number,
		startedAt: string,
	): Promise<WatchRun> {
		const pricingTier = getPricingTier(pricingTierId);
		if (pricingTier === null) {
			throw new Error(`Unknown pricing tier ${pricingTierId}`);
		}

		try {
			const simulatedFailure = getFixtureCaptureFailure({
				targetUrl,
				runIndex,
			});
			if (simulatedFailure !== null) {
				return createFailedRun(kind, pricingTier.modelName, startedAt, targetUrl, simulatedFailure);
			}

			const session = await captureSession(this.env, {
				targetUrl,
				runIndex,
			});
			const detail = await this.agent.getWatchDetail();
			const previousRun = detail?.runs.at(-1) ?? null;
			const analysis = await analyzeCapturedSession(this.env, session, pricingTier, previousRun);
			const completedAt = new Date().toISOString();
			const firstStep = session.steps[0];
			const lastStep = session.steps.at(-1);

			return {
				id: createRunId(kind),
				kind,
				status: "succeeded",
				startedAt,
				completedAt,
				modelName: pricingTier.modelName,
				pageTitle: firstStep?.title ?? "Untitled page",
				canonicalUrl: lastStep?.url ?? targetUrl,
				contentDigest: analysis.contentDigest,
				steps: session.steps,
				narrativeSummary: analysis.narrativeSummary,
				findings: analysis.findings,
				diffReport: analysis.diffReport,
			};
		} catch (error) {
			return createFailedRun(kind, pricingTier.modelName, startedAt, targetUrl, error);
		}
	}
}

function createFailedRun(
	kind: RunKind,
	modelName: WatchRun["modelName"],
	startedAt: string,
	targetUrl: string,
	error: unknown,
): WatchRun {
	const completedAt = new Date().toISOString();
	const narrativeSummary =
		error instanceof CaptureSessionError
			? `${error.kind}: ${error.message}`
			: error instanceof Error
				? error.message
				: "Unknown scan failure";

	return {
		id: createRunId(kind),
		kind,
		status: "failed",
		startedAt,
		completedAt,
		modelName,
		pageTitle: "Scan failed",
		canonicalUrl: targetUrl,
		contentDigest: "",
		steps: [],
		narrativeSummary,
		findings: [],
		diffReport: {
			...emptyDiffReport(),
			stabilityNote: "Scan failed before diffing could complete.",
		},
	};
}

async function waitForNextTrigger(step: AgentWorkflowStep, cadenceMinutes: number): Promise<WorkflowTrigger> {
	try {
		await step.waitForEvent<ManualRescanEvent>("wait-for-manual-rescan", {
			type: "manual-rescan",
			timeout: `${cadenceMinutes} minutes`,
		});
		return "manual";
	} catch {
		return "automatic";
	}
}

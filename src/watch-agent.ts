import { Agent, callable } from "agents";
import {
	createActiveWorkflow,
	createWatchConfig,
	initialWatchState,
	markWorkflowRunning,
	toWatchDetail,
	type CreateWatchInput,
	type MonitoringWatchState,
	type WatchDetail,
	type WatchState,
	type WatchWorkflowProgress,
	type WatchWorkflowResult,
	type WorkflowTrigger,
} from "./domain";

export class WatchAgent extends Agent<Env, WatchState> {
	initialState = initialWatchState();

	@callable()
	async createWatch(input: CreateWatchInput): Promise<WatchDetail> {
		if (this.state.phase === "monitoring") {
			return this.requireWatchDetail();
		}

		const createdAt = new Date().toISOString();
		const watchConfig = createWatchConfig(this.name, input, createdAt);
		const workflowId = await this.runWorkflow("WATCH_WORKFLOW", {
			targetUrl: watchConfig.targetUrl,
			pricingTierId: watchConfig.pricingTierId,
			includedRuns: watchConfig.includedRuns,
			cadenceMinutes: watchConfig.cadenceMinutes,
		});

		this.setState({
			phase: "monitoring",
			config: watchConfig,
			runs: [],
			remainingRuns: watchConfig.includedRuns,
			activeWorkflow: createActiveWorkflow(workflowId, "baseline", "initial", createdAt),
			lastError: null,
		});

		return this.requireWatchDetail();
	}

	@callable()
	async getWatchDetail(): Promise<WatchDetail | null> {
		return toWatchDetail(this.state);
	}

	@callable()
	async performManualRescan(): Promise<WatchDetail | null> {
		if (this.state.phase !== "monitoring") {
			return null;
		}

		if (this.state.activeWorkflow !== null) {
			const requestedAt = new Date().toISOString();
			await this.sendWorkflowEvent("WATCH_WORKFLOW", this.state.activeWorkflow.workflowId, {
				type: "manual-rescan",
				payload: {
					requestedAt,
				},
			});

			this.setState({
				...this.state,
				activeWorkflow: {
					...this.state.activeWorkflow,
					kind: "rescan",
					trigger: "manual",
					status: "queued",
					queuedAt: requestedAt,
					startedAt: null,
				},
			});
		}

		return this.requireWatchDetail();
	}

	override async onWorkflowProgress(
		workflowName: string,
		workflowId: string,
		progress: unknown,
	): Promise<void> {
		if (workflowName !== "WATCH_WORKFLOW" || this.state.phase !== "monitoring") {
			return;
		}

		if (this.state.activeWorkflow === null || this.state.activeWorkflow.workflowId !== workflowId) {
			return;
		}

		const typedProgress = parseWorkflowProgress(progress);
		if (typedProgress === null) {
			return;
		}

		this.setState({
			...this.state,
			activeWorkflow: markWorkflowRunning(this.state.activeWorkflow, typedProgress),
		});
	}

	override async onWorkflowComplete(
		workflowName: string,
		workflowId: string,
		result?: unknown,
	): Promise<void> {
		if (workflowName !== "WATCH_WORKFLOW" || this.state.phase !== "monitoring") {
			return;
		}

		if (this.state.activeWorkflow === null || this.state.activeWorkflow.workflowId !== workflowId) {
			return;
		}

		const typedResult = parseWorkflowResult(result);
		if (typedResult === null) {
			return;
		}

		const remainingRuns = Math.max(this.state.remainingRuns - 1, 0);
		const shouldKeepWorkflow = remainingRuns > 0;
		const nextTrigger: WorkflowTrigger = "automatic";

		this.setState({
			...this.state,
			runs: [...this.state.runs, typedResult.run],
			remainingRuns,
			activeWorkflow: shouldKeepWorkflow
				? {
						...this.state.activeWorkflow,
						kind: "rescan",
						trigger: nextTrigger,
						status: "queued",
						queuedAt: typedResult.run.completedAt ?? new Date().toISOString(),
						startedAt: null,
					}
				: null,
			lastError: typedResult.run.status === "failed" ? typedResult.run.narrativeSummary : null,
		});
	}

	override async onWorkflowError(workflowName: string, workflowId: string, error: string): Promise<void> {
		if (workflowName !== "WATCH_WORKFLOW" || this.state.phase !== "monitoring") {
			return;
		}

		if (this.state.activeWorkflow === null || this.state.activeWorkflow.workflowId !== workflowId) {
			return;
		}

		this.setState({
			...this.state,
			activeWorkflow: null,
			lastError: error,
		});
	}

	private requireWatchDetail(): WatchDetail {
		const detail = toWatchDetail(this.state);
		if (detail === null) {
			throw new Error("Watch not initialized");
		}

		return detail;
	}
}

function parseWorkflowProgress(value: unknown): WatchWorkflowProgress | null {
	if (!isRecord(value)) {
		return null;
	}

	if (
		(value.kind !== "baseline" && value.kind !== "rescan") ||
		value.status !== "running" ||
		typeof value.startedAt !== "string"
	) {
		return null;
	}

	return {
		kind: value.kind,
		status: value.status,
		startedAt: value.startedAt,
	};
}

function parseWorkflowResult(value: unknown): WatchWorkflowResult | null {
	if (!isRecord(value)) {
		return null;
	}

	if ((value.kind !== "baseline" && value.kind !== "rescan") || !isRecord(value.run)) {
		return null;
	}

	const trigger = value.trigger;
	if (trigger !== "initial" && trigger !== "automatic" && trigger !== "manual") {
		return null;
	}

	const parsedRun = parseWatchRun(value.run);
	if (parsedRun === null) {
		return null;
	}

	return {
		kind: value.kind,
		trigger,
		run: parsedRun,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseWatchRun(value: unknown): WatchWorkflowResult["run"] | null {
	if (!isRecord(value)) {
		return null;
	}

	const completedAt = value.completedAt;
	const modelName = parseModelName(value.modelName);
	const diffReport = parseDiffReport(value.diffReport);
	const steps = parseCapturedSteps(value.steps);
	const findings = parseFindings(value.findings);
	if (
		typeof value.id !== "string" ||
		(value.kind !== "baseline" && value.kind !== "rescan") ||
		(value.status !== "queued" &&
			value.status !== "running" &&
			value.status !== "succeeded" &&
			value.status !== "failed") ||
		typeof value.startedAt !== "string" ||
		(completedAt !== null && typeof completedAt !== "string") ||
		typeof value.pageTitle !== "string" ||
		typeof value.canonicalUrl !== "string" ||
		typeof value.contentDigest !== "string" ||
		typeof value.narrativeSummary !== "string" ||
		modelName === null ||
		steps === null ||
		findings === null ||
		diffReport === null
	) {
		return null;
	}

	return {
		id: value.id,
		kind: value.kind,
		status: value.status,
		startedAt: value.startedAt,
		completedAt,
		modelName,
		pageTitle: value.pageTitle,
		canonicalUrl: value.canonicalUrl,
		contentDigest: value.contentDigest,
		steps,
		narrativeSummary: value.narrativeSummary,
		findings,
		diffReport,
	};
}

function parseModelName(value: unknown): WatchWorkflowResult["run"]["modelName"] | null {
	if (value === "@cf/zai-org/glm-4.5-air-fp8" || value === "@cf/meta/llama-3.3-70b-instruct-fp8-fast") {
		return value;
	}

	return null;
}

function parseCapturedSteps(value: unknown): WatchWorkflowResult["run"]["steps"] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	const parsed = value.map(parseCapturedStep);
	return parsed.every((step) => step !== null) ? parsed : null;
}

function parseCapturedStep(value: unknown): WatchWorkflowResult["run"]["steps"][number] | null {
	if (!isRecord(value)) {
		return null;
	}

	const screenshotDataUrl = value.screenshotDataUrl;
	if (
		typeof value.stepIndex !== "number" ||
		typeof value.url !== "string" ||
		typeof value.title !== "string" ||
		typeof value.text !== "string" ||
		typeof value.textDigest !== "string" ||
		!Array.isArray(value.primaryActions) ||
		!value.primaryActions.every((action) => typeof action === "string") ||
		(screenshotDataUrl !== null && typeof screenshotDataUrl !== "string") ||
		typeof value.capturedAt !== "string"
	) {
		return null;
	}

	return {
		stepIndex: value.stepIndex,
		url: value.url,
		title: value.title,
		text: value.text,
		textDigest: value.textDigest,
		primaryActions: value.primaryActions,
		screenshotDataUrl,
		capturedAt: value.capturedAt,
	};
}

function parseFindings(value: unknown): WatchWorkflowResult["run"]["findings"] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	const parsed = value.map(parseFinding);
	return parsed.every((finding) => finding !== null) ? parsed : null;
}

function parseFinding(value: unknown): WatchWorkflowResult["run"]["findings"][number] | null {
	if (!isRecord(value)) {
		return null;
	}

	if (
		typeof value.id !== "string" ||
		typeof value.title !== "string" ||
		(value.severity !== "info" && value.severity !== "warn" && value.severity !== "critical") ||
		typeof value.evidence !== "string"
	) {
		return null;
	}

	return {
		id: value.id,
		title: value.title,
		severity: value.severity,
		evidence: value.evidence,
	};
}

function parseDiffReport(value: unknown): WatchWorkflowResult["run"]["diffReport"] | null {
	if (!isRecord(value)) {
		return null;
	}

	const newIssues = parseFindings(value.newIssues);
	const resolvedIssues = parseFindings(value.resolvedIssues);
	const regressions = parseFindings(value.regressions);
	if (
		typeof value.hasChanges !== "boolean" ||
		newIssues === null ||
		resolvedIssues === null ||
		regressions === null ||
		typeof value.stabilityNote !== "string"
	) {
		return null;
	}

	return {
		hasChanges: value.hasChanges,
		newIssues,
		resolvedIssues,
		regressions,
		stabilityNote: value.stabilityNote,
	};
}

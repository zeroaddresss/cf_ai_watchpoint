import { getPricingTier, type ModelName, type PricingTier, type PricingTierId } from "./pricing";

export type WatchId = string;
export type RunId = string;
export type WorkflowId = string;

export type FindingSeverity = "info" | "warn" | "critical";
export type WatchPhase = "idle" | "monitoring";
export type RunKind = "baseline" | "rescan";
export type RunStatus = "queued" | "running" | "succeeded" | "failed";
export type WorkflowTrigger = "initial" | "automatic" | "manual";
export type WorkflowStatus = "queued" | "running" | "waiting";
export type CaptureWarningCode = "screenshot-unavailable";
export type ManualRescanReason = "manual" | "already-running" | "exhausted";

export type WatchFinding = {
	id: string;
	title: string;
	severity: FindingSeverity;
	evidence: string;
};

export type DiffReport = {
	hasChanges: boolean;
	newIssues: WatchFinding[];
	resolvedIssues: WatchFinding[];
	regressions: WatchFinding[];
	stabilityNote: string;
};

export type CaptureWarning = {
	code: CaptureWarningCode;
	message: string;
};

export type CapturedStep = {
	stepIndex: number;
	url: string;
	title: string;
	text: string;
	textDigest: string;
	primaryActions: string[];
	screenshotDataUrl: string | null;
	warnings: CaptureWarning[];
	capturedAt: string;
};

export type WatchRun = {
	id: RunId;
	kind: RunKind;
	status: RunStatus;
	startedAt: string;
	completedAt: string | null;
	modelName: ModelName;
	pageTitle: string;
	canonicalUrl: string;
	contentDigest: string;
	steps: CapturedStep[];
	narrativeSummary: string;
	findings: WatchFinding[];
	diffReport: DiffReport;
};

export type WatchConfig = {
	id: WatchId;
	targetUrl: string;
	pricingTierId: PricingTierId;
	modelName: ModelName;
	includedRuns: number;
	cadenceMinutes: number;
	createdAt: string;
};

export type ActiveWorkflow = {
	workflowId: WorkflowId;
	workflowName: "WATCH_WORKFLOW";
	kind: RunKind;
	trigger: WorkflowTrigger;
	status: WorkflowStatus;
	queuedAt: string;
	startedAt: string | null;
	nextScheduledAt: string | null;
};

export type WatchWorkflowProgress = {
	kind: RunKind;
	status: "running";
	startedAt: string;
};

export type WatchWorkflowParams = {
	targetUrl: string;
	pricingTierId: PricingTierId;
	includedRuns: number;
	cadenceMinutes: number;
};

export type WatchWorkflowResult = {
	kind: RunKind;
	trigger: WorkflowTrigger;
	run: WatchRun;
};

export type IdleWatchState = {
	phase: "idle";
};

export type MonitoringWatchState = {
	phase: "monitoring";
	config: WatchConfig;
	runs: WatchRun[];
	remainingRuns: number;
	activeWorkflow: ActiveWorkflow | null;
	lastError: string | null;
};

export type WatchState = IdleWatchState | MonitoringWatchState;

export type WatchSnapshot = {
	id: string;
	targetUrl: string;
	status: WorkflowStatus | "active" | "exhausted" | "failed";
	pricingTier: PricingTier;
	remainingRuns: number;
	createdAt: string;
	lastRunAt: string | null;
	runCount: number;
	lastError: string | null;
	activeWorkflow: ActiveWorkflow | null;
};

export type WatchDetail = {
	watch: WatchSnapshot;
	runs: WatchRun[];
};

export type ManualRescanResult = {
	accepted: boolean;
	reason: ManualRescanReason;
	detail: WatchDetail;
};

export type CreateWatchInput = {
	targetUrl: string;
	tierId: PricingTierId;
};

export type CaptureTarget = {
	targetUrl: string;
	runIndex: number;
};

export function createRunId(kind: RunKind): RunId {
	return `${kind}_${crypto.randomUUID()}`;
}

export function parseCreateWatchInput(value: unknown): CreateWatchInput | null {
	if (!isRecord(value)) {
		return null;
	}

	const targetUrl = value.targetUrl;
	const tierId = value.tierId;
	if (typeof targetUrl !== "string" || typeof tierId !== "string") {
		return null;
	}

	const tier = getPricingTier(tierId);
	if (tier === null) {
		return null;
	}

	const normalizedTargetUrl = normalizeTargetUrl(targetUrl);
	if (normalizedTargetUrl === null) {
		return null;
	}

	return {
		targetUrl: normalizedTargetUrl,
		tierId: tier.id,
	};
}

export function createWatchConfig(id: WatchId, input: CreateWatchInput, createdAt: string): WatchConfig {
	const pricingTier = getPricingTier(input.tierId);
	if (pricingTier === null) {
		throw new Error(`Unknown pricing tier: ${input.tierId}`);
	}

	return {
		id,
		targetUrl: input.targetUrl,
		pricingTierId: pricingTier.id,
		modelName: pricingTier.modelName,
		includedRuns: pricingTier.includedRuns,
		cadenceMinutes: pricingTier.cadenceMinutes,
		createdAt,
	};
}

export function createActiveWorkflow(
	workflowId: WorkflowId,
	kind: RunKind,
	trigger: WorkflowTrigger,
	queuedAt: string,
): ActiveWorkflow {
	return {
		workflowId,
		workflowName: "WATCH_WORKFLOW",
		kind,
		trigger,
		status: "queued",
		queuedAt,
		startedAt: null,
		nextScheduledAt: null,
	};
}

export function markWorkflowRunning(
	workflow: ActiveWorkflow,
	progress: WatchWorkflowProgress,
): ActiveWorkflow {
	return {
		...workflow,
		status: progress.status,
		startedAt: progress.startedAt,
		nextScheduledAt: null,
	};
}

export function markWorkflowQueued(
	workflow: ActiveWorkflow,
	kind: RunKind,
	trigger: WorkflowTrigger,
	queuedAt: string,
): ActiveWorkflow {
	return {
		...workflow,
		kind,
		trigger,
		status: "queued",
		queuedAt,
		startedAt: null,
		nextScheduledAt: null,
	};
}

export function markWorkflowWaiting(workflow: ActiveWorkflow, completedAt: string, cadenceMinutes: number): ActiveWorkflow {
	return {
		...workflow,
		kind: "rescan",
		trigger: "automatic",
		status: "waiting",
		queuedAt: completedAt,
		startedAt: null,
		nextScheduledAt: addMinutesIso(completedAt, cadenceMinutes),
	};
}

export function initialWatchState(): WatchState {
	return { phase: "idle" };
}

export function toWatchDetail(state: WatchState): WatchDetail | null {
	if (state.phase === "idle") {
		return null;
	}

	const pricingTier = getPricingTier(state.config.pricingTierId);
	if (pricingTier === null) {
		return null;
	}

	const lastRun = state.runs.at(-1);
	return {
		watch: {
			id: state.config.id,
			targetUrl: state.config.targetUrl,
			status: deriveWatchStatus(state),
			pricingTier,
			remainingRuns: state.remainingRuns,
			createdAt: state.config.createdAt,
			lastRunAt: lastRun?.completedAt ?? null,
			runCount: state.runs.length,
			lastError: state.lastError,
			activeWorkflow: state.activeWorkflow,
		},
		runs: state.runs,
	};
}

export function emptyDiffReport(): DiffReport {
	return {
		hasChanges: false,
		newIssues: [],
		resolvedIssues: [],
		regressions: [],
		stabilityNote: "Baseline established.",
	};
}

export function createDiffReport(previousRun: WatchRun | null, currentFindings: WatchFinding[]): DiffReport {
	if (previousRun === null) {
		return emptyDiffReport();
	}

	const previousById = new Map(previousRun.findings.map((finding) => [finding.id, finding]));
	const currentById = new Map(currentFindings.map((finding) => [finding.id, finding]));

	const newIssues = currentFindings.filter((finding) => !previousById.has(finding.id));
	const resolvedIssues = previousRun.findings.filter((finding) => !currentById.has(finding.id));
	const regressions = currentFindings.filter((finding) => {
		const previous = previousById.get(finding.id);
		return previous !== undefined && severityScore(finding.severity) > severityScore(previous.severity);
	});

	const hasChanges = newIssues.length > 0 || resolvedIssues.length > 0 || regressions.length > 0;

	return {
		hasChanges,
		newIssues,
		resolvedIssues,
		regressions,
		stabilityNote: hasChanges
			? "Meaningful changes detected since the previous scan."
			: "No significant changes detected since the previous scan.",
	};
}

function deriveWatchStatus(state: MonitoringWatchState): WatchSnapshot["status"] {
	if (state.activeWorkflow !== null) {
		return state.activeWorkflow.status;
	}

	if (state.lastError !== null && state.runs.length === 0) {
		return "failed";
	}

	if (state.remainingRuns === 0) {
		return state.lastError === null ? "exhausted" : "failed";
	}

	return "active";
}

function normalizeTargetUrl(targetUrl: string): string | null {
	try {
		const parsedUrl = new URL(targetUrl);
		if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
			return null;
		}

		parsedUrl.hash = "";
		return parsedUrl.toString();
	} catch {
		return null;
	}
}

function severityScore(severity: FindingSeverity): number {
	switch (severity) {
		case "info":
			return 0;
		case "warn":
			return 1;
		case "critical":
			return 2;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function addMinutesIso(timestamp: string, minutes: number): string {
	const parsedTimestamp = Date.parse(timestamp);
	if (Number.isNaN(parsedTimestamp)) {
		return timestamp;
	}

	return new Date(parsedTimestamp + minutes * 60_000).toISOString();
}

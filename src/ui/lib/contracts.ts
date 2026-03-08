import { z } from "zod";

const pricingTierSchema = z.object({
	id: z.enum(["standard", "premium"]),
	displayName: z.string(),
	x402Price: z.string(),
	includedRuns: z.number().int().nonnegative(),
	cadenceMinutes: z.number().int().positive(),
	modelName: z.string(),
	capacitySummary: z.string(),
	referenceDocsUrl: z.string().url(),
});

const captureWarningSchema = z.object({
	code: z.enum(["screenshot-unavailable"]),
	message: z.string(),
});

const capturedStepSchema = z.object({
	stepIndex: z.number().int().nonnegative(),
	url: z.string().url(),
	title: z.string(),
	text: z.string(),
	textDigest: z.string(),
	primaryActions: z.array(z.string()),
	screenshotDataUrl: z.string().nullable(),
	warnings: z.array(captureWarningSchema),
	capturedAt: z.string(),
});

const findingSchema = z.object({
	id: z.string(),
	title: z.string(),
	severity: z.enum(["info", "warn", "critical"]),
	evidence: z.string(),
});

const diffReportSchema = z.object({
	hasChanges: z.boolean(),
	newIssues: z.array(findingSchema),
	resolvedIssues: z.array(findingSchema),
	regressions: z.array(findingSchema),
	stabilityNote: z.string(),
});

const watchRunSchema = z.object({
	id: z.string(),
	kind: z.enum(["baseline", "rescan"]),
	status: z.enum(["queued", "running", "succeeded", "failed"]),
	startedAt: z.string(),
	completedAt: z.string().nullable(),
	modelName: z.string(),
	pageTitle: z.string(),
	canonicalUrl: z.string().url(),
	contentDigest: z.string(),
	steps: z.array(capturedStepSchema),
	narrativeSummary: z.string(),
	findings: z.array(findingSchema),
	diffReport: diffReportSchema,
});

const activeWorkflowSchema = z.object({
	workflowId: z.string(),
	workflowName: z.literal("WATCH_WORKFLOW"),
	kind: z.enum(["baseline", "rescan"]),
	trigger: z.enum(["initial", "automatic", "manual"]),
	status: z.enum(["queued", "running", "waiting"]),
	queuedAt: z.string(),
	startedAt: z.string().nullable(),
	nextScheduledAt: z.string().nullable(),
});

const watchSnapshotSchema = z.object({
	id: z.string(),
	targetUrl: z.string().url(),
	status: z.enum(["queued", "running", "waiting", "active", "exhausted", "failed"]),
	pricingTier: pricingTierSchema,
	remainingRuns: z.number().int().nonnegative(),
	createdAt: z.string(),
	lastRunAt: z.string().nullable(),
	runCount: z.number().int().nonnegative(),
	lastError: z.string().nullable(),
	activeWorkflow: activeWorkflowSchema.nullable(),
});

const watchDetailSchema = z.object({
	watch: watchSnapshotSchema,
	runs: z.array(watchRunSchema),
});

const pricingResponseSchema = z.object({
	primaryModelDisplayName: z.string(),
	primaryModelDocsUrl: z.string().url(),
	primaryModelStatus: z.string(),
	tiers: z.array(pricingTierSchema),
});

const rescanAcceptedSchema = z.object({
	detail: watchDetailSchema,
	rescan: z.object({
		accepted: z.literal(true),
		reason: z.literal("manual"),
	}),
});

const rescanRejectedSchema = z.object({
	error: z.string(),
	detail: watchDetailSchema,
	rescan: z.object({
		accepted: z.literal(false),
		reason: z.enum(["already-running", "exhausted"]),
	}),
});

const apiErrorSchema = z.object({
	error: z.string(),
	detail: watchDetailSchema.optional(),
});

export type PricingTier = z.infer<typeof pricingTierSchema>;
export type PricingResponse = z.infer<typeof pricingResponseSchema>;
export type WatchDetail = z.infer<typeof watchDetailSchema>;
export type WatchSnapshot = z.infer<typeof watchSnapshotSchema>;
export type WatchRun = z.infer<typeof watchRunSchema>;
export type RescanAccepted = z.infer<typeof rescanAcceptedSchema>;
export type RescanRejected = z.infer<typeof rescanRejectedSchema>;
export type ApiErrorPayload = z.infer<typeof apiErrorSchema>;

export const pricingResponseParser = pricingResponseSchema;
export const watchDetailParser = watchDetailSchema;
export const rescanAcceptedParser = rescanAcceptedSchema;
export const rescanRejectedParser = rescanRejectedSchema;
export const apiErrorParser = apiErrorSchema;

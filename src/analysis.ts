import { createDiffReport, type DiffReport, type WatchFinding, type WatchRun } from "./domain";
import { primaryModelDisplayName, type ModelName, type PricingTier } from "./pricing";
import type { CapturedSession } from "./capture";

export type RuntimeBindings = {
	AI: Ai;
	WATCHPOINT_AI_GATEWAY_ID: string;
	WATCHPOINT_USE_WORKERS_AI: string;
};

type ModelInvocationResult = string | { response: string };

type ModelInvocationRuntime = {
	run(
		model: ModelName,
		inputs: {
			messages: Array<{
				role: string;
				content: string;
			}>;
			max_tokens?: number;
			temperature?: number;
		},
		options?: AiOptions,
	): Promise<ModelInvocationResult>;
};

export type AnalysisResult = {
	narrativeSummary: string;
	findings: WatchFinding[];
	diffReport: DiffReport;
	contentDigest: string;
};

export async function analyzeCapturedSession(
	env: RuntimeBindings,
	session: CapturedSession,
	pricingTier: PricingTier,
	previousRun: WatchRun | null,
): Promise<AnalysisResult> {
	const findings = deriveFindings(session);
	const diffReport = createDiffReport(previousRun, findings);
	const contentDigest = await sha256Digest(session.steps.map((step) => step.textDigest).join(":"));
	const narrativeSummary = await summarizeWithWorkersAi(env, session, pricingTier.modelName, findings, diffReport);

	return {
		narrativeSummary,
		findings,
		diffReport,
		contentDigest,
	};
}

function deriveFindings(session: CapturedSession): WatchFinding[] {
	const normalizedText = session.steps.map((step) => step.text.toLowerCase()).join("\n");
	const primaryActions = session.steps.flatMap((step) => step.primaryActions);
	const findings: WatchFinding[] = [];

	if (normalizedText.includes("500 error") || normalizedText.includes("unavailable")) {
		findings.push({
			id: "critical-error-surface",
			title: "Critical error surface detected",
			severity: "critical",
			evidence: "Visible copy suggests a broken or unavailable user flow.",
		});
	}

	if (primaryActions.length === 0) {
		findings.push({
			id: "missing-primary-actions",
			title: "Primary actions not discoverable",
			severity: "warn",
			evidence: "No obvious CTA or button was found in the captured browsing session.",
		});
	}

	const totalTextLength = session.steps.reduce((sum, step) => sum + step.text.length, 0);
	if (totalTextLength < 80) {
		findings.push({
			id: "low-context-page",
			title: "Page has very little explanatory content",
			severity: "info",
			evidence: "The captured text is sparse and may not give enough context to users.",
		});
	}

	if (findings.length === 0) {
		findings.push({
			id: "healthy-surface",
			title: "No obvious UX regressions detected",
			severity: "info",
			evidence: "The captured flow exposes primary actions and no visible outage keywords.",
		});
	}

	return findings;
}

async function summarizeWithWorkersAi(
	env: RuntimeBindings,
	session: CapturedSession,
	modelName: ModelName,
	findings: WatchFinding[],
	diffReport: DiffReport,
): Promise<string> {
	const leadTitle = session.steps[0]?.title ?? "Unknown page";
	if (env.WATCHPOINT_USE_WORKERS_AI !== "true") {
		return fallbackNarrative(leadTitle, findings, diffReport);
	}

	if (!hasModelInvocationRuntime(env.AI)) {
		return fallbackNarrative(leadTitle, findings, diffReport);
	}

	const flowSummary = session.steps
		.map((step) => `${step.stepIndex + 1}. ${step.title} @ ${step.url} | actions: ${step.primaryActions.join(", ") || "none"}`)
		.join("\n");

	const result = await env.AI.run(
		modelName,
		{
			messages: [
				{
					role: "system",
					content:
						"You are Watchpoint, an AI web monitor. Summarize website scan results for developers. Keep the answer under 120 words and focus on user-visible impact, regressions, and next actions.",
				},
				{
					role: "user",
					content: [
						`Primary monitoring model: ${primaryModelDisplayName}.`,
						`Browsing session:\n${flowSummary}`,
						`Findings: ${findings.map((finding) => `${finding.severity}:${finding.title}`).join("; ")}`,
						`Diff summary: ${diffReport.stabilityNote}`,
					].join("\n"),
				},
			],
			max_tokens: 220,
			temperature: 0.2,
		},
		buildAiOptions(env),
	);

	return extractModelText(result).trim();
}

function buildAiOptions(env: RuntimeBindings): AiOptions | undefined {
	if (env.WATCHPOINT_AI_GATEWAY_ID.length === 0) {
		return { tags: ["watchpoint", "workers-ai"] };
	}

	return {
		tags: ["watchpoint", "workers-ai", "ai-gateway"],
		gateway: {
			id: env.WATCHPOINT_AI_GATEWAY_ID,
			collectLog: true,
			metadata: {
				component: "watchpoint",
				channel: "monitoring",
			},
		},
	};
}

function fallbackNarrative(pageTitle: string, findings: WatchFinding[], diffReport: DiffReport): string {
	const lead = findings[0];
	return `${pageTitle}: ${lead.title}. ${diffReport.stabilityNote}`;
}

function extractModelText(result: ModelInvocationResult): string {
	if (typeof result === "string") {
		return result;
	}

	if (typeof result.response === "string") {
		return result.response;
	}

	return "Watchpoint completed the scan but could not extract a model narrative.";
}

function hasModelInvocationRuntime(value: unknown): value is ModelInvocationRuntime {
	return typeof value === "object" && value !== null && "run" in value && typeof value.run === "function";
}

async function sha256Digest(value: string): Promise<string> {
	const encoded = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	const bytes = new Uint8Array(digest);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

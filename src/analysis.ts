import {
	createDiffReport,
	type DiffReport,
	type WatchFinding,
	type WatchRun,
} from "./domain";
import { primaryModelDisplayName, type ModelName, type PricingTier } from "./pricing";
import type { CapturedPage } from "./fixtures";

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

export async function analyzeCapturedPage(
	env: RuntimeBindings,
	page: CapturedPage,
	pricingTier: PricingTier,
	previousRun: WatchRun | null,
): Promise<AnalysisResult> {
	const findings = deriveFindings(page);
	const diffReport = createDiffReport(previousRun, findings);
	const contentDigest = await sha256Digest(page.text);
	const narrativeSummary = await summarizeWithWorkersAi(env, page, pricingTier.modelName, findings, diffReport);

	return {
		narrativeSummary,
		findings,
		diffReport,
		contentDigest,
	};
}

function deriveFindings(page: CapturedPage): WatchFinding[] {
	const normalizedText = page.text.toLowerCase();
	const findings: WatchFinding[] = [];

	if (normalizedText.includes("500 error") || normalizedText.includes("unavailable")) {
		findings.push({
			id: "critical-error-surface",
			title: "Critical error surface detected",
			severity: "critical",
			evidence: "Visible copy suggests a broken or unavailable user flow.",
		});
	}

	if (page.primaryActions.length === 0) {
		findings.push({
			id: "missing-primary-actions",
			title: "Primary actions not discoverable",
			severity: "warn",
			evidence: "No obvious CTA or button was found in the captured page.",
		});
	}

	if (page.text.length < 80) {
		findings.push({
			id: "low-context-page",
			title: "Page has very little explanatory content",
			severity: "info",
			evidence: "The page text is sparse and may not give enough context to users.",
		});
	}

	if (findings.length === 0) {
		findings.push({
			id: "healthy-surface",
			title: "No obvious UX regressions detected",
			severity: "info",
			evidence: "The page exposes at least one primary action and no visible outage keywords.",
		});
	}

	return findings;
}

async function summarizeWithWorkersAi(
	env: RuntimeBindings,
	page: CapturedPage,
	modelName: ModelName,
	findings: WatchFinding[],
	diffReport: DiffReport,
): Promise<string> {
	if (env.WATCHPOINT_USE_WORKERS_AI !== "true") {
		return fallbackNarrative(page.title, findings, diffReport);
	}

	if (!hasModelInvocationRuntime(env.AI)) {
		return fallbackNarrative(page.title, findings, diffReport);
	}

	const result = await env.AI.run(modelName, {
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
					`Page title: ${page.title}`,
					`Primary actions: ${page.primaryActions.join(", ") || "none"}`,
					`Findings: ${findings.map((finding) => `${finding.severity}:${finding.title}`).join("; ")}`,
					`Diff summary: ${diffReport.stabilityNote}`,
				].join("\n"),
			},
		],
		max_tokens: 220,
		temperature: 0.2,
	}, buildAiOptions(env));

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

function extractModelText(
	result: ModelInvocationResult,
): string {
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

import puppeteer, { type BrowserWorker, type Page } from "@cloudflare/puppeteer";
import type { CaptureTarget, CapturedStep, CaptureWarning } from "./domain";

export type CapturedSession = {
	targetUrl: string;
	finalUrl: string;
	steps: CapturedStep[];
	capturedAt: string;
};

export type CaptureBindings = {
	WATCHPOINT_CAPTURE_MODE: string;
	BROWSER?: BrowserWorker;
};

export type CaptureActionCandidate = {
	label: string;
	href: string | null;
};

export type CaptureFailureKind =
	| "browser-unavailable"
	| "navigation-failed"
	| "navigation-timeout"
	| "extraction-failed";

type StepSnapshot = {
	url: string;
	title: string;
	text: string;
	actions: CaptureActionCandidate[];
	capturedAt: string;
	screenshotDataUrl: string | null;
	warnings: CaptureWarning[];
};

export class CaptureSessionError extends Error {
	readonly kind: CaptureFailureKind;

	constructor(kind: CaptureFailureKind, message: string) {
		super(message);
		this.kind = kind;
		this.name = "CaptureSessionError";
	}
}

export function getFixtureCaptureFailure(target: CaptureTarget): CaptureSessionError | null {
	const parsedUrl = safeParseFixtureUrl(target.targetUrl);
	if (parsedUrl === null || parsedUrl.pathname !== "/recovering" || target.runIndex !== 0) {
		return null;
	}

	return new CaptureSessionError("navigation-timeout", "Fixture mode simulated a navigation timeout.");
}

export async function captureSession(env: CaptureBindings, target: CaptureTarget): Promise<CapturedSession> {
	if (env.WATCHPOINT_CAPTURE_MODE === "fixture") {
		return captureFixtureSession(target);
	}

	if (env.BROWSER === undefined) {
		throw new CaptureSessionError("browser-unavailable", "Browser Rendering binding is not configured.");
	}

	return captureBrowserSession(env.BROWSER, target);
}

async function captureBrowserSession(browserBinding: BrowserWorker, target: CaptureTarget): Promise<CapturedSession> {
	const browser = await puppeteer.launch(browserBinding);

	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 1440, height: 960 });
		await gotoWithClassification(page, target.targetUrl);

		const firstStep = await snapshotPage(page);
		const steps = [await toCapturedStep(firstStep, 0)];
		const nextUrl = selectFollowUpUrl(firstStep.actions, target.targetUrl, firstStep.url);

		if (nextUrl !== null) {
			await gotoWithClassification(page, nextUrl);
			const secondStep = await snapshotPage(page);
			steps.push(await toCapturedStep(secondStep, 1));
		}

		return {
			targetUrl: target.targetUrl,
			finalUrl: steps.at(-1)?.url ?? target.targetUrl,
			steps,
			capturedAt: new Date().toISOString(),
		};
	} finally {
		await browser.close();
	}
}

async function gotoWithClassification(page: Page, url: string): Promise<void> {
	try {
		await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
	} catch (error) {
		throw classifyNavigationError(error, url);
	}
}

async function snapshotPage(page: Page): Promise<StepSnapshot> {
	const url = page.url();
	const extracted = await extractPageEvidence(page);
	const screenshotResult = await takeOptionalScreenshot(page);

	return {
		url,
		title: extracted.title,
		text: extracted.text,
		actions: extracted.actions,
		capturedAt: new Date().toISOString(),
		screenshotDataUrl: screenshotResult.screenshotDataUrl,
		warnings: screenshotResult.warnings,
	};
}

async function toCapturedStep(snapshot: StepSnapshot, stepIndex: number): Promise<CapturedStep> {
	return {
		stepIndex,
		url: snapshot.url,
		title: snapshot.title,
		text: snapshot.text,
		textDigest: await sha256Digest(snapshot.text),
		primaryActions: snapshot.actions.map((action) => action.label),
		screenshotDataUrl: snapshot.screenshotDataUrl,
		warnings: snapshot.warnings,
		capturedAt: snapshot.capturedAt,
	};
}

export function selectFollowUpUrl(
	actions: CaptureActionCandidate[],
	targetUrl: string,
	currentUrl: string,
): string | null {
	const targetOrigin = new URL(targetUrl).origin;
	const currentIdentity = normalizeNavigationIdentity(currentUrl);
	let bestCandidate: { url: string; score: number } | null = null;

	for (const action of actions) {
		if (action.href === null) {
			continue;
		}

		try {
			const candidate = new URL(action.href);
			if (candidate.origin !== targetOrigin || !isHttpUrl(candidate)) {
				continue;
			}

			if (normalizeNavigationIdentity(candidate.toString()) === currentIdentity) {
				continue;
			}

			if (isDiscardedAction(action.label, candidate)) {
				continue;
			}

			const score = scoreActionCandidate(action.label, candidate);
			if (bestCandidate === null || score > bestCandidate.score) {
				bestCandidate = {
					url: canonicalizeNavigationUrl(candidate),
					score,
				};
			}
		} catch {
			continue;
		}
	}

	return bestCandidate?.url ?? null;
}

async function captureFixtureSession(target: CaptureTarget): Promise<CapturedSession> {
	const parsedUrl = safeParseFixtureUrl(target.targetUrl);
	if (parsedUrl === null) {
		throw new Error("Fixture capture only supports watchpoint.local URLs.");
	}

	const capturedAt = new Date().toISOString();
	if (parsedUrl.pathname === "/stable") {
		const firstStep = await fixtureStep(
			0,
			target.targetUrl,
			"Stable Shop",
			"Stable Shop Everything is operating normally. Browse catalog Checkout",
			["Browse catalog", "Checkout"],
			capturedAt,
		);

		return {
			targetUrl: target.targetUrl,
			finalUrl: target.targetUrl,
			steps: [firstStep],
			capturedAt,
		};
	}

	if (parsedUrl.pathname === "/regression") {
		const isBroken = target.runIndex > 0;
		const step = isBroken
			? await fixtureStep(
					0,
					target.targetUrl,
					"Checkout outage",
					"Checkout unavailable 500 error while processing payments. Try again later.",
					[],
					capturedAt,
				)
			: await fixtureStep(
					0,
					target.targetUrl,
					"Checkout ready",
					"Checkout ready Payments are available. Pay now",
					["Pay now"],
					capturedAt,
				);

		return {
			targetUrl: target.targetUrl,
			finalUrl: target.targetUrl,
			steps: [step],
			capturedAt,
		};
	}

	if (parsedUrl.pathname === "/slow-stable") {
		await delay(120);
		return {
			targetUrl: target.targetUrl,
			finalUrl: target.targetUrl,
			steps: [
				await fixtureStep(
					0,
					target.targetUrl,
					"Stable Shop",
					"Stable Shop Everything is operating normally. Browse catalog Checkout",
					["Browse catalog", "Checkout"],
					capturedAt,
				),
			],
			capturedAt,
		};
	}

	if (parsedUrl.pathname === "/screenshot-warning") {
		return {
			targetUrl: target.targetUrl,
			finalUrl: target.targetUrl,
			steps: [
				await fixtureStep(
					0,
					target.targetUrl,
					"Screenshot degraded",
					"The page loaded and the primary CTA remains visible even though screenshots failed.",
					["Try again"],
					capturedAt,
					[
						{
							code: "screenshot-unavailable",
							message: "Fixture mode simulates a screenshot failure.",
						},
					],
				),
			],
			capturedAt,
		};
	}

	if (parsedUrl.pathname === "/recovering") {
		return {
			targetUrl: target.targetUrl,
			finalUrl: target.targetUrl,
			steps: [
				await fixtureStep(
					0,
					target.targetUrl,
					"Recovery complete",
					"Recovery complete Checkout is available again. Continue to payment",
					["Continue to payment"],
					capturedAt,
				),
			],
			capturedAt,
		};
	}

	throw new Error(`No fixture is defined for ${parsedUrl.pathname}.`);
}

async function fixtureStep(
	stepIndex: number,
	url: string,
	title: string,
	text: string,
	primaryActions: string[],
	capturedAt: string,
	warnings: CaptureWarning[] = [],
): Promise<CapturedStep> {
	return {
		stepIndex,
		url,
		title,
		text,
		textDigest: await sha256Digest(text),
		primaryActions,
		screenshotDataUrl: null,
		warnings,
		capturedAt,
	};
}

async function extractPageEvidence(page: Page): Promise<{
	title: string;
	text: string;
	actions: CaptureActionCandidate[];
}> {
	try {
		return await page.evaluate(() => {
			const title = document.title.trim().length > 0 ? document.title.trim() : "Untitled page";
			const bodyText = document.body?.innerText ?? "";
			const text = bodyText.replace(/\s+/g, " ").trim();
			const actions = Array.from(document.querySelectorAll<Element>("a, button, [role='button']"))
				.map((element) => {
					const label = (element.textContent ?? "").replace(/\s+/g, " ").trim();
					if (label.length === 0) {
						return null;
					}

					if (element instanceof HTMLAnchorElement) {
						return {
							label,
							href: element.href.length > 0 ? element.href : null,
						};
					}

					return {
						label,
						href: null,
					};
				})
				.filter((candidate) => candidate !== null)
				.slice(0, 8);

			return {
				title,
				text,
				actions,
			};
		});
	} catch (error) {
		throw new CaptureSessionError("extraction-failed", toErrorMessage(error));
	}
}

async function takeOptionalScreenshot(page: Page): Promise<{
	screenshotDataUrl: string | null;
	warnings: CaptureWarning[];
}> {
	try {
		const screenshot = await page.screenshot({
			type: "jpeg",
			quality: 60,
			encoding: "base64",
		});
		return {
			screenshotDataUrl: typeof screenshot === "string" ? `data:image/jpeg;base64,${screenshot}` : null,
			warnings: [],
		};
	} catch (error) {
		return {
			screenshotDataUrl: null,
			warnings: [
				{
					code: "screenshot-unavailable",
					message: toErrorMessage(error),
				},
			],
		};
	}
}

function classifyNavigationError(error: unknown, url: string): CaptureSessionError {
	const message = toErrorMessage(error);
	if (message.toLowerCase().includes("timeout")) {
		return new CaptureSessionError("navigation-timeout", `Timed out while navigating to ${url}.`);
	}

	return new CaptureSessionError("navigation-failed", `Failed to navigate to ${url}: ${message}`);
}

function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Unknown browser error";
}

function isHttpUrl(url: URL): boolean {
	return url.protocol === "https:" || url.protocol === "http:";
}

function isDiscardedAction(label: string, candidate: URL): boolean {
	const normalized = label.toLowerCase();
	const pathname = candidate.pathname.toLowerCase();
	return (
		normalized.includes("logout") ||
		normalized.includes("sign out") ||
		normalized.includes("account") ||
		pathname.includes("logout") ||
		pathname.includes("signout") ||
		pathname.includes("account")
	);
}

function scoreActionCandidate(label: string, candidate: URL): number {
	const normalized = label.toLowerCase();
	const pathname = candidate.pathname.toLowerCase();
	let score = 0;

	if (
		normalized.includes("checkout") ||
		normalized.includes("pay") ||
		normalized.includes("buy") ||
		normalized.includes("get started") ||
		normalized.includes("start")
	) {
		score += 10;
	}

	if (normalized.includes("pricing") || normalized.includes("browse") || normalized.includes("docs")) {
		score += 6;
	}

	if (pathname.includes("checkout") || pathname.includes("pricing") || pathname.includes("product")) {
		score += 4;
	}

	if (candidate.search.length > 0) {
		score -= 1;
	}

	return score;
}

function normalizeNavigationIdentity(value: string): string {
	const parsedUrl = new URL(value);
	parsedUrl.hash = "";
	parsedUrl.search = "";
	return canonicalizeNavigationUrl(parsedUrl);
}

function canonicalizeNavigationUrl(url: URL): string {
	if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
		url.pathname = url.pathname.slice(0, -1);
	}
	url.hash = "";
	url.search = "";
	return url.toString();
}

function safeParseFixtureUrl(targetUrl: string): URL | null {
	try {
		const parsedUrl = new URL(targetUrl);
		return parsedUrl.hostname === "watchpoint.local" ? parsedUrl : null;
	} catch {
		return null;
	}
}

async function delay(milliseconds: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sha256Digest(value: string): Promise<string> {
	const encoded = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	const bytes = new Uint8Array(digest);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

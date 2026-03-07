import puppeteer, { type BrowserWorker } from "@cloudflare/puppeteer";
import type { CaptureTarget, CapturedStep } from "./domain";

export type CapturedSession = {
	targetUrl: string;
	finalUrl: string;
	steps: CapturedStep[];
	capturedAt: string;
};

type CaptureBindings = {
	WATCHPOINT_CAPTURE_MODE: string;
	BROWSER?: BrowserWorker;
};

type PrimaryActionCandidate = {
	label: string;
	href: string | null;
};

type StepSnapshot = {
	url: string;
	title: string;
	text: string;
	actions: PrimaryActionCandidate[];
	capturedAt: string;
	screenshotDataUrl: string | null;
};

export async function captureSession(env: CaptureBindings, target: CaptureTarget): Promise<CapturedSession> {
	if (env.WATCHPOINT_CAPTURE_MODE === "fixture") {
		return captureFixtureSession(target);
	}

	if (env.BROWSER === undefined) {
		throw new Error("Browser Rendering binding is not configured.");
	}

	return captureBrowserSession(env.BROWSER, target);
}

async function captureBrowserSession(browserBinding: BrowserWorker, target: CaptureTarget): Promise<CapturedSession> {
	const browser = await puppeteer.launch(browserBinding);

	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 1440, height: 960 });
		await page.goto(target.targetUrl, { waitUntil: "networkidle2" });

		const firstStep = await snapshotPage(page);
		const steps = [await toCapturedStep(firstStep, 0)];
		const nextUrl = selectFollowUpUrl(firstStep.actions, target.targetUrl, firstStep.url);

		if (nextUrl !== null) {
			await page.goto(nextUrl, { waitUntil: "networkidle2" });
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

async function snapshotPage(page: import("@cloudflare/puppeteer").Page): Promise<StepSnapshot> {
	const url = page.url();
	const extracted = await page.evaluate(() => {
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
			.slice(0, 4);

		return {
			title,
			text,
			actions,
		};
	});

	const screenshot = await page.screenshot({
		type: "jpeg",
		quality: 60,
		encoding: "base64",
	});

	return {
		url,
		title: extracted.title,
		text: extracted.text,
		actions: extracted.actions,
		capturedAt: new Date().toISOString(),
		screenshotDataUrl: typeof screenshot === "string" ? `data:image/jpeg;base64,${screenshot}` : null,
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
		capturedAt: snapshot.capturedAt,
	};
}

function selectFollowUpUrl(
	actions: PrimaryActionCandidate[],
	targetUrl: string,
	currentUrl: string,
): string | null {
	const targetOrigin = new URL(targetUrl).origin;

	for (const action of actions) {
		if (action.href === null) {
			continue;
		}

		try {
			const candidate = new URL(action.href);
			if (candidate.origin !== targetOrigin) {
				continue;
			}

			if (candidate.toString() === currentUrl) {
				continue;
			}

			return candidate.toString();
		} catch {
			continue;
		}
	}

	return null;
}

async function captureFixtureSession(target: CaptureTarget): Promise<CapturedSession> {
	const parsedUrl = new URL(target.targetUrl);
	if (parsedUrl.hostname !== "watchpoint.local") {
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

	throw new Error(`No fixture is defined for ${parsedUrl.pathname}.`);
}

async function fixtureStep(
	stepIndex: number,
	url: string,
	title: string,
	text: string,
	primaryActions: string[],
	capturedAt: string,
): Promise<CapturedStep> {
	return {
		stepIndex,
		url,
		title,
		text,
		textDigest: await sha256Digest(text),
		primaryActions,
		screenshotDataUrl: null,
		capturedAt,
	};
}

async function sha256Digest(value: string): Promise<string> {
	const encoded = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	const bytes = new Uint8Array(digest);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

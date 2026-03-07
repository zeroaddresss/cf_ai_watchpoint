import type { CaptureTarget } from "./domain";

export type CapturedPage = {
	url: string;
	title: string;
	text: string;
	html: string;
	primaryActions: string[];
	capturedAt: string;
};

export async function capturePage(target: CaptureTarget): Promise<CapturedPage> {
	const fixture = getFixturePage(target);
	if (fixture !== null) {
		return fixture;
	}

	const response = await fetch(target.targetUrl, {
		headers: {
			"user-agent": "cf_ai_watchpoint/0.0.0",
		},
	});
	const html = await response.text();
	return {
		url: target.targetUrl,
		title: extractTitle(html),
		text: extractText(html),
		html,
		primaryActions: extractPrimaryActions(html),
		capturedAt: new Date().toISOString(),
	};
}

function getFixturePage(target: CaptureTarget): CapturedPage | null {
	const parsedUrl = new URL(target.targetUrl);
	if (parsedUrl.hostname !== "watchpoint.local") {
		return null;
	}

	const now = new Date().toISOString();
	if (parsedUrl.pathname === "/stable") {
		const html = `
			<html>
				<head><title>Stable Shop</title></head>
				<body>
					<h1>Stable Shop</h1>
					<p>Everything is operating normally.</p>
					<a href="/catalog">Browse catalog</a>
					<button>Checkout</button>
				</body>
			</html>
		`;

		return {
			url: target.targetUrl,
			title: "Stable Shop",
			text: extractText(html),
			html,
			primaryActions: ["Browse catalog", "Checkout"],
			capturedAt: now,
		};
	}

	if (parsedUrl.pathname === "/regression") {
		const isBroken = target.runIndex > 0;
		const html = isBroken
			? `
				<html>
					<head><title>Checkout outage</title></head>
					<body>
						<h1>Checkout unavailable</h1>
						<p>500 error while processing payments.</p>
						<div>Try again later.</div>
					</body>
				</html>
			`
			: `
				<html>
					<head><title>Checkout ready</title></head>
					<body>
						<h1>Checkout ready</h1>
						<p>Payments are available.</p>
						<button>Pay now</button>
					</body>
				</html>
			`;

		return {
			url: target.targetUrl,
			title: isBroken ? "Checkout outage" : "Checkout ready",
			text: extractText(html),
			html,
			primaryActions: isBroken ? [] : ["Pay now"],
			capturedAt: now,
		};
	}

	return null;
}

function extractText(html: string): string {
	const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
	const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
	return withoutStyles.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTitle(html: string): string {
	const match = html.match(/<title>(.*?)<\/title>/i);
	return match?.[1]?.trim() ?? "Untitled page";
}

function extractPrimaryActions(html: string): string[] {
	const matches = html.match(/<(a|button)[^>]*>(.*?)<\/(a|button)>/gi) ?? [];
	return matches
		.map((match) => match.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
		.filter((value) => value.length > 0)
		.slice(0, 4);
}

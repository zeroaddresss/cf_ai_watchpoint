const targetUrlInput = document.getElementById("targetUrl");
const tierSelect = document.getElementById("tierId");
const statusNode = document.getElementById("status");
const timelineNode = document.getElementById("timeline");
const tiersNode = document.getElementById("tiers");
const curlSnippetNode = document.getElementById("curl-snippet");
const form = document.getElementById("watch-form");
const rescanButton = document.getElementById("rescan-button");

let currentWatchId = null;
let pricing = [];

init().catch((error) => {
	statusNode.textContent = error instanceof Error ? error.message : "Failed to bootstrap Watchpoint.";
});

async function init() {
	const response = await fetch("/api/pricing");
	const payload = await response.json();
	pricing = payload.tiers;

	for (const tier of pricing) {
		const option = document.createElement("option");
		option.value = tier.id;
		option.textContent = `${tier.displayName} · ${tier.x402Price} · ${tier.modelName}`;
		tierSelect.append(option);
	}

	renderPricingCards(pricing, payload.primaryModelDisplayName, payload.primaryModelDocsUrl);
	renderCurlSnippet();
}

form.addEventListener("submit", async (event) => {
	event.preventDefault();
	statusNode.textContent = "Creating demo watch...";

	const response = await fetch("/api/demo/watch", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({
			targetUrl: targetUrlInput.value,
			tierId: tierSelect.value,
		}),
	});

	const detail = await response.json();
	if (!response.ok) {
		statusNode.textContent = detail.error ?? "Watch creation failed.";
		return;
	}

	currentWatchId = detail.watch.id;
	statusNode.textContent = `Watch ${detail.watch.id} created. Remaining runs: ${detail.watch.remainingRuns}.`;
	rescanButton.disabled = false;
	renderDetail(detail);
	renderCurlSnippet();
});

rescanButton.addEventListener("click", async () => {
	if (!currentWatchId) {
		return;
	}

	statusNode.textContent = "Running manual re-scan...";
	const response = await fetch(`/api/watch/${currentWatchId}/rescan`, {
		method: "POST",
	});
	const detail = await response.json();
	if (!response.ok) {
		statusNode.textContent = detail.error ?? "Re-scan failed.";
		return;
	}

	statusNode.textContent = `Re-scan complete. Remaining runs: ${detail.watch.remainingRuns}.`;
	renderDetail(detail);
});

function renderPricingCards(tiers, primaryModelDisplayName, primaryModelDocsUrl) {
	tiersNode.innerHTML = "";
	for (const tier of tiers) {
		const card = document.createElement("article");
		card.className = "card";
		card.innerHTML = `
			<strong>${tier.displayName}</strong>
			<p>${tier.capacitySummary}</p>
			<p><strong>x402:</strong> ${tier.x402Price}</p>
			<p><strong>Workers AI model:</strong> ${tier.modelName}</p>
			<p><strong>Included runs:</strong> ${tier.includedRuns}</p>
			<p><strong>Primary model:</strong> <a href="${primaryModelDocsUrl}" target="_blank" rel="noreferrer">${primaryModelDisplayName}</a></p>
		`;
		tiersNode.append(card);
	}
}

function renderCurlSnippet() {
	const tierId = tierSelect.value || "standard";
	curlSnippetNode.textContent = `curl -X POST ${window.location.origin}/api/watch/tiers/${tierId} \\
  -H 'content-type: application/json' \\
  -H 'x-watchpoint-dev-payment: watchpoint-local-paid' \\
  -d '${JSON.stringify({ targetUrl: targetUrlInput.value || "https://example.com", tierId }, null, 2)}'`;
}

tierSelect.addEventListener("change", renderCurlSnippet);
targetUrlInput.addEventListener("input", renderCurlSnippet);

function renderDetail(detail) {
	timelineNode.innerHTML = "";
	for (const run of detail.runs.toReversed()) {
		const card = document.createElement("article");
		card.className = "card";
		const issues = run.findings.map((finding) => `${finding.severity}: ${finding.title}`).join("<br />");
		card.innerHTML = `
			<strong>${run.kind.toUpperCase()}</strong>
			<p>${run.pageTitle}</p>
			<p>${run.narrativeSummary}</p>
			<p><strong>Issues:</strong><br />${issues}</p>
			<p><strong>Diff:</strong> ${run.diffReport.stabilityNote}</p>
		`;
		timelineNode.append(card);
	}
}

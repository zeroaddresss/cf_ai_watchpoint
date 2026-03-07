const targetUrlInput = document.getElementById("targetUrl");
const tierSelect = document.getElementById("tierId");
const statusNode = document.getElementById("status");
const timelineNode = document.getElementById("timeline");
const tiersNode = document.getElementById("tiers");
const curlSnippetNode = document.getElementById("curl-snippet");
const watchSummaryNode = document.getElementById("watch-summary");
const form = document.getElementById("watch-form");
const rescanButton = document.getElementById("rescan-button");

let currentWatchId = null;
let currentRunCount = 0;
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
	currentRunCount = detail.watch.runCount;
	statusNode.textContent = `Watch ${detail.watch.id} created. Baseline scan queued on the workflow.`;
	rescanButton.disabled = false;
	renderDetail(detail);
	renderCurlSnippet();
	await refreshWatch(detail.watch.id, currentRunCount + 1, "Baseline scan complete.");
});

rescanButton.addEventListener("click", async () => {
	if (!currentWatchId) {
		return;
	}

	statusNode.textContent = "Queueing manual re-scan...";
	const response = await fetch(`/api/watch/${currentWatchId}/rescan`, {
		method: "POST",
	});
	const payload = await response.json();
	if (!response.ok) {
		const detail = payload.detail ?? null;
		if (detail) {
			renderDetail(detail);
		}
		statusNode.textContent = payload.error ?? "Re-scan failed.";
		return;
	}

	renderDetail(payload.detail);
	await refreshWatch(currentWatchId, currentRunCount + 1, "Manual re-scan complete.");
});

async function refreshWatch(watchId, expectedRunCount, successMessage) {
	const detail = await pollWatchDetail(watchId, (candidate) => candidate.watch.runCount >= expectedRunCount);
	currentRunCount = detail.watch.runCount;
	statusNode.textContent = `${successMessage} Remaining runs: ${detail.watch.remainingRuns}.`;
	renderDetail(detail);
}

async function pollWatchDetail(watchId, predicate) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < 8000) {
		const response = await fetch(`/api/watch/${watchId}`);
		if (response.ok) {
			const detail = await response.json();
			if (predicate(detail)) {
				return detail;
			}

			renderDetail(detail);
		}

		await new Promise((resolve) => setTimeout(resolve, 250));
	}

	throw new Error(`Timed out while waiting for watch ${watchId}.`);
}

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
	renderWatchSummary(detail.watch);
	rescanButton.disabled = detail.watch.remainingRuns === 0;
	timelineNode.innerHTML = "";
	for (const run of detail.runs.toReversed()) {
		const card = document.createElement("article");
		card.className = "card";
		const issues = run.findings.map((finding) => `${finding.severity}: ${finding.title}`).join("<br />");
		const steps = run.steps
			.map((step) => {
				const screenshotState = step.screenshotDataUrl ? "screenshot captured" : "screenshot unavailable";
				const warningText =
					step.warnings.length > 0
						? ` · warnings: ${step.warnings.map((warning) => warning.code).join(", ")}`
						: "";
				return `${step.stepIndex + 1}. ${step.title} (${step.primaryActions.join(", ") || "no primary actions"}) · ${screenshotState}${warningText}`;
			})
			.join("<br />");
		card.innerHTML = `
			<strong>${run.kind.toUpperCase()}</strong>
			<p>${run.pageTitle}</p>
			<p>${run.narrativeSummary}</p>
			<p><strong>Captured steps:</strong><br />${steps}</p>
			<p><strong>Issues:</strong><br />${issues}</p>
			<p><strong>Diff:</strong> ${run.diffReport.stabilityNote}</p>
		`;
		timelineNode.append(card);
	}
}

function renderWatchSummary(watch) {
	watchSummaryNode.hidden = false;
	const activeWorkflow = watch.activeWorkflow;
	const trigger = activeWorkflow ? activeWorkflow.trigger : "none";
	const nextScheduledAt =
		activeWorkflow && activeWorkflow.nextScheduledAt
			? new Date(activeWorkflow.nextScheduledAt).toLocaleString()
			: "Not scheduled";
	const lastRunAt = watch.lastRunAt ? new Date(watch.lastRunAt).toLocaleString() : "No runs yet";
	const lastError = watch.lastError ?? "None";

	watchSummaryNode.innerHTML = `
		<dl>
			<div>
				<dt>Status</dt>
				<dd>Status: ${watch.status}</dd>
			</div>
			<div>
				<dt>Trigger</dt>
				<dd>Trigger: ${trigger}</dd>
			</div>
			<div>
				<dt>Remaining runs</dt>
				<dd>${watch.remainingRuns}</dd>
			</div>
			<div>
				<dt>Next scheduled</dt>
				<dd>${nextScheduledAt}</dd>
			</div>
			<div>
				<dt>Last run</dt>
				<dd>${lastRunAt}</dd>
			</div>
			<div>
				<dt>Last error</dt>
				<dd>${lastError}</dd>
			</div>
		</dl>
	`;
}

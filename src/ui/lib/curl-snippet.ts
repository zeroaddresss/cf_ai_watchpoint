export function buildCurlSnippet(origin: string, targetUrl: string, tierId: "standard" | "premium"): string {
	const payload = JSON.stringify(
		{
			targetUrl,
			tierId,
		},
		null,
		2,
	);

	return `curl -X POST ${origin}/api/watch/tiers/${tierId} \\
  -H 'content-type: application/json' \\
  -H 'x-watchpoint-dev-payment: watchpoint-local-paid' \\
  -d '${payload}'`;
}

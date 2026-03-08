import { Badge } from "@/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { formatDateTime } from "../lib/formatters";
import type { WatchSnapshot } from "../lib/contracts";

export function WatchSummaryCard({ watch }: { watch: WatchSnapshot | null }) {
	if (watch === null) {
		return (
			<Card className="surface-card border-dashed shadow-none">
				<CardHeader className="surface-hairline">
					<CardTitle className="text-lg text-[#2d241d]">No watch yet</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-7 text-[#6f6054]">
					Create a demo watch to surface workflow status, run memory, and regression diffs here.
				</CardContent>
			</Card>
		);
	}

	const workflowTrigger = watch.activeWorkflow?.trigger ?? "none";

	return (
		<Card className="surface-card">
			<CardHeader className="surface-hairline flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-1">
					<CardTitle className="text-xl tracking-[-0.03em] text-[#201914]">Watch summary</CardTitle>
					<p className="max-w-2xl text-sm leading-7 text-[#6d5d50]">{watch.targetUrl}</p>
				</div>
				<Badge className="rounded-full bg-[#201914] px-3 py-1 text-white hover:bg-[#201914]">{watch.status}</Badge>
			</CardHeader>
			<CardContent className="grid gap-3 pt-6 sm:grid-cols-2 xl:grid-cols-3">
				<SummaryItem label="Trigger" value={workflowTrigger} />
				<SummaryItem label="Remaining runs" value={String(watch.remainingRuns)} />
				<SummaryItem label="Run count" value={String(watch.runCount)} />
				<SummaryItem label="Last run" value={formatDateTime(watch.lastRunAt)} />
				<SummaryItem
					label="Next scheduled"
					value={watch.activeWorkflow === null ? "Not scheduled" : formatDateTime(watch.activeWorkflow.nextScheduledAt)}
				/>
				<SummaryItem label="Last error" value={watch.lastError ?? "None"} />
			</CardContent>
		</Card>
	);
}

function SummaryItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="metric-tile">
			<p className="metric-label">{label}</p>
			<p className="metric-value">{value}</p>
		</div>
	);
}

import { ExternalLink, TriangleAlert } from "lucide-react";
import { Badge } from "@/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { ScrollArea } from "@/ui/components/ui/scroll-area";
import { Separator } from "@/ui/components/ui/separator";
import { formatDateTime, uppercaseRunKind } from "../lib/formatters";
import type { WatchRun } from "../lib/contracts";

export function RunTimeline({ runs }: { runs: WatchRun[] }) {
	if (runs.length === 0) {
		return (
			<Card className="surface-card border-dashed shadow-none">
				<CardHeader className="surface-hairline">
					<CardTitle className="text-lg text-[#2d241d]">Timeline pending</CardTitle>
				</CardHeader>
				<CardContent className="text-sm leading-7 text-[#6f6054]">
					The workflow has not completed a browser-backed run yet.
				</CardContent>
			</Card>
		);
	}

	const orderedRuns = [...runs].reverse();

	return (
		<Card className="surface-card">
			<CardHeader className="surface-hairline flex flex-col gap-2 pb-5">
				<CardTitle className="text-xl tracking-[-0.03em] text-[#201914]">Run timeline</CardTitle>
				<p className="text-sm leading-7 text-[#625549]">Each run stores browser evidence, findings, and the diff from the previous meaningful state.</p>
			</CardHeader>
			<CardContent className="pt-6">
				<ScrollArea className="h-[36rem] pr-4">
					<div className="grid gap-4">
						{orderedRuns.map((run) => {
							const screenshot = run.steps.find((step) => step.screenshotDataUrl !== null)?.screenshotDataUrl ?? null;

							return (
								<Card key={run.id} className="surface-muted shadow-none">
									<CardHeader className="gap-3">
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<Badge className="rounded-full bg-[#201914] px-3 py-1 text-white hover:bg-[#201914]">
														{uppercaseRunKind(run.kind)}
													</Badge>
													<Badge
														variant={run.diffReport.hasChanges ? "secondary" : "outline"}
														className={run.diffReport.hasChanges ? "border-[#f4cba8] bg-[#fff0e5] text-[#a14d0c]" : "border-[#d8ccc0] text-[#66584d]"}
													>
														{run.status}
													</Badge>
												</div>
												<CardTitle className="text-lg text-[#261e18]">{run.pageTitle}</CardTitle>
											</div>
											<p className="text-sm text-[#7a6b5d]">{formatDateTime(run.completedAt)}</p>
										</div>
										<p className="text-sm leading-7 text-[#5d5148]">{run.narrativeSummary}</p>
									</CardHeader>
									<CardContent className="grid gap-4">
										{screenshot === null ? null : (
											<div className="overflow-hidden rounded-2xl border border-[#e6d8ca] bg-[#f4ecdf]">
												<img
													alt={`${run.pageTitle} screenshot`}
													className="h-auto w-full object-cover"
													src={screenshot}
												/>
											</div>
										)}
										<div className="grid gap-3 sm:grid-cols-3">
											<MetricCard label="Canonical URL" value={run.canonicalUrl} />
											<MetricCard label="Changes" value={run.diffReport.hasChanges ? "Meaningful changes detected" : "Stable"} />
											<MetricCard label="Issues" value={String(run.findings.length)} />
										</div>
										<Separator />
										<div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
											<div className="grid gap-3">
												<p className="metric-label">Captured steps</p>
												<div className="grid gap-3">
													{run.steps.map((step) => (
														<div key={`${run.id}-${step.stepIndex}`} className="rounded-2xl border border-[#e7dbcf] bg-white/92 px-4 py-3">
															<div className="flex items-start justify-between gap-3">
																<div>
																	<p className="font-semibold text-[#201914]">{step.stepIndex + 1}. {step.title}</p>
																	<p className="mt-1 text-sm text-[#6a5a4b]">{step.url}</p>
																</div>
																<a
																	className="inline-flex items-center gap-1 text-sm text-[#c95b08] hover:text-[#9a4306]"
																	href={step.url}
																	rel="noreferrer"
																	target="_blank"
																>
																	Open
																	<ExternalLink className="size-3.5" />
																</a>
															</div>
															<p className="mt-3 text-sm leading-6 text-[#51463d]">
																Primary actions: {step.primaryActions.length === 0 ? "none" : step.primaryActions.join(", ")}
															</p>
															{step.warnings.length === 0 ? null : (
																<div className="mt-3 flex flex-wrap gap-2">
																	{step.warnings.map((warning) => (
																		<Badge key={`${step.stepIndex}-${warning.code}`} variant="outline" className="gap-1 rounded-full border-[#f3c8a5] text-[#9d490b]">
																			<TriangleAlert className="size-3.5" />
																			{warning.code}
																		</Badge>
																	))}
																</div>
															)}
														</div>
													))}
												</div>
											</div>
											<div className="grid gap-3">
												<p className="metric-label">Findings</p>
												<div className="grid gap-2">
													{run.findings.map((finding) => (
														<div key={finding.id} className="rounded-2xl border border-[#e7dbcf] bg-white/92 px-4 py-3">
															<div className="flex items-center justify-between gap-3">
																<p className="font-semibold text-[#201914]">{finding.title}</p>
																<Badge
																	variant="outline"
																	className={
																		finding.severity === "critical"
																			? "border-red-200 bg-red-50 text-red-800"
																			: finding.severity === "warn"
																				? "border-amber-200 bg-amber-50 text-amber-800"
																				: "border-slate-200 bg-slate-50 text-slate-700"
																	}
																>
																	{finding.severity}
																</Badge>
															</div>
															<p className="mt-2 text-sm leading-6 text-[#5f5146]">{finding.evidence}</p>
														</div>
													))}
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

function MetricCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="metric-tile px-4 py-3">
			<p className="metric-label">{label}</p>
			<p className="metric-value">{value}</p>
		</div>
	);
}

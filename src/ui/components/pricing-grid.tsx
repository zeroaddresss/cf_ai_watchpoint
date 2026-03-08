import { ArrowUpRight, Clock3, Cpu, Wallet } from "lucide-react";
import { Badge } from "@/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Separator } from "@/ui/components/ui/separator";
import type { PricingResponse } from "../lib/contracts";

export function PricingGrid({ pricing }: { pricing: PricingResponse }) {
	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
			<Card className="surface-card h-fit">
				<CardHeader className="surface-hairline gap-3 pb-5">
					<div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e7d6c7] bg-[#fff6ee] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#c75b09]">
						Tier comparison
					</div>
					<CardTitle className="text-2xl tracking-[-0.03em] text-[#201914]">One product shape, two operating envelopes.</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 pt-6">
					{pricing.tiers.map((tier) => (
						<div key={`summary-${tier.id}`} className="surface-muted grid gap-3 p-4">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-lg font-semibold tracking-[-0.03em] text-[#211a14]">{tier.displayName}</p>
									<p className="mt-1 text-sm leading-6 text-[#635549]">{tier.id === "standard" ? "Lower-cost monitoring" : "Denser regression summaries"}</p>
								</div>
								<Badge className="rounded-full bg-[#fff3e9] px-3 py-1 text-[#ce5d08] hover:bg-[#fff3e9]">{tier.x402Price}</Badge>
							</div>
							<div className="grid gap-3 sm:grid-cols-3">
								<PricingMetric icon={Wallet} label="x402 price" value={tier.x402Price} />
								<PricingMetric icon={Clock3} label="Runs included" value={String(tier.includedRuns)} />
								<PricingMetric icon={Cpu} label="Cadence" value={`${tier.cadenceMinutes} min`} />
							</div>
						</div>
					))}
				</CardContent>
			</Card>
			<div className="grid gap-5 md:grid-cols-2">
				{pricing.tiers.map((tier) => (
					<Card key={tier.id} className="surface-card">
						<CardHeader className="surface-hairline gap-3 pb-5">
							<div className="flex items-center justify-between gap-3">
								<div>
									<CardTitle className="text-2xl tracking-[-0.03em] text-[#201914]">{tier.displayName}</CardTitle>
									<p className="mt-2 text-sm leading-7 text-[#5d5148]">{tier.capacitySummary}</p>
								</div>
								<Badge className="rounded-full bg-[#fff3e9] px-3 py-1 text-[#ce5d08] hover:bg-[#fff3e9]">
									{tier.id}
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="grid gap-4 pt-6">
							<div className="metric-tile px-4 py-3">
								<p className="metric-label">Workers AI model</p>
								<p className="mt-2 break-all text-sm font-medium leading-6 text-[#2b231c]">{tier.modelName}</p>
							</div>
							<Separator />
							<a
								className="inline-flex items-center gap-1 text-sm font-medium text-[#a15418] hover:text-[#8a430e]"
								href={tier.referenceDocsUrl}
								rel="noreferrer"
								target="_blank"
							>
								Open Cloudflare reference
								<ArrowUpRight className="size-4" />
							</a>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

function PricingMetric({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Wallet;
	label: string;
	value: string;
}) {
	return (
		<div className="metric-tile">
			<div className="flex items-center gap-2 text-[#c95b08]">
				<Icon className="size-4" />
				<p className="metric-label">{label}</p>
			</div>
			<p className="mt-3 text-base font-semibold text-[#211a14]">{value}</p>
		</div>
	);
}

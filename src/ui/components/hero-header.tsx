import { ShieldCheck, Waves, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const valuePoints = [
	{
		icon: ShieldCheck,
		label: "Regression memory",
		copy: "Watchpoint remembers what a healthy flow looked like before the next deploy changes it.",
	},
	{
		icon: Waves,
		label: "Workflow orchestration",
		copy: "Baseline scans and rescans keep running through Cloudflare Workflows instead of a one-shot script.",
	},
	{
		icon: WalletCards,
		label: "Paid agent surface",
		copy: "The same capability is sellable over x402 through HTTP and MCP for other agents to consume.",
	},
];

export function HeroHeader() {
	return (
		<section className="shell-card relative overflow-hidden px-6 py-6 sm:px-8 lg:px-9 lg:py-7">
			<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd6b4] to-transparent" />
			<div className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,rgba(255,123,0,0.09),transparent_62%)]" />
			<div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)] lg:items-start">
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge className="rounded-full border border-[#f0d9c7] bg-[#fff6ee] px-3 py-1 text-[0.72rem] uppercase tracking-[0.16em] text-[#bc5d12] hover:bg-[#fff6ee]">
							Cloudflare-native AI agent
						</Badge>
						<Badge className="rounded-full border border-[#ffd2b0] bg-[#fff1e6] px-3 py-1 text-[0.72rem] uppercase tracking-[0.16em] text-[#ce6207] hover:bg-[#fff1e6]">
							Browser + Workflows + x402
						</Badge>
					</div>
					<div className="flex flex-col gap-3">
						<h1 className="max-w-3xl text-balance text-[2.2rem] leading-[0.96] font-black tracking-[-0.05em] text-[#1f1a16] sm:text-[2.8rem] lg:text-[3.35rem]">
							Watchpoint catches what uptime checks miss.
						</h1>
						<p className="max-w-2xl text-[0.98rem] leading-7 text-[#67584c] sm:text-base">
							It runs a browser-backed baseline, remembers the visible user flow, and flags the moments where the site is
							still online but no longer really working.
						</p>
					</div>
				</div>
				<Card className="surface-card bg-white/70 shadow-none">
					<CardContent className="grid gap-3 p-4">
						{valuePoints.map(({ icon: Icon, label, copy }) => (
							<div key={label} className="surface-muted grid gap-2 p-3.5">
								<div className="flex items-center gap-2.5">
									<div className="flex size-9 items-center justify-center rounded-2xl bg-[#fff0e3] text-[#d36a10]">
										<Icon className="size-[18px]" />
									</div>
									<p className="text-sm font-semibold text-[#211b16]">{label}</p>
								</div>
								<p className="text-[0.94rem] leading-6 text-[#66584c]">{copy}</p>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</section>
	);
}

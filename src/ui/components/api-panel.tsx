import { Code2, Coins, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Separator } from "@/ui/components/ui/separator";

type Props = {
	curlSnippet: string;
	primaryModelDisplayName: string;
	primaryModelDocsUrl: string;
};

export function ApiPanel({ curlSnippet, primaryModelDisplayName, primaryModelDocsUrl }: Props) {
	return (
		<div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
			<Card className="surface-card">
				<CardHeader className="surface-hairline gap-3 pb-5">
					<div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e7d6c7] bg-[#fff6ee] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#c75b09]">
						Paid programmatic flow
					</div>
					<CardTitle className="text-2xl tracking-[-0.03em] text-[#201914]">x402 HTTP API</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 pt-6">
					<p className="text-sm leading-7 text-[#5d5148]">The paid endpoint creates a watch pack and returns the same structured lifecycle used by the dashboard.</p>
					<div className="surface-code">
						<pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-[#f7ece0]">{curlSnippet}</pre>
					</div>
				</CardContent>
			</Card>
			<Card className="surface-card">
				<CardHeader className="surface-hairline pb-5">
					<CardTitle className="text-2xl tracking-[-0.03em] text-[#201914]">What another agent gets</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 pt-6 text-sm leading-7 text-[#5d5148]">
					<FeatureRow
						icon={Coins}
						title="Pay for the capability"
						copy="Another developer or agent pays the watch creation route through x402 instead of setting up an account."
					/>
					<Separator />
					<FeatureRow
						icon={Sparkles}
						title="Get agent-readable output"
						copy={`Each run returns structured evidence plus an AI summary on ${primaryModelDisplayName}.`}
					/>
					<Separator />
					<FeatureRow
						icon={Code2}
						title="Reuse the same core through MCP"
						copy="The same watch lifecycle is also exposed as MCP tools, so the product works for humans and agents."
					/>
					<a className="text-[#c95b08] hover:text-[#9a4306]" href={primaryModelDocsUrl} rel="noreferrer" target="_blank">
						Open the Workers AI model reference
					</a>
				</CardContent>
			</Card>
		</div>
	);
}

function FeatureRow({
	icon: Icon,
	title,
	copy,
}: {
	icon: typeof Coins;
	title: string;
	copy: string;
}) {
	return (
		<div className="flex items-start gap-4">
			<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff2e8] text-[#c95b08]">
				<Icon className="size-5" />
			</div>
			<div>
				<p className="font-semibold text-[#201914]">{title}</p>
				<p className="mt-2 text-sm leading-7 text-[#5d5148]">{copy}</p>
			</div>
		</div>
	);
}

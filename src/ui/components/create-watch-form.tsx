import { LoaderCircle, RotateCcw, Rocket } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/ui/components/ui/select";
import type { PricingTier, WatchDetail } from "../lib/contracts";

type Props = {
	eyebrow: string;
	title: string;
	description: string;
	primaryActionLabel: string;
	secondaryActionLabel: string;
	targetUrl: string;
	tierId: "standard" | "premium";
	tiers: PricingTier[];
	detail: WatchDetail | null;
	isCreating: boolean;
	isRescanning: boolean;
	onTargetUrlChange: (value: string) => void;
	onTierIdChange: (value: "standard" | "premium") => void;
	onCreate: () => void;
	onRescan: () => void;
};

export function CreateWatchForm({
	eyebrow,
	title,
	description,
	primaryActionLabel,
	secondaryActionLabel,
	targetUrl,
	tierId,
	tiers,
	detail,
	isCreating,
	isRescanning,
	onTargetUrlChange,
	onTierIdChange,
	onCreate,
	onRescan,
}: Props) {
	const rescanDisabled =
		detail === null || detail.watch.remainingRuns === 0 || detail.watch.activeWorkflow?.status !== "waiting" || isRescanning;
	const selectedTier = tiers.find((tier) => tier.id === tierId) ?? null;

	return (
		<Card className="surface-card">
			<CardHeader className="surface-hairline flex flex-col gap-4 pb-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#ffd7bc] bg-[#fff4eb] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#d15d07]">
						{eyebrow}
					</div>
					{selectedTier === null ? null : (
						<div className="rounded-full border border-[#e6d8ca] bg-[#fffaf5] px-3 py-1 text-sm font-medium text-[#6c5848]">
							{selectedTier.displayName} · {selectedTier.x402Price}
						</div>
					)}
				</div>
				<CardTitle className="text-2xl tracking-[-0.03em] text-[#1f1b18]">{title}</CardTitle>
				<CardDescription className="text-[0.96rem] leading-7 text-[#5d5148]">{description}</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-6 pt-6">
				{selectedTier === null ? null : (
					<div className="grid gap-3 sm:grid-cols-3">
						<FormMetric label="x402 price" value={selectedTier.x402Price} />
						<FormMetric label="Included runs" value={String(selectedTier.includedRuns)} />
						<FormMetric label="Cadence" value={`${selectedTier.cadenceMinutes} min`} />
					</div>
				)}
				<div className="grid gap-2">
					<Label htmlFor="target-url">Target URL</Label>
					<Input
						id="target-url"
						name="target-url"
						type="url"
						value={targetUrl}
						onChange={(event) => {
							onTargetUrlChange(event.currentTarget.value);
						}}
					/>
					<p className="text-sm text-[#73655a]">
						`watchpoint.local` is a deterministic fixture target for demo and test runs.
					</p>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="pricing-tier">Pricing tier</Label>
					<Select value={tierId} onValueChange={onTierIdChange}>
						<SelectTrigger id="pricing-tier" aria-label="Pricing tier" className="w-full">
							<SelectValue placeholder="Choose a pricing tier" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Tiers</SelectLabel>
								{tiers.map((tier) => (
									<SelectItem key={tier.id} value={tier.id}>
										{tier.displayName} · {tier.x402Price}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row">
					<Button
						size="lg"
						className="rounded-full bg-[#ff7b00] px-5 text-[#1f1b18] hover:bg-[#ff9342] sm:flex-1"
						disabled={isCreating}
						onClick={onCreate}
						type="button"
					>
						{isCreating ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Rocket data-icon="inline-start" />}
						{primaryActionLabel}
					</Button>
					<Button
						size="lg"
						type="button"
						variant="outline"
						className="rounded-full border-[#d4c0b1] bg-transparent sm:flex-1"
						disabled={rescanDisabled}
						onClick={onRescan}
					>
						{isRescanning ? (
							<LoaderCircle className="animate-spin" data-icon="inline-start" />
						) : (
							<RotateCcw data-icon="inline-start" />
						)}
						{secondaryActionLabel}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function FormMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="metric-tile">
			<p className="metric-label">{label}</p>
			<p className="metric-value">{value}</p>
		</div>
	);
}

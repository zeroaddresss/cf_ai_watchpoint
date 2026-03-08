import { useState, type ReactNode } from "react";
import {
	Bot,
	BrainCircuit,
	Database,
	Globe,
	Monitor,
	Sparkles,
	Wallet,
	Workflow,
	type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/components/ui/dialog";

type DiagramMode = "system" | "cycle";
type SystemNodeId = "agent" | "workflow" | "browser" | "workers-ai" | "memory";

type SystemNode = {
	id: SystemNodeId;
	eyebrow: string;
	title: string;
	shortLabel: string;
	role: string;
	inputs: string;
	outputs: string;
	bullets: readonly string[];
	tags: readonly string[];
	icon: LucideIcon;
	emphasis?: "default" | "final";
};

type CycleStep = {
	id: string;
	step: string;
	title: string;
	copy: string;
	accent?: "default" | "final";
};

const systemNodes: ReadonlyArray<SystemNode> = [
	{
		id: "agent",
		eyebrow: "Agents SDK",
		title: "Watchpoint Agent",
		shortLabel: "Stateful agent",
		role: "Receives watch requests, starts long-running work, and serves back the durable watch state.",
		inputs: "UI, API, MCP, rescan requests",
		outputs: "Workflow start, state reads, workflow events",
		bullets: [
			"One agent instance per watch.",
			"Backed by Durable Objects through the Agents SDK.",
			"Keeps the product contract stable while execution runs asynchronously.",
		],
		tags: ["Durable Object", "State owner", "Official"],
		icon: BrainCircuit,
	},
	{
		id: "workflow",
		eyebrow: "Cloudflare Workflows",
		title: "WatchWorkflow",
		shortLabel: "Orchestrator",
		role: "Coordinates baseline and rescan runs with retries, waits, and progress reporting outside the request path.",
		inputs: "Target URL, tier, cadence, manual rescan event",
		outputs: "Capture execution, AI analysis, run completion",
		bullets: [
			"Runs baseline and rescan with the same contract.",
			"Uses durable wait and retry semantics.",
			"Reports progress and completion back to the agent.",
		],
		tags: ["Retries", "Wait for event", "Official"],
		icon: Workflow,
	},
	{
		id: "browser",
		eyebrow: "Browser Rendering",
		title: "Browser Rendering",
		shortLabel: "Cloudflare browser capture",
		role: "Opens the target site in a real browser session and turns the monitored flow into structured evidence.",
		inputs: "Workflow invocation",
		outputs: "Steps, screenshots, text digests",
		bullets: [
			"Captures the real site rather than a simple uptime signal.",
			"Produces step evidence for later comparison.",
			"Feeds Workers AI with concrete session data.",
		],
		tags: ["Capture", "Evidence", "Official"],
		icon: Monitor,
	},
	{
		id: "workers-ai",
		eyebrow: "Workers AI",
		title: "Cloudflare Workers AI",
		shortLabel: "Inference layer",
		role: "Turns captured evidence into findings, regression framing, and a short operator-facing narrative.",
		inputs: "Captured session, model tier, prior run context",
		outputs: "Findings, summary, diff framing",
		bullets: [
			"Inference stays inside Cloudflare.",
			"Converts raw evidence into a readable monitoring outcome.",
			"Can sit behind AI Gateway when that routing layer is enabled.",
		],
		tags: ["Inference", "Optional AI Gateway", "Official"],
		icon: Sparkles,
	},
	{
		id: "memory",
		eyebrow: "Durable Objects State",
		title: "Cloudflare Durable Objects",
		shortLabel: "Agent-owned history",
		role: "Stores watch configuration, run history, diff memory, and the latest report that every surface reads back.",
		inputs: "Evidence, findings, report state",
		outputs: "Watch detail, run history, diff context",
		bullets: [
			"Persisted with the agent-owned watch state.",
			"Lets rescans compare against previous runs.",
			"Closes the loop for UI, API, and MCP consumers.",
		],
		tags: ["History", "Final output", "Official"],
		icon: Database,
		emphasis: "final",
	},
];

const cycleSteps: ReadonlyArray<CycleStep> = [
	{
		id: "request",
		step: "01",
		title: "Request enters agent",
		copy: "A user or another agent hits the same durable entry point.",
	},
	{
		id: "queue",
		step: "02",
		title: "Workflow runs async",
		copy: "Execution is delegated to Cloudflare Workflows.",
	},
	{
		id: "capture",
		step: "03",
		title: "Browser captures flow",
		copy: "The monitored site becomes step evidence and screenshots.",
	},
	{
		id: "analysis",
		step: "04",
		title: "Workers AI explains",
		copy: "Evidence is translated into findings and a compact narrative.",
	},
	{
		id: "persist",
		step: "05",
		title: "Memory persists state",
		copy: "History is written back so the next rescan can compare.",
		accent: "final",
	},
];

const cloudflareMarkUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/cloudflare.svg";

export function InfrastructureDiagram() {
	const [mode, setMode] = useState<DiagramMode>("system");
	const [selectedNodeId, setSelectedNodeId] = useState<SystemNodeId | null>(null);

	const selectedNode = selectedNodeId === null ? null : getNode(selectedNodeId);

	return (
		<>
			<section aria-label="Cloudflare interaction diagram" className="grid gap-4">
				<div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
					<div className="grid gap-1.5">
						<p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#c55f0e]">
							Watchpoint
						</p>
						<h2 className="text-[1.5rem] leading-[1.02] font-semibold tracking-[-0.05em] text-[#2a160a] sm:text-[1.9rem]">
							Cloudflare-native monitoring loop
						</h2>
					</div>
					<div className="inline-flex rounded-full border border-[#efc79a] bg-[#fff4e6] p-1">
						<TabButton active={mode === "system"} onClick={() => setMode("system")}>
							System
						</TabButton>
						<TabButton active={mode === "cycle"} onClick={() => setMode("cycle")}>
							Run cycle
						</TabButton>
					</div>
				</div>

				{mode === "system" ? <SystemBoard onSelectNode={setSelectedNodeId} /> : <RunCycleBoard />}
			</section>

			<NodeDialog
				node={selectedNode}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedNodeId(null);
					}
				}}
				open={selectedNode !== null}
			/>
		</>
	);
}

function SystemBoard({
	onSelectNode,
}: {
	onSelectNode: (nodeId: SystemNodeId) => void;
}) {
	return (
		<div className="overflow-x-auto pb-2">
			<div className="min-w-[1240px]">
				<div className="relative grid grid-cols-[180px_76px_190px_76px_190px_260px_76px_200px] items-center gap-3">
					<EntryColumn />
					<FlowRail label="request" note="x402 payment" />
					<NodeCapsule node={getNode("agent")} onClick={() => onSelectNode("agent")} />
					<FlowRail label="start run" />
					<NodeCapsule node={getNode("workflow")} onClick={() => onSelectNode("workflow")} />
					<ExecutionCluster onSelectNode={onSelectNode} />
					<FlowRail label="persist" />
					<NodeCapsule node={getNode("memory")} onClick={() => onSelectNode("memory")} />
					<div aria-hidden="true" className="pointer-events-none absolute right-[10rem] bottom-[-1.2rem] left-[18rem] h-8">
						<div className="absolute inset-x-0 bottom-0 h-px border-t border-dashed border-[#e6ab70]" />
						<div className="absolute bottom-[0.55rem] left-[46%] rounded-full border border-[#efcb9f] bg-[#fff6eb] px-2.5 py-1 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-[#c66b1b]">
							state sync back to agent
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function EntryColumn() {
	return (
		<div className="grid gap-2">
			<EntryPill icon={<Globe className="size-3.5" />} label="Demo UI" note="Free" />
			<EntryPill icon={<Wallet className="size-3.5" />} label="HTTP API" note="Paid" />
			<EntryPill icon={<Bot className="size-3.5" />} label="MCP agent" note="Paid" />
		</div>
	);
}

function ExecutionCluster({
	onSelectNode,
}: {
	onSelectNode: (nodeId: SystemNodeId) => void;
}) {
	return (
		<div className="relative grid gap-2 pl-5">
			<div aria-hidden="true" className="absolute top-4 bottom-4 left-1.5 w-px bg-[#e7ad72]" />
			<div aria-hidden="true" className="absolute top-[28%] left-1.5 h-px w-3.5 bg-[#e7ad72]" />
			<div aria-hidden="true" className="absolute top-[72%] left-1.5 h-px w-3.5 bg-[#e7ad72]" />
			<NodeCapsule node={getNode("browser")} onClick={() => onSelectNode("browser")} compact />
			<NodeCapsule node={getNode("workers-ai")} onClick={() => onSelectNode("workers-ai")} compact />
		</div>
	);
}

function RunCycleBoard() {
	return (
		<div className="overflow-x-auto pb-2">
			<div className="min-w-[1100px]">
				<div className="flex items-center justify-between gap-4">
					<p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c55f0e]">
						Run lifecycle
					</p>
					<div className="rounded-full border border-[#efc79a] bg-[#fff3e4] px-3 py-1.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[#c56c1b]">
						Manual or scheduled rescan re-enters step 02
					</div>
				</div>
				<div className="relative mt-4">
					<div aria-hidden="true" className="absolute top-4 right-0 left-0 h-px bg-[#e7ad72]" />
					<div className="grid grid-cols-5 gap-3">
						{cycleSteps.map((step) => (
							<CycleCapsule key={step.id} step={step} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function NodeCapsule({
	node,
	onClick,
	compact = false,
}: {
	node: SystemNode;
	onClick: () => void;
	compact?: boolean;
}) {
	const isFinal = node.emphasis === "final";

	return (
		<button
			aria-haspopup="dialog"
			aria-label={`Open ${node.title} details`}
			className={[
				"group flex items-center gap-3 rounded-[1.7rem] border px-3 py-3 text-left transition-colors",
				compact ? "min-h-[78px]" : "min-h-[92px]",
				isFinal
					? "border-[#eeb173] bg-[#fff0dc] hover:bg-[#ffe9cf]"
					: "border-[#efcdab] bg-[#fff8ef] hover:border-[#ecb37d] hover:bg-[#fff2e2]",
			].join(" ")}
			onClick={onClick}
			type="button"
		>
			<div className="flex size-9 items-center justify-center rounded-full border border-[#f0d3b4] bg-[#fff3e5] p-2">
				<img alt="" className="size-4.5 object-contain" src={cloudflareMarkUrl} />
			</div>
			<div className="min-w-0 flex-1">
				<p className="font-mono text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[#bc6519]">
					{node.eyebrow}
				</p>
				<h3 className="mt-1 truncate text-[0.96rem] font-semibold tracking-[-0.03em] text-[#281508]">
					{node.title}
				</h3>
				<p className="mt-1 truncate text-[0.78rem] text-[#7b5941]">{node.shortLabel}</p>
			</div>
		</button>
	);
}

function NodeDialog({
	node,
	onOpenChange,
	open,
}: {
	node: SystemNode | null;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	if (node === null) {
		return null;
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className="max-w-[calc(100%-2rem)] rounded-[1.5rem] border border-[#efcb9f] bg-[linear-gradient(180deg,#fffaf4_0%,#fff4e7_100%)] p-0 shadow-[0_28px_72px_rgba(191,97,16,0.18)] sm:max-w-[52rem]"
				showCloseButton
			>
				<div className="grid gap-0">
					<DialogHeader className="gap-3 border-b border-[#f1d7ba] px-5 py-5">
						<div className="flex items-start gap-3">
							<div className="flex size-11 items-center justify-center rounded-full border border-[#f1d3b0] bg-[#fff1df] p-3">
								<img alt="" className="size-5 object-contain" src={cloudflareMarkUrl} />
							</div>
							<div className="grid gap-1.5">
								<p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#bc6519]">
									Component detail
								</p>
								<DialogTitle className="text-[1.25rem] font-semibold tracking-[-0.04em] text-[#2a160a]">
									{node.title}
								</DialogTitle>
								<DialogDescription className="max-w-2xl text-sm leading-7 text-[#785841]">
									{node.role}
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
					<div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
						<DetailPanel title="How It Interacts">
							{node.bullets.map((bullet) => (
								<li key={bullet}>{bullet}</li>
							))}
						</DetailPanel>
						<DetailPanel title="Inputs">{node.inputs}</DetailPanel>
						<DetailPanel title="Outputs">{node.outputs}</DetailPanel>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function DetailPanel({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	const isList = Array.isArray(children);

	return (
		<div className="rounded-[1.1rem] border border-[#f0d3b3] bg-[#fffdf9] px-4 py-4">
			<p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#bc6519]">{title}</p>
			{isList ? (
				<ul className="mt-3 grid gap-2 text-sm leading-6 text-[#75563f]">{children}</ul>
			) : (
				<div className="mt-3 text-sm leading-7 text-[#75563f]">{children}</div>
			)}
		</div>
	);
}

function FlowRail({
	label,
	note,
}: {
	label: string;
	note?: string;
}) {
	return (
		<div className="relative flex h-full min-h-[92px] items-center justify-center">
			<div className="h-px w-full bg-[#e7ad72]" />
			<div className="absolute top-[0.4rem] rounded-full border border-[#efcb9f] bg-[#fff6eb] px-2.5 py-1 font-mono text-[0.53rem] font-semibold uppercase tracking-[0.18em] text-[#c46919]">
				{label}
			</div>
			{note === undefined ? null : (
				<div className="absolute bottom-[0.4rem] rounded-full border border-[#efcfad] bg-[#fff8ef] px-2.5 py-1 font-mono text-[0.52rem] font-semibold uppercase tracking-[0.18em] text-[#bf681c]">
					{note}
				</div>
			)}
		</div>
	);
}

function CycleCapsule({
	step,
}: {
	step: CycleStep;
}) {
	const finalStep = step.accent === "final";

	return (
		<div className="relative pt-6">
			<div
				className={[
					"absolute top-0 left-3 z-10 flex size-8 items-center justify-center rounded-full border bg-[#fff8ef] font-mono text-[0.56rem] font-semibold tracking-[0.16em] text-[#c46919]",
					finalStep ? "border-[#ef8c31] bg-[#fff0dc]" : "border-[#efcb9f]",
				].join(" ")}
			>
				{step.step}
			</div>
			<div
				className={[
					"rounded-[1.5rem] border px-4 py-4",
					finalStep ? "border-[#ef8c31] bg-[#fff0dc]" : "border-[#efcdab] bg-[#fff8ef]",
				].join(" ")}
			>
				<h3 className="text-[0.95rem] font-semibold tracking-[-0.03em] text-[#281508]">{step.title}</h3>
				<p className="mt-2 text-[0.83rem] leading-6 text-[#7b5941]">{step.copy}</p>
			</div>
		</div>
	);
}

function EntryPill({
	icon,
	label,
	note,
}: {
	icon: ReactNode;
	label: string;
	note: string;
}) {
	return (
		<div className="flex items-center justify-between gap-2 rounded-full border border-[#efcdab] bg-[#fff8ef] px-3 py-2.5">
			<div className="flex min-w-0 items-center gap-2">
				<div className="text-[#d76817]">{icon}</div>
				<span className="truncate text-[0.82rem] font-semibold text-[#281508]">{label}</span>
			</div>
			<span className="font-mono text-[0.54rem] font-semibold uppercase tracking-[0.16em] text-[#bf681c]">
				{note}
			</span>
		</div>
	);
}

function TabButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			className={[
				"rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
				active ? "bg-[#f38020] text-white" : "text-[#7a5941] hover:bg-[#ffe7cc]",
			].join(" ")}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	);
}

function getNode(nodeId: SystemNodeId): SystemNode {
	const node = systemNodes.find((candidate) => candidate.id === nodeId);
	if (node === undefined) {
		throw new Error(`Unknown system node: ${nodeId}`);
	}

	return node;
}

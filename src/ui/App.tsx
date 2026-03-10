import { type MouseEvent, useEffect, useState, useSyncExternalStore } from "react";
import { Boxes, Braces, ScanSearch, Workflow } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent } from "@/ui/components/ui/card";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { ApiPanel } from "./components/api-panel";
import { CreateWatchForm } from "./components/create-watch-form";
import { InfrastructureDiagram } from "./components/infrastructure-diagram";
import { PricingGrid } from "./components/pricing-grid";
import { RunTimeline } from "./components/run-timeline";
import { StatusBanner } from "./components/status-banner";
import { WatchSummaryCard } from "./components/watch-summary-card";
import { usePricing } from "./hooks/use-pricing";
import { useWatchDashboard } from "./hooks/use-watch-dashboard";
import { buildCurlSnippet } from "./lib/curl-snippet";

const defaultTargetUrl = "https://watchpoint.local/regression";
const githubRepositoryUrl = "https://github.com/zeroaddresss/cf_ai_watchpoint";

type AppPath = "/demo" | "/dashboard" | "/api" | "/pricing";

type AppRoute = {
	path: AppPath;
	label: string;
	eyebrow: string;
	title: string;
	copy: string;
	icon: typeof Workflow;
};

const appRoutes: ReadonlyArray<AppRoute> = [
	{
		path: "/demo",
		label: "Demo",
		eyebrow: "Free scan demo",
		title: "This is the fastest way to understand the product.",
		copy: "Run the free scan, inspect the architecture map, and then move into the dashboard once the first watch exists.",
		icon: ScanSearch,
	},
	{
		path: "/dashboard",
		label: "Dashboard",
		eyebrow: "Operator dashboard",
		title: "Read workflow state, watch memory, and regression evidence without the setup noise.",
		copy: "",
		icon: Workflow,
	},
	{
		path: "/api",
		label: "API",
		eyebrow: "Programmatic access",
		title: "Expose the same watch lifecycle as a paid x402 capability.",
		copy: "Humans can try Watchpoint from the demo route. Other agents and integrations can buy the same capability through the paid HTTP API and MCP surface.",
		icon: Braces,
	},
	{
		path: "/pricing",
		label: "Pricing",
		eyebrow: "Pricing tiers",
		title: "Change the model tier without changing the product shape.",
		copy: "Two tiers, the same workflow, and different operating envelopes for model capacity and cost.",
		icon: Boxes,
	},
];

export function App() {
	const pricing = usePricing();
	const dashboard = useWatchDashboard();
	const [targetUrl, setTargetUrl] = useState<string>(defaultTargetUrl);
	const [tierId, setTierId] = useState<"standard" | "premium">("standard");
	const currentPath = useSyncExternalStore(subscribeToLocationChanges, readCurrentPath, getServerPath);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const normalizedPath = normalizePath(window.location.pathname);
		if (window.location.pathname !== normalizedPath) {
			navigateTo(normalizedPath, true);
		}
	}, [currentPath]);

	useEffect(() => {
		if (pricing.status !== "ready") {
			return;
		}

		const selectedTierExists = pricing.data.tiers.some((tier) => tier.id === tierId);
		if (!selectedTierExists) {
			setTierId(pricing.data.tiers[0]?.id ?? "standard");
		}
	}, [pricing, tierId]);

	const origin = typeof window === "undefined" ? "http://localhost:8787" : window.location.origin;
	const curlSnippet = buildCurlSnippet(origin, targetUrl, tierId);
	const selectedTier = pricing.status === "ready" ? pricing.data.tiers.find((tier) => tier.id === tierId) ?? null : null;
	const currentRoute = getRoute(currentPath);
	const isDemoRoute = currentPath === "/demo";

	return (
		<main className="page-shell gap-6 overflow-hidden">
			<div className={`route-shell ${isDemoRoute ? "route-shell-demo" : "route-shell-ops"}`}>
				<RouteNavigation currentPath={currentPath} isDemoRoute={isDemoRoute} />
				{currentPath === "/demo" ? null : <PageHeader route={currentRoute} compact />}
				{currentPath === "/demo" ? <InfrastructureDiagram /> : null}
				{currentPath === "/demo" ? (
					<DemoPage
						detail={dashboard.detail}
						notice={dashboard.notice}
						isCreating={dashboard.submission.phase === "creating"}
						isRescanning={dashboard.submission.phase === "rescanning"}
						onCreate={() => {
							void dashboard.createWatch(targetUrl, tierId);
						}}
						onRescan={() => {
							void dashboard.rescanWatch();
						}}
						onTargetUrlChange={setTargetUrl}
						onTierIdChange={setTierId}
						pricing={pricing}
						selectedTierLabel={selectedTier === null ? "Not selected yet" : `${selectedTier.displayName} · ${selectedTier.x402Price}`}
						targetUrl={targetUrl}
						tierId={tierId}
					/>
				) : null}
				{currentPath === "/dashboard" ? (
					<DashboardPage detail={dashboard.detail} notice={dashboard.notice} />
				) : null}
				{currentPath === "/api" ? <ApiPage curlSnippet={curlSnippet} pricing={pricing} /> : null}
				{currentPath === "/pricing" ? <PricingPage pricing={pricing} /> : null}
				{pricing.status === "error" ? (
					<Card className="surface-card border-red-200/80 bg-white/90">
						<CardContent className="p-5 text-sm leading-7 text-red-950">{pricing.message}</CardContent>
					</Card>
				) : null}
			</div>
		</main>
	);
}

function DemoPage({
	detail,
	notice,
	isCreating,
	isRescanning,
	onCreate,
	onRescan,
	onTargetUrlChange,
	onTierIdChange,
	pricing,
	selectedTierLabel,
	targetUrl,
	tierId,
}: {
	detail: ReturnType<typeof useWatchDashboard>["detail"];
	notice: ReturnType<typeof useWatchDashboard>["notice"];
	isCreating: boolean;
	isRescanning: boolean;
	onCreate: () => void;
	onRescan: () => void;
	onTargetUrlChange: (value: string) => void;
	onTierIdChange: (value: "standard" | "premium") => void;
	pricing: ReturnType<typeof usePricing>;
	selectedTierLabel: string;
	targetUrl: string;
	tierId: "standard" | "premium";
}) {
	return (
		<section className="grid gap-6">
			{notice === null ? null : <StatusBanner notice={notice} />}
			<div className="grid gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
				{pricing.status === "ready" ? (
					<CreateWatchForm
						eyebrow="Free scan"
						title="Try the free scan"
						description="Validate the baseline, then open the dashboard to inspect the workflow state and evidence trail."
						primaryActionLabel="Run free scan"
						secondaryActionLabel="Run another scan"
						targetUrl={targetUrl}
						tierId={tierId}
						tiers={pricing.data.tiers}
						detail={detail}
						isCreating={isCreating}
						isRescanning={isRescanning}
						onTargetUrlChange={onTargetUrlChange}
						onTierIdChange={onTierIdChange}
						onCreate={onCreate}
						onRescan={onRescan}
					/>
				) : (
					<PanelSkeleton />
				)}
				<DemoResultCard detail={detail} selectedTierLabel={selectedTierLabel} />
			</div>
		</section>
	);
}

function DashboardPage({
	detail,
	notice,
}: {
	detail: ReturnType<typeof useWatchDashboard>["detail"];
	notice: ReturnType<typeof useWatchDashboard>["notice"];
}) {
	if (detail === null) {
		return (
			<section className="grid gap-6">
				<Card className="surface-card border-dashed shadow-none">
					<CardContent className="grid gap-4 px-6 py-6">
						<p className="text-lg font-semibold tracking-[-0.03em] text-[#201914]">No watch has been created yet.</p>
						<p className="max-w-2xl text-sm leading-7 text-[#6f6054]">
							Open the demo route, run the free scan, and come back here to inspect the persisted watch state and run history.
						</p>
						<div className="flex flex-wrap gap-3">
							<RouteButtonLink path="/demo" label="Open demo" variant="default" />
							<RouteButtonLink path="/api" label="View paid API" variant="outline" />
						</div>
					</CardContent>
				</Card>
			</section>
		);
	}

	return (
		<section className="grid gap-6">
			{notice === null ? null : <StatusBanner notice={notice} />}
			<WatchSummaryCard watch={detail.watch} />
			<RunTimeline runs={detail.runs} />
		</section>
	);
}

function ApiPage({
	curlSnippet,
	pricing,
}: {
	curlSnippet: string;
	pricing: ReturnType<typeof usePricing>;
}) {
	return (
		<section className="grid gap-6">
			{pricing.status === "ready" ? (
				<ApiPanel
					curlSnippet={curlSnippet}
					primaryModelDisplayName={pricing.data.primaryModelDisplayName}
					primaryModelDocsUrl={pricing.data.primaryModelDocsUrl}
				/>
			) : (
				<PanelSkeleton />
			)}
		</section>
	);
}

function PricingPage({
	pricing,
}: {
	pricing: ReturnType<typeof usePricing>;
}) {
	return (
		<section className="grid gap-6">
			{pricing.status === "ready" ? <PricingGrid pricing={pricing.data} /> : <PanelSkeleton />}
		</section>
	);
}

function RouteNavigation({ currentPath, isDemoRoute }: { currentPath: AppPath; isDemoRoute: boolean }) {
	return (
		<nav
			aria-label="Primary navigation"
			className={
				isDemoRoute
					? "shell-card flex flex-wrap items-center gap-2 p-2"
					: "flex flex-wrap items-center gap-2 rounded-[1.35rem] border border-[#eadfd4] bg-white/74 p-1.5 shadow-[0_12px_30px_rgba(84,64,43,0.05)]"
			}
		>
			<div className="flex flex-wrap items-center gap-2">
				{appRoutes.map((route) => (
					<RouteLink key={route.path} currentPath={currentPath} route={route} />
				))}
			</div>
			<GitHubRepoLink />
		</nav>
	);
}

function RouteLink({
	currentPath,
	route,
}: {
	currentPath: AppPath;
	route: AppRoute;
}) {
	const isActive = currentPath === route.path;
	const Icon = route.icon;

	function onClick(event: MouseEvent<HTMLAnchorElement>): void {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}

		event.preventDefault();
		navigateTo(route.path, false);
	}

	return (
		<Button
			asChild
			variant="ghost"
			className={
				isActive
					? "rounded-[1rem] border border-[#ffd7b0] bg-[#fff4e8] px-4 text-[#ef6f08] shadow-[0_10px_24px_rgba(243,128,32,0.12)] hover:border-[#ffd7b0] hover:bg-[#fff6ed] hover:text-[#ef6f08] focus-visible:bg-[#fff6ed] focus-visible:text-[#ef6f08]"
					: "rounded-[1rem] px-4 text-[#6a5c4f] hover:bg-[#fff4ea] hover:text-[#201914] focus-visible:bg-[#fff4ea] focus-visible:text-[#201914]"
			}
		>
			<a aria-current={isActive ? "page" : undefined} href={route.path} onClick={onClick}>
				<Icon data-icon="inline-start" />
				{route.label}
			</a>
		</Button>
	);
}

function GitHubRepoLink() {
	return (
		<Button
			asChild
			variant="ghost"
			className="sm:ml-auto rounded-[1rem] border border-[#ead7c7] bg-[#fff8f1] px-4 text-[#45362b] shadow-[0_8px_20px_rgba(84,64,43,0.05)] hover:border-[#f1c9a5] hover:bg-[#fff2e6] hover:text-[#1f1813] focus-visible:border-[#f1c9a5] focus-visible:bg-[#fff2e6] focus-visible:text-[#1f1813]"
		>
			<a aria-label="Open GitHub repository" href={githubRepositoryUrl} rel="noreferrer" target="_blank">
				<GitHubMark />
				GitHub
			</a>
		</Button>
	);
}

function GitHubMark() {
	return (
		<svg
			aria-hidden="true"
			className="size-4"
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.51v-1.8c-2.94.64-3.56-1.25-3.56-1.25-.48-1.22-1.17-1.54-1.17-1.54-.95-.65.07-.64.07-.64 1.05.08 1.61 1.08 1.61 1.08.94 1.6 2.45 1.14 3.05.87.09-.68.37-1.14.67-1.4-2.35-.27-4.82-1.18-4.82-5.26 0-1.16.42-2.12 1.09-2.87-.11-.27-.47-1.37.1-2.85 0 0 .89-.29 2.92 1.09a10.18 10.18 0 0 1 5.32 0c2.03-1.38 2.92-1.09 2.92-1.09.57 1.48.21 2.58.1 2.85.68.75 1.09 1.71 1.09 2.87 0 4.09-2.48 4.98-4.84 5.24.38.33.72.97.72 1.96v2.91c0 .28.19.61.73.51A10.5 10.5 0 0 0 12 1.5Z" />
		</svg>
	);
}

function PageHeader({ route, compact = false }: { route: AppRoute; compact?: boolean }) {
	return (
		<section className={compact ? "grid gap-3" : "grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end"}>
			<div className="grid gap-2">
				<p className="page-kicker">{route.eyebrow}</p>
				<h1 className={compact ? "max-w-3xl text-balance text-[1.8rem] leading-[1.04] font-semibold tracking-[-0.05em] text-[#1f1b18] sm:text-[2.35rem]" : "page-title"}>
					{route.title}
				</h1>
			</div>
			{route.copy.length === 0 ? null : (
				<p className="page-copy">{route.copy}</p>
			)}
		</section>
	);
}

function DemoResultCard({
	detail,
	selectedTierLabel,
}: {
	detail: ReturnType<typeof useWatchDashboard>["detail"];
	selectedTierLabel: string;
}) {
	if (detail === null) {
		return (
			<Card className="surface-card border-dashed shadow-none">
				<CardContent className="grid gap-3 px-6 py-6">
					<p className="text-lg font-semibold tracking-[-0.03em] text-[#201914]">No scan has run yet.</p>
					<p className="text-sm leading-7 text-[#6f6054]">
						Run the free scan to create the first watch, then move to the dashboard for the full operator view.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="surface-card">
			<CardContent className="grid gap-5 p-6">
				<div className="grid gap-2">
					<h2 className="text-2xl leading-tight font-semibold tracking-[-0.04em] text-[#1f1b18]">Your free scan now has a persisted watch behind it.</h2>
					<p className="text-sm leading-7 text-[#67584d]">
						The dashboard route is where that watch becomes useful over time. Open it to inspect the full timeline, workflow status, and evidence memory.
					</p>
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					<DashboardMetric label="Watch status" value={detail.watch.status} />
					<DashboardMetric label="Selected tier" value={selectedTierLabel} />
					<DashboardMetric label="Runs stored" value={String(detail.watch.runCount)} />
				</div>
				<div className="flex flex-wrap gap-3">
					<RouteButtonLink path="/dashboard" label="Open dashboard" variant="default" />
					<RouteButtonLink path="/api" label="See paid API" variant="outline" />
				</div>
			</CardContent>
		</Card>
	);
}

function RouteButtonLink({
	path,
	label,
	variant,
}: {
	path: AppPath;
	label: string;
	variant: "default" | "outline";
}) {
	function onClick(event: MouseEvent<HTMLAnchorElement>): void {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}

		event.preventDefault();
		navigateTo(path, false);
	}

	return (
		<Button
			asChild
			variant={variant}
			className={variant === "default" ? "rounded-full bg-[#201914] px-5 text-white hover:bg-[#201914]" : "rounded-full border-[#d4c0b1] bg-transparent"}
		>
			<a href={path} onClick={onClick}>
				{label}
			</a>
		</Button>
	);
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="metric-tile">
			<p className="metric-label">{label}</p>
			<p className="metric-value">{value}</p>
		</div>
	);
}

function PanelSkeleton() {
	return (
		<Card className="surface-card shadow-none">
			<CardContent className="grid gap-4 p-6">
				<Skeleton className="h-7 w-36 rounded-full bg-[#f1dfcf]" />
				<Skeleton className="h-12 w-full rounded-2xl bg-[#f1dfcf]" />
				<Skeleton className="h-12 w-full rounded-2xl bg-[#f1dfcf]" />
				<Skeleton className="h-48 w-full rounded-[1.75rem] bg-[#f1dfcf]" />
			</CardContent>
		</Card>
	);
}

function normalizePath(pathname: string): AppPath {
	const canonicalPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

	switch (canonicalPath) {
		case "/demo":
			return "/demo";
		case "/dashboard":
			return "/dashboard";
		case "/api":
			return "/api";
		case "/pricing":
			return "/pricing";
		default:
			return "/demo";
	}
}

function getRoute(path: AppPath): AppRoute {
	for (const route of appRoutes) {
		if (route.path === path) {
			return route;
		}
	}

	return appRoutes[0];
}

function readCurrentPath(): AppPath {
	if (typeof window === "undefined") {
		return "/demo";
	}

	return normalizePath(window.location.pathname);
}

function getServerPath(): AppPath {
	return readCurrentPath();
}

function subscribeToLocationChanges(callback: () => void): () => void {
	if (typeof window === "undefined") {
		return () => undefined;
	}

	window.addEventListener("popstate", callback);
	return () => {
		window.removeEventListener("popstate", callback);
	};
}

function navigateTo(path: AppPath, replace: boolean): void {
	if (typeof window === "undefined") {
		return;
	}

	if (window.location.pathname === path) {
		return;
	}

	const nextUrl = new URL(window.location.href);
	nextUrl.pathname = path;
	nextUrl.search = "";
	nextUrl.hash = "";

	if (replace) {
		window.history.replaceState(null, "", nextUrl);
	} else {
		window.history.pushState(null, "", nextUrl);
	}

	window.dispatchEvent(new PopStateEvent("popstate"));
}

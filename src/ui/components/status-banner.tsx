import { AlertTriangle, CircleCheckBig, Info, OctagonX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DashboardNotice } from "../hooks/use-watch-dashboard";

type NoticeVisual = {
	icon: typeof Info;
	title: string;
	className: string;
};

function visualForTone(tone: DashboardNotice["tone"]): NoticeVisual {
	switch (tone) {
		case "success":
			return {
				icon: CircleCheckBig,
				title: "Ready",
				className: "border-emerald-200/80 bg-white/82 text-emerald-950 shadow-none",
			};
		case "warning":
			return {
				icon: AlertTriangle,
				title: "Attention",
				className: "border-amber-200/80 bg-white/82 text-amber-950 shadow-none",
			};
		case "error":
			return {
				icon: OctagonX,
				title: "Request failed",
				className: "border-red-200/80 bg-white/82 text-red-950 shadow-none",
			};
		case "neutral":
			return {
				icon: Info,
				title: "In progress",
				className: "border-[#ffd1b0] bg-white/82 text-[#5f3210] shadow-none",
			};
	}
}

export function StatusBanner({ notice }: { notice: DashboardNotice | null }) {
	if (notice === null) {
		return null;
	}

	const visual = visualForTone(notice.tone);
	const Icon = visual.icon;

	return (
		<Alert className={visual.className}>
			<Icon className="size-4" />
			<AlertTitle>{visual.title}</AlertTitle>
			<AlertDescription>{notice.message}</AlertDescription>
		</Alert>
	);
}

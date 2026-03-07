import { Agent, callable } from "agents";
import {
	createRunId,
	createWatchConfig,
	initialWatchState,
	toWatchDetail,
	type CreateWatchInput,
	type MonitoringWatchState,
	type RunKind,
	type WatchDetail,
	type WatchRun,
	type WatchState,
} from "./domain";
import { capturePage } from "./fixtures";
import { analyzeCapturedPage } from "./analysis";
import { getPricingTier } from "./pricing";

export class WatchAgent extends Agent<Env, WatchState> {
	initialState = initialWatchState();

	@callable()
	async createWatch(input: CreateWatchInput): Promise<WatchDetail> {
		if (this.state.phase === "monitoring") {
			return this.requireWatchDetail();
		}

		const createdAt = new Date().toISOString();
		const watchConfig = createWatchConfig(this.name, input, createdAt);
		const schedule = await this.scheduleEvery(watchConfig.cadenceMinutes * 60, "runScheduledRescan", undefined, {
			_idempotent: true,
		});

		this.setState({
			phase: "monitoring",
			config: watchConfig,
			runs: [],
			remainingRuns: watchConfig.includedRuns,
			scheduleId: schedule.id,
			lastError: null,
		});

		await this.executeScan("baseline");
		return this.requireWatchDetail();
	}

	@callable()
	async getWatchDetail(): Promise<WatchDetail | null> {
		return toWatchDetail(this.state);
	}

	@callable()
	async performManualRescan(): Promise<WatchDetail> {
		await this.executeScan("rescan");
		return this.requireWatchDetail();
	}

	async runScheduledRescan(): Promise<void> {
		await this.executeScan("rescan");
	}

	private async executeScan(kind: RunKind): Promise<void> {
		if (this.state.phase !== "monitoring") {
			return;
		}

		if (this.state.remainingRuns === 0) {
			await this.stopScheduling(this.state);
			return;
		}

		const run = await this.captureRun(kind, this.state);
		const remainingRuns = Math.max(this.state.remainingRuns - 1, 0);
		const nextState: MonitoringWatchState = {
			...this.state,
			runs: [...this.state.runs, run],
			remainingRuns,
			lastError: run.status === "failed" ? run.narrativeSummary : null,
		};

		this.setState(nextState);

		if (remainingRuns === 0) {
			await this.stopScheduling(nextState);
		}
	}

	private async captureRun(kind: RunKind, state: MonitoringWatchState): Promise<WatchRun> {
		const startedAt = new Date().toISOString();
		const runIndex = state.runs.length;
		const pricingTier = getPricingTier(state.config.pricingTierId);
		if (pricingTier === null) {
			throw new Error(`Unknown pricing tier ${state.config.pricingTierId}`);
		}

		try {
			const page = await capturePage({
				targetUrl: state.config.targetUrl,
				runIndex,
			});
			const previousRun = state.runs.at(-1) ?? null;
			const analysis = await analyzeCapturedPage(this.env, page, pricingTier, previousRun);
			const completedAt = new Date().toISOString();

			return {
				id: createRunId(kind),
				kind,
				status: "succeeded",
				startedAt,
				completedAt,
				modelName: pricingTier.modelName,
				pageTitle: page.title,
				canonicalUrl: page.url,
				contentDigest: analysis.contentDigest,
				narrativeSummary: analysis.narrativeSummary,
				findings: analysis.findings,
				diffReport: analysis.diffReport,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown scan failure";
			const completedAt = new Date().toISOString();
			return {
				id: createRunId(kind),
				kind,
				status: "failed",
				startedAt,
				completedAt,
				modelName: pricingTier.modelName,
				pageTitle: "Scan failed",
				canonicalUrl: state.config.targetUrl,
				contentDigest: "",
				narrativeSummary: message,
				findings: [],
				diffReport: {
					hasChanges: false,
					newIssues: [],
					resolvedIssues: [],
					regressions: [],
					stabilityNote: "Scan failed before diffing could complete.",
				},
			};
		}
	}

	private requireWatchDetail(): WatchDetail {
		const detail = toWatchDetail(this.state);
		if (detail === null) {
			throw new Error("Watch not initialized");
		}

		return detail;
	}

	private async stopScheduling(state: MonitoringWatchState): Promise<void> {
		if (state.scheduleId === null) {
			return;
		}

		await this.cancelSchedule(state.scheduleId);
		this.setState({
			...state,
			scheduleId: null,
		});
	}
}

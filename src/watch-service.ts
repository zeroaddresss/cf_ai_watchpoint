import { getAgentByName } from "agents";
import { parseCreateWatchInput, type ManualRescanResult, type WatchDetail } from "./domain";

export async function createWatch(env: Env, payload: unknown): Promise<WatchDetail | null> {
	const input = parseCreateWatchInput(payload);
	if (input === null) {
		return null;
	}

	const watchId = `watch_${crypto.randomUUID()}`;
	const stub = await getAgentByName(env.WATCH_AGENT, watchId);
	return stub.createWatch(input);
}

export async function getWatchDetail(env: Env, watchId: string): Promise<WatchDetail | null> {
	const stub = await getAgentByName(env.WATCH_AGENT, watchId);
	return stub.getWatchDetail();
}

export async function triggerRescan(env: Env, watchId: string): Promise<ManualRescanResult | null> {
	const stub = await getAgentByName(env.WATCH_AGENT, watchId);
	return stub.performManualRescan();
}

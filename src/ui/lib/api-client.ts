import {
	apiErrorParser,
	pricingResponseParser,
	rescanAcceptedParser,
	rescanRejectedParser,
	watchDetailParser,
	type ApiErrorPayload,
	type PricingResponse,
	type RescanAccepted,
	type RescanRejected,
	type WatchDetail,
} from "./contracts";

export class ApiClientError extends Error {
	readonly status: number;
	readonly detail: WatchDetail | null;

	constructor(status: number, message: string, detail: WatchDetail | null) {
		super(message);
		this.name = "ApiClientError";
		this.status = status;
		this.detail = detail;
	}
}

export async function fetchPricing(signal?: AbortSignal): Promise<PricingResponse> {
	const response = await fetch("/api/pricing", { signal });
	return parseSuccess(response, pricingResponseParser);
}

export async function createDemoWatch(
	targetUrl: string,
	tierId: "standard" | "premium",
): Promise<WatchDetail> {
	const response = await fetch("/api/demo/watch", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({
			targetUrl,
			tierId,
		}),
	});

	return parseSuccess(response, watchDetailParser);
}

export async function fetchWatchDetail(watchId: string, signal?: AbortSignal): Promise<WatchDetail> {
	const response = await fetch(`/api/watch/${watchId}`, { signal });
	return parseSuccess(response, watchDetailParser);
}

export async function triggerManualRescan(watchId: string): Promise<RescanAccepted | RescanRejected> {
	const response = await fetch(`/api/watch/${watchId}/rescan`, {
		method: "POST",
	});

	if (response.status === 202) {
		return parseSuccess(response, rescanAcceptedParser);
	}

	if (response.status === 409) {
		const payload = await parseJson(response);
		const parsed = rescanRejectedParser.safeParse(payload);
		if (!parsed.success) {
			throw new ApiClientError(409, "Watchpoint returned an invalid rescan error payload.", null);
		}

		return parsed.data;
	}

	throw await toApiClientError(response);
}

async function parseSuccess<T>(
	response: Response,
	parser: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
): Promise<T> {
	if (!response.ok) {
		throw await toApiClientError(response);
	}

	const payload = await parseJson(response);
	const parsed = parser.safeParse(payload);
	if (!parsed.success) {
		throw new ApiClientError(response.status, "Watchpoint returned an invalid success payload.", null);
	}

	return parsed.data;
}

async function toApiClientError(response: Response): Promise<ApiClientError> {
	const payload = await parseJson(response);
	const parsed = apiErrorParser.safeParse(payload);
	if (parsed.success) {
		return new ApiClientError(response.status, parsed.data.error, parsed.data.detail ?? null);
	}

	return new ApiClientError(response.status, `Watchpoint request failed with status ${response.status}.`, null);
}

async function parseJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		const fallback: ApiErrorPayload = {
			error: "Watchpoint returned a non-JSON payload.",
		};
		return fallback;
	}
}

export const primaryModelDisplayName = "GLM 4.7 Flash";
export const primaryModelDocsUrl = "https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/";

export type ModelName =
	| "@cf/zai-org/glm-4.5-air-fp8"
	| "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export type PricingTierId = "standard" | "premium";

export type PricingTier = {
	id: PricingTierId;
	displayName: string;
	x402Price: `$${number}.${number}${number}`;
	includedRuns: number;
	cadenceMinutes: number;
	modelName: ModelName;
	capacitySummary: string;
	referenceDocsUrl: string;
};

const pricingTiers = {
	standard: {
		id: "standard",
		displayName: "GLM 4.7 Flash",
		x402Price: "$0.07",
		includedRuns: 3,
		cadenceMinutes: 60,
		modelName: "@cf/zai-org/glm-4.5-air-fp8",
		capacitySummary: "Fast, lower-cost monitoring for stable sites.",
		referenceDocsUrl: primaryModelDocsUrl,
	},
	premium: {
		id: "premium",
		displayName: "Llama 3.3 70B",
		x402Price: "$0.18",
		includedRuns: 5,
		cadenceMinutes: 30,
		modelName: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		capacitySummary: "Higher-capacity summaries and regression narratives.",
		referenceDocsUrl: "https://developers.cloudflare.com/agents/",
	},
} satisfies Record<PricingTierId, PricingTier>;

export function listPricingTiers(): PricingTier[] {
	return Object.values(pricingTiers);
}

export function getPricingTier(id: string): PricingTier | null {
	if (id === "standard" || id === "premium") {
		return pricingTiers[id];
	}

	return null;
}

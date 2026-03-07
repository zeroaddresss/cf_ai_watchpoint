import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		exclude: ["e2e/**", "playwright.config.ts"],
		poolOptions: {
			workers: {
				remoteBindings: false,
				miniflare: {
					bindings: {
						WATCHPOINT_CAPTURE_MODE: "fixture",
						WATCHPOINT_USE_WORKERS_AI: "false",
					},
				},
				wrangler: { configPath: './wrangler.jsonc' },
			},
		},
	},
});

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				remoteBindings: false,
				miniflare: {
					bindings: {
						WATCHPOINT_USE_WORKERS_AI: "false",
					},
				},
				wrangler: { configPath: './wrangler.jsonc' },
			},
		},
	},
});

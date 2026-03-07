import { defineConfig } from "@playwright/test";

const port = 8788;

export default defineConfig({
	testDir: "./e2e",
	timeout: 20_000,
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		headless: true,
	},
	webServer: {
		command: `npx wrangler dev --local --ip 127.0.0.1 --port ${port} --var WATCHPOINT_CAPTURE_MODE:fixture --var WATCHPOINT_USE_WORKERS_AI:false`,
		url: `http://127.0.0.1:${port}/api/health`,
		reuseExistingServer: true,
		timeout: 60_000,
	},
});

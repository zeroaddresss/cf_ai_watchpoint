import { expect, test } from "@playwright/test";

test("creates a watch, surfaces workflow state, and renders regression diff after manual rescan", async ({
	page,
}) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { name: /watchpoint monitors sites/i })).toBeVisible();
	await expect(page.locator("#tiers .card")).toHaveCount(2);
	await expect(page.locator("#curl-snippet")).toContainText("/api/watch/tiers/standard");

	await page.getByRole("combobox", { name: /pricing tier/i }).selectOption("premium");
	await expect(page.locator("#curl-snippet")).toContainText("/api/watch/tiers/premium");

	await page.getByRole("combobox", { name: /pricing tier/i }).selectOption("standard");
	await page.getByRole("button", { name: /create demo watch/i }).click();

	await expect(page.locator("#watch-summary")).toContainText("Status: waiting");
	await expect(page.locator("#watch-summary")).toContainText("Trigger: automatic");
	await expect(page.locator("#timeline .card")).toHaveCount(1);
	await expect(page.locator("#timeline .card").first()).toContainText("BASELINE");

	await page.getByRole("button", { name: /trigger re-scan/i }).click();

	await expect(page.locator("#watch-summary")).toContainText("Status: waiting");
	await expect(page.locator("#timeline .card")).toHaveCount(2);
	await expect(page.locator("#timeline .card").first()).toContainText("RESCAN");
	await expect(page.locator("#timeline .card").first()).toContainText("Meaningful changes detected");
});

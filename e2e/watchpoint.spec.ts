import { expect, test, type Page } from "@playwright/test";

test("creates a watch, surfaces workflow state, and renders regression diff after manual rescan", async ({
	page,
}) => {
	const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });

	await page.goto("/demo");

	await expect(page.getByRole("heading", { name: /watchpoint catches what uptime checks miss/i })).toBeVisible();
	await expect(page.getByRole("button", { name: /run free scan/i })).toBeVisible();

	await selectPricingTier(page, "Llama 3.3 70B");
	await page.goto("/api");
	await expect(page).toHaveURL(/\/api$/);
	await expect(page.getByText("Paid programmatic flow")).toBeVisible();
	await page.goto("/dashboard");
	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByText("No watch has been created yet.")).toBeVisible();

	await primaryNavigation.getByRole("link", { name: "Demo" }).click();
	await expect(page).toHaveURL(/\/demo$/);
	await selectPricingTier(page, "GLM 4.7 Flash");
	await page.getByRole("button", { name: /run free scan/i }).click();

	await expect(page.getByRole("link", { name: /open dashboard/i })).toBeVisible();
	await page.getByRole("link", { name: /open dashboard/i }).click();
	await expect(page).toHaveURL(/\/dashboard$/);

	await expect(page.getByText("Watch summary")).toBeVisible();
	await expect(page.getByText("automatic")).toBeVisible();
	await expect(page.locator('span[data-slot="badge"]').filter({ hasText: /^BASELINE$/ }).first()).toBeVisible();

	await primaryNavigation.getByRole("link", { name: "Demo" }).click();
	await page.getByRole("button", { name: /run another scan/i }).click();
	await primaryNavigation.getByRole("link", { name: "Dashboard" }).click();

	await expect(page.locator('span[data-slot="badge"]').filter({ hasText: /^RESCAN$/ }).first()).toBeVisible();
	await expect(page.getByText("Meaningful changes detected", { exact: true })).toBeVisible();
});

async function selectPricingTier(page: Page, optionLabel: string): Promise<void> {
	await page.getByRole("combobox", { name: /pricing tier/i }).click();
	await page.getByRole("option", { name: new RegExp(optionLabel, "i") }).click();
}

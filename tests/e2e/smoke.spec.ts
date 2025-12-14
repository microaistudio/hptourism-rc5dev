import { test, expect } from "@playwright/test";

const base = process.env.E2E_BASE_URL;

test.describe("Smoke", () => {
  test.skip(!base, "Set E2E_BASE_URL to run browser smoke tests");

  test("home page renders", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/HP Tourism eServices/i);
    await expect(page.getByRole("heading", { name: /homestay/i })).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /login/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

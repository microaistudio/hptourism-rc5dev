import { test, expect } from "@playwright/test";

/**
 * Quick E2E Tests (~30 seconds)
 * Fast smoke tests for CI/CD validation after deployments.
 * Run with: npm run test:quick
 */

const baseURL = process.env.E2E_BASE_URL || "https://dev.osipl.dev";

test.describe("Quick Tests - Critical Path Validation", () => {
    test.beforeEach(async ({ page }) => {
        // Set reasonable timeout for quick tests
        test.setTimeout(30000);
    });

    test.describe("Public Pages", () => {
        test("home page loads with correct title and hero", async ({ page }) => {
            await page.goto(`${baseURL}/`);
            await expect(page).toHaveTitle(/HP Tourism/i);

            // Check hero section renders
            const heroText = page.getByText(/homestay|registration|portal/i).first();
            await expect(heroText).toBeVisible({ timeout: 5000 });
        });

        test("login page renders with form elements", async ({ page }) => {
            await page.goto(`${baseURL}/login`);

            // Wait for Sign In button to be visible (confirms React has rendered)
            const signInBtn = page.getByRole("button", { name: /sign in/i });
            await expect(signInBtn).toBeVisible({ timeout: 15000 });

            // Check for input fields
            const usernameInput = page.getByRole("textbox").first();
            await expect(usernameInput).toBeVisible();
        });

        test("registration page loads correctly", async ({ page }) => {
            await page.goto(`${baseURL}/register`);

            // Check page has loaded by looking for form elements
            await page.waitForLoadState("networkidle");

            const hasForm = await page.locator('form, input, [role="form"]').first().isVisible({ timeout: 5000 }).catch(() => false);
            const hasHeading = await page.getByRole("heading").first().isVisible({ timeout: 5000 }).catch(() => false);

            expect(hasForm || hasHeading).toBeTruthy();
        });

        test("existing owner onboarding page loads", async ({ page }) => {
            await page.goto(`${baseURL}/existing-owner`);

            // Should redirect to login or show onboarding form
            await page.waitForLoadState("networkidle");
            const pageContent = await page.content();
            const hasRelevantContent =
                pageContent.toLowerCase().includes("login") ||
                pageContent.toLowerCase().includes("owner") ||
                pageContent.toLowerCase().includes("register");

            expect(hasRelevantContent).toBeTruthy();
        });
    });

    test.describe("API Health Checks", () => {
        test("auth endpoint responds correctly", async ({ request }) => {
            const response = await request.get(`${baseURL}/api/auth/me`);
            // Should respond with 200 (whether authenticated or not)
            expect([200, 401]).toContain(response.status());
        });

        test("upload policy endpoint responds", async ({ request }) => {
            const response = await request.get(`${baseURL}/api/settings/upload-policy`);
            // Protected endpoint may return 401 for unauthenticated requests
            expect([200, 401, 403]).toContain(response.status());

            if (response.status() === 200) {
                const body = await response.json();
                expect(body).toHaveProperty("documents");
                expect(body).toHaveProperty("photos");
            }
        });

        test("system settings endpoint responds", async ({ request }) => {
            const response = await request.get(`${baseURL}/api/settings/payment-workflow`);
            expect([200, 401, 403]).toContain(response.status());
        });
    });

    test.describe("Static Assets", () => {
        test("CSS loads correctly", async ({ page }) => {
            const cssResponses: number[] = [];

            page.on("response", (response) => {
                if (response.url().includes(".css")) {
                    cssResponses.push(response.status());
                }
            });

            await page.goto(`${baseURL}/`);
            await page.waitForLoadState("networkidle");

            // All CSS requests should succeed
            cssResponses.forEach((status) => {
                expect([200, 304]).toContain(status);
            });
        });

        test("JavaScript bundles load", async ({ page }) => {
            const jsResponses: number[] = [];

            page.on("response", (response) => {
                if (response.url().includes(".js") && response.url().includes("/assets/")) {
                    jsResponses.push(response.status());
                }
            });

            await page.goto(`${baseURL}/`);
            await page.waitForLoadState("networkidle");

            expect(jsResponses.length).toBeGreaterThan(0);
            jsResponses.forEach((status) => {
                expect([200, 304]).toContain(status);
            });
        });

        test("favicon loads", async ({ request }) => {
            const response = await request.get(`${baseURL}/favicon.png`);
            expect([200, 304]).toContain(response.status());
        });
    });

    test.describe("Navigation", () => {
        test("navigation links work correctly", async ({ page }) => {
            await page.goto(`${baseURL}/`);

            // Find and click login link
            const loginLink = page.getByRole("link", { name: /login|sign in/i }).first();
            if (await loginLink.isVisible()) {
                await loginLink.click();
                await expect(page).toHaveURL(/login/);
            }
        });

        test("404 page renders for invalid routes", async ({ page }) => {
            await page.goto(`${baseURL}/this-page-does-not-exist-12345`);

            // Should show 404 or redirect to home
            const is404 = await page.getByText(/not found|404/i).isVisible().catch(() => false);
            const isHome = await page.getByText(/homestay|tourism/i).isVisible().catch(() => false);

            expect(is404 || isHome).toBeTruthy();
        });
    });
});

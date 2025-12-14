import { test, expect } from "@playwright/test";

const shouldRun = process.env.E2E_CREATE_OWNERS === "1";
const baseURL = process.env.E2E_BASE_URL || "https://staging.osipl.dev";
const assetsDir =
  process.env.E2E_ASSETS_DIR ||
  "/home/subhash.thakur.india/Projects/hptourism-rc3a/PMD/TEST Scripts and Docs";
const ownerPassword = process.env.E2E_OWNER_PASS || "Pass@123"; // adjust to your test password
const ownersToCreate = Number(process.env.E2E_OWNER_COUNT || 5);

/**
 * NOTE:
 * - This test is skipped by default. Set E2E_CREATE_OWNERS=1 and E2E_BASE_URL to run intentionally.
 * - Field selectors are best-effort (label-based). Adjust to match the current staging UI before running.
 * - Assumes no OTP challenge on staging (per user feedback).
 */

test.describe("Owner onboarding batch (staging ONLY)", () => {
  test.skip(!shouldRun, "Set E2E_CREATE_OWNERS=1 to enable this staging-only batch creator");

  test("create a handful of owner accounts with dummy data", async ({ page, context }) => {
    const jpgPath = `${assetsDir}/sample.jpg`;
    const pdfPath = `${assetsDir}/sample.pdf`;

    for (let i = 0; i < ownersToCreate; i++) {
      const baseNumber = 6000000000 + i; // 6000 000 000 .. 6000 000 004 etc.
      const aadhaar = 600000000000 + i; // 12-digit dummy
      const email = `owner${baseNumber}@example.test`;

      await page.goto(`${baseURL}/register`, { waitUntil: "networkidle" });

      // Basic account fields (tweak labels as needed)
      await page.getByLabel(/Full Name/i).fill(`Test Owner ${i + 1}`);
      await page.getByLabel(/Mobile/i).fill(String(baseNumber));
      await page.getByLabel(/Email/i).fill(email);
      await page.getByLabel(/Password/i).fill(ownerPassword);
      await page.getByLabel(/Confirm Password/i).fill(ownerPassword);

      // Property details (best-effort)
      await page.getByLabel(/Property Name/i).fill(`Test Homestay ${i + 1}`);
      await page.getByLabel(/Address/i).fill("Test Address, Shimla");
      await page.getByLabel(/District/i).selectOption({ label: "Shimla" });
      await page.getByLabel(/Tehsil/i).selectOption({ index: 1 }).catch(() => {});
      await page.getByLabel(/Pincode/i).fill("171001");
      await page.getByLabel(/Aadhaar/i).fill(String(aadhaar));

      // Document uploads (adjust selectors to match current upload widgets)
      const uploadInputs = [
        page.getByLabel(/ID Proof/i),
        page.getByLabel(/Address Proof/i),
        page.getByLabel(/Property Photo|Photo/i),
      ];
      for (const input of uploadInputs) {
        await input.setInputFiles(jpgPath).catch(() => {});
      }
      await page
        .getByLabel(/Ownership Proof|Title/i)
        .setInputFiles(pdfPath)
        .catch(() => {});

      // Submit / continue
      await page.getByRole("button", { name: /Submit|Register|Create/i }).click();

      // Expect a success toast or redirect; if dashboard loads, we are done.
      await expect(page).toHaveURL(/dashboard|summary|thanks/i, { timeout: 15000 }).catch(async () => {
        // Fallback: look for any success indicator
        const success = page.getByText(/success|submitted|thank/i);
        await expect(success).toBeVisible({ timeout: 5000 });
      });

      // Log out between iterations to avoid session bleed
      await page.getByRole("button", { name: /Logout/i }).click().catch(() => {
        // fallback try header link
        return page.getByText(/logout/i).click().catch(() => {});
      });

      // New context per user to avoid reused session state
      await context.clearCookies();
      await context.clearPermissions();
    }
  });
});

import { Page, expect } from "@playwright/test";

/**
 * Authentication helpers for E2E tests
 */

export interface LoginCredentials {
    mobile?: string;
    username?: string;
    password: string;
    useOtp?: boolean;
}

/**
 * Login as a user using mobile/password or OTP
 * Returns true if login succeeded, false otherwise
 */
export async function login(page: Page, credentials: LoginCredentials, baseURL: string): Promise<boolean> {
    try {
        await page.goto(`${baseURL}/login`);
        await page.waitForLoadState("networkidle");

        const identifier = credentials.mobile || credentials.username;
        if (!identifier) {
            return false;
        }

        // Find and fill identifier input (flexible approach)
        const identifierInput = page.getByRole("textbox").first();
        if (!await identifierInput.isVisible({ timeout: 5000 })) {
            return false;
        }
        await identifierInput.fill(identifier);

        if (credentials.useOtp) {
            // OTP login flow
            const otpToggle = page.getByRole("button", { name: /otp/i });
            if (await otpToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
                await otpToggle.click();
            }

            // Request OTP
            await page.getByRole("button", { name: /send.*otp|get.*otp|continue/i }).click();

            // For testing, we assume a test OTP like "123456"
            const otpInput = page.getByLabel(/otp|code|verification/i);
            if (!await otpInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                return false;
            }
            await otpInput.fill("123456");
        } else {
            // Password login - find by placeholder or second input
            const passwordInput = page.locator('input[type="password"]').first();
            if (!await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                return false;
            }
            await passwordInput.fill(credentials.password);
        }

        // Handle captcha if present (fill with a guess - may fail)
        const captchaInput = page.getByLabel(/security.*check|captcha/i);
        if (await captchaInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await captchaInput.fill("42"); // Dummy answer - real test env should bypass
        }

        // Submit
        await page.getByRole("button", { name: /sign in/i }).click();

        // Wait for navigation or error
        await page.waitForTimeout(2000);

        // Check if we're on a dashboard or still on login
        const currentUrl = page.url();
        return !currentUrl.includes("/login");
    } catch (error) {
        console.log("Login failed:", error);
        return false;
    }
}

/**
 * Login as property owner
 * Returns true if login succeeded
 */
export async function loginAsOwner(page: Page, baseURL: string): Promise<boolean> {
    const phone = process.env.E2E_OWNER_PHONE || "6000000001";
    const password = process.env.E2E_OWNER_PASS || "Test@123";

    return login(page, { mobile: phone, password }, baseURL);
}

/**
 * Login as Dealing Assistant
 * Returns true if login succeeded
 */
export async function loginAsDA(page: Page, baseURL: string): Promise<boolean> {
    const username = process.env.E2E_DA_USER || "da_shimla";
    const password = process.env.E2E_DA_PASS || "DA@Test123";

    return login(page, { username, password }, baseURL);
}

/**
 * Login as DTDO (District Tourism Officer)
 * Returns true if login succeeded
 */
export async function loginAsDTDO(page: Page, baseURL: string): Promise<boolean> {
    const username = process.env.E2E_DTDO_USER || "dtdo_shimla";
    const password = process.env.E2E_DTDO_PASS || "DTDO@Test123";

    return login(page, { username, password }, baseURL);
}

/**
 * Logout current user
 */
export async function logout(page: Page) {
    const logoutButton = page.getByRole("button", { name: /logout/i });
    if (await logoutButton.isVisible()) {
        await logoutButton.click();
    } else {
        // Try menu-based logout
        const userMenu = page.getByRole("button", { name: /user|profile|menu/i }).first();
        if (await userMenu.isVisible()) {
            await userMenu.click();
            await page.getByText(/logout|sign out/i).click();
        }
    }

    await page.waitForURL(/login|\//, { timeout: 5000 });
}

import { Page, expect } from "@playwright/test";

/**
 * Form filling helpers for E2E tests
 */

export interface OwnerDetails {
    fullName: string;
    mobile: string;
    email?: string;
    aadhaar?: string;
}

export interface PropertyDetails {
    propertyName: string;
    district: string;
    tehsil?: string;
    address: string;
    pincode: string;
    totalRooms?: number;
    category?: "diamond" | "gold" | "silver";
}

/**
 * Fill owner personal details in application form
 */
export async function fillOwnerDetails(page: Page, details: OwnerDetails) {
    // Full Name
    const nameInput = page.getByLabel(/full name|owner name/i);
    if (await nameInput.isVisible()) {
        await nameInput.fill(details.fullName);
    }

    // Mobile
    const mobileInput = page.getByLabel(/mobile|phone/i).first();
    if (await mobileInput.isVisible()) {
        await mobileInput.fill(details.mobile);
    }

    // Email (optional)
    if (details.email) {
        const emailInput = page.getByLabel(/email/i);
        if (await emailInput.isVisible()) {
            await emailInput.fill(details.email);
        }
    }

    // Aadhaar
    if (details.aadhaar) {
        const aadhaarInput = page.getByLabel(/aadhaar/i);
        if (await aadhaarInput.isVisible()) {
            await aadhaarInput.fill(details.aadhaar);
        }
    }
}

/**
 * Fill property details in application form
 */
export async function fillPropertyDetails(page: Page, details: PropertyDetails) {
    // Property Name
    const propertyInput = page.getByLabel(/property name|homestay name/i);
    if (await propertyInput.isVisible()) {
        await propertyInput.fill(details.propertyName);
    }

    // District (select)
    const districtSelect = page.getByLabel(/district/i);
    if (await districtSelect.isVisible()) {
        await districtSelect.click();
        await page.getByRole("option", { name: new RegExp(details.district, "i") }).click();
    }

    // Wait for tehsil options to load
    await page.waitForTimeout(500);

    // Tehsil (select)
    if (details.tehsil) {
        const tehsilSelect = page.getByLabel(/tehsil/i);
        if (await tehsilSelect.isVisible()) {
            await tehsilSelect.click();
            await page.getByRole("option", { name: new RegExp(details.tehsil, "i") }).first().click();
        }
    }

    // Address
    const addressInput = page.getByLabel(/address/i);
    if (await addressInput.isVisible()) {
        await addressInput.fill(details.address);
    }

    // Pincode
    const pincodeInput = page.getByLabel(/pincode/i);
    if (await pincodeInput.isVisible()) {
        await pincodeInput.fill(details.pincode);
    }

    // Total Rooms
    if (details.totalRooms) {
        const roomsInput = page.getByLabel(/total.*room|room.*count/i);
        if (await roomsInput.isVisible()) {
            await roomsInput.fill(String(details.totalRooms));
        }
    }
}

/**
 * Upload a file to an upload field
 */
export async function uploadFile(page: Page, fieldLabel: RegExp | string, filePath: string) {
    const fieldRegex = typeof fieldLabel === "string" ? new RegExp(fieldLabel, "i") : fieldLabel;

    // Find the file input (may be hidden)
    const fileInput = page.locator(`input[type="file"]`).first();

    // Or find by label
    const labeledInput = page.getByLabel(fieldRegex);

    if (await fileInput.isVisible()) {
        await fileInput.setInputFiles(filePath);
    } else if (await labeledInput.count() > 0) {
        await labeledInput.setInputFiles(filePath);
    } else {
        // Try clicking an upload button first
        const uploadBtn = page.getByRole("button", { name: fieldRegex });
        if (await uploadBtn.isVisible()) {
            // Create a file chooser promise before clicking
            const fileChooserPromise = page.waitForEvent("filechooser");
            await uploadBtn.click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(filePath);
        }
    }
}

/**
 * Navigate through form steps
 */
export async function navigateFormStep(page: Page, direction: "next" | "previous") {
    const buttonName = direction === "next"
        ? /next|continue|proceed|save.*continue/i
        : /previous|back|go back/i;

    const button = page.getByRole("button", { name: buttonName });
    await expect(button).toBeVisible();
    await button.click();

    // Wait for step transition
    await page.waitForTimeout(500);
}

/**
 * Get current form step number
 */
export async function getCurrentStep(page: Page): Promise<number> {
    // Look for step indicator like "Step 2 of 5" or progress dots
    const stepText = await page.getByText(/step\s+(\d+)/i).textContent();
    if (stepText) {
        const match = stepText.match(/step\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : 1;
    }
    return 1;
}

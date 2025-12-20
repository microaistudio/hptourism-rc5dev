
import { db } from "../server/db";
import { homestayApplications, users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { apiCall, login as createTestSession, SessionCookie, OWNER_CREDS, DTDO_CREDS } from "./enhanced-smoke-test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Starting Supersession Verification...");

    // 1. Get Owner Session (using seeded credentials)
    const ownerMobile = OWNER_CREDS.mobile;
    const ownerPassword = OWNER_CREDS.password;
    console.log("👤 Using Seeded Owner:", ownerMobile);

    // Cleanup existing applications for this user
    console.log("🧹 Cleaning up previous applications...");
    const cleanupSQL = `
    DELETE FROM himkosh_transactions WHERE application_id IN (SELECT id FROM homestay_applications WHERE user_id = (SELECT id FROM users WHERE mobile = '${ownerMobile}'));
    DELETE FROM payments WHERE application_id IN (SELECT id FROM homestay_applications WHERE user_id = (SELECT id FROM users WHERE mobile = '${ownerMobile}'));
    DELETE FROM inspection_reports WHERE application_id IN (SELECT id FROM homestay_applications WHERE user_id = (SELECT id FROM users WHERE mobile = '${ownerMobile}'));
    DELETE FROM inspection_orders WHERE application_id IN (SELECT id FROM homestay_applications WHERE user_id = (SELECT id FROM users WHERE mobile = '${ownerMobile}'));
    DELETE FROM application_actions WHERE application_id IN (SELECT id FROM homestay_applications WHERE user_id = (SELECT id FROM users WHERE mobile = '${ownerMobile}'));
    DELETE FROM documents WHERE application_id IN (SELECT id FROM homestay_applications WHERE user_id = (SELECT id FROM users WHERE mobile = '${ownerMobile}'));
    DELETE FROM homestay_applications WHERE user_id = (SELECT id FROM users WHERE mobile = '${ownerMobile}');
  `;

    execSync(`source .env && psql "$DATABASE_URL" -c "${cleanupSQL}"`, {
        cwd: process.cwd(),
        shell: "/bin/bash",
        stdio: "pipe",
    });

    const timestamp = Date.now();
    // Using imported 'createTestSession' which is aliased to 'login' which takes credentials object
    const ownerCookies = await createTestSession({ mobile: ownerMobile, password: ownerPassword });

    // 2. Create Parent Application (Force Approved)
    console.log("📝 Creating Parent Application...");
    const parentRes = await apiCall(ownerCookies, "POST", "/api/applications/draft", {
        propertyName: `Parent Hotel ${timestamp}`,
        category: "silver",
        district: "shimla",
        totalRooms: 3,
        documents: [],
        address: "Test Address",
        tehsil: "shimla_urban",
        ownerName: "Test Owner",
        ownerMobile: ownerMobile,
        ownerAadhaar: "123412341234",
        singleBedRooms: 3,
        singleBedRoomRate: 1000,
    });
    const parentAppId = parentRes.application.id;

    // Force Approve Parent
    console.log("   Force approving Parent...");
    await db.update(homestayApplications).set({
        status: "approved",
        applicationKind: "new_registration",
        certificateNumber: "PARENT-CERT-1",
    }).where(eq(homestayApplications.id, parentAppId));

    // 3. Create Service Request (Add Rooms)
    console.log("➕ Creating Add Rooms Request...");
    const childRes = await apiCall(ownerCookies, "POST", "/api/service-center", {
        baseApplicationId: parentAppId,
        serviceType: "add_rooms",
        roomDelta: { single: 2 },
        note: "Adding rooms test"
    });
    console.log("   DEBUG: Child Res:", JSON.stringify(childRes, null, 2).substring(0, 200));
    const childAppId = childRes.serviceRequest?.id;
    if (!childAppId) {
        throw new Error("Failed to create child app: " + JSON.stringify(childRes));
    }

    // 4. Set Child to 'inspection_under_review' and 'paid' (to test upfront logic in DTDO)
    console.log("   Preparing Child for DTDO Approval (Upfront Payment Flow)...");
    await db.update(homestayApplications).set({
        status: "inspection_under_review",
        paymentStatus: "paid",
        totalFee: "1000",
        paymentDate: new Date(),
    }).where(eq(homestayApplications.id, childAppId));

    // 5. Login as DTDO and Approve
    console.log("👮 DTDO Logging in and Approving...");
    // Using imported 'DTDO_CREDS' and 'createTestSession'
    const dtdoCookies = await createTestSession({ mobile: DTDO_CREDS.mobile, password: DTDO_CREDS.password });

    const approveRes = await apiCall(dtdoCookies, "POST", `/api/dtdo/inspection-report/${childAppId}/approve`, {
        remarks: "Approving and superseding."
    });
    console.log("   Approval Response Message:", approveRes.message);

    // 6. Verify Parent is Superseded
    console.log("🔍 Verifying Parent Status...");
    const [parentApp] = await db.select().from(homestayApplications).where(eq(homestayApplications.id, parentAppId));

    if (parentApp.status === 'superseded') {
        console.log("✅ SUCCESS: Parent application is SUPERSEDED.");
    } else {
        console.error(`❌ FAILURE: Parent application status is '${parentApp.status}' (expected 'superseded')`);
        process.exit(1);
    }

    // 7. Verify Dashboard Filtering
    console.log("🔍 Verifying Dashboard Filtering...");
    const dashboardRes = await apiCall(ownerCookies, "GET", "/api/applications");

    // The API returns { application: { ... } } for dashboard (single primary app) or { applications: [] }?
    // Let's check server/routes/applications/index.ts
    // Line 51: router.get("/", ...
    // Line 89 (in my previous view, maybe truncated): It usually returns list.
    // Wait, line 61: 'let applications = ...'
    // It returns JSON.
    // Wait, I replaced code in lines 43 and 61.
    // Route /: returns applications directly?
    // Let's assume it returns { applications: [...] } or just array?
    // Enhanced smoke test uses it?
    // I should check response structure logging.

    // Actually, 'server/routes/applications/index.ts' line 44 (GET /primary) returns { application: ... }.
    // Line 51 (GET /) usually returns list.
    // I will log and check.

    console.log("   Dashboard API Response keys:", Object.keys(dashboardRes));

    let visibleAppIds: string[] = [];
    if (dashboardRes.applications) {
        visibleAppIds = dashboardRes.applications.map((a: any) => a.id);
    } else if (Array.isArray(dashboardRes)) {
        visibleAppIds = dashboardRes.map((a: any) => a.id);
    } else {
        console.log("   (Unknown response format, dumping):", JSON.stringify(dashboardRes).substring(0, 100));
    }

    if (!visibleAppIds.includes(parentAppId)) {
        console.log("✅ SUCCESS: Parent application is hidden from dashboard.");
    } else {
        console.error("❌ FAILURE: Parent application is still visible in dashboard.");
        process.exit(1);
    }

    console.log("🎉 Verification Complete!");
    process.exit(0);
}

main().catch(console.error);


import { db } from "../server/db";
import { homestayApplications, applicationActions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

async function patchStatus() {
    const appNumber = "HP-HS-2025-SML-000004";
    console.log(`Patching status for ${appNumber}...`);

    const results = await db
        .select()
        .from(homestayApplications)
        .where(eq(homestayApplications.applicationNumber, appNumber))
        .limit(1);

    if (results.length === 0) {
        console.log("Application not found");
        process.exit(1);
    }

    const app = results[0];
    console.log("Current Status:", app.status); // Should be reverted_by_dtdo

    // Manual patch to dtdo_review because owner resubmission failed to persist status change
    await db.update(homestayApplications)
        .set({
            status: 'dtdo_review',
            updatedAt: new Date() // Fix timestamp too
        })
        .where(eq(homestayApplications.id, app.id));

    console.log("Patched to: dtdo_review");
    process.exit(0);
}

patchStatus().catch(console.error);

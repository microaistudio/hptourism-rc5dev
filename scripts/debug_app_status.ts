
import { db } from "../server/db";
import { homestayApplications, applicationActions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

async function checkStatus() {
    const appNumber = "HP-HS-2025-SML-000004";
    console.log(`Checking status for ${appNumber}...`);

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
    console.log("Status:", app.status);
    console.log("Revert Count:", app.correctionSubmissionCount);
    console.log("Updated At:", app.updatedAt);
    console.log("Submitted At:", app.submittedAt);

    console.log("\nChecking Application Actions History:");
    const actions = await db
        .select()
        .from(applicationActions)
        .where(eq(applicationActions.applicationId, app.id))
        .orderBy(desc(applicationActions.createdAt))
        .limit(5);

    actions.forEach(a => {
        console.log(`- [${a.createdAt?.toISOString()}] From: ${a.previousStatus} -> To: ${a.newStatus} | Action: ${a.action}`);
    });

    process.exit(0);
}

checkStatus().catch(console.error);

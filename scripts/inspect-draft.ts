
import { db } from "../server/db";
import { homestayApplications } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    const draftId = "47919bce-8212-4d33-870a-fc6570ce1510";
    console.log(`Inspecting draft: ${draftId}`);
    try {
        const app = await db.query.homestayApplications.findFirst({
            where: eq(homestayApplications.id, draftId),
        });

        if (!app) {
            console.log("Draft not found!");
        } else {
            console.log("Draft found:");
            console.log("ID:", app.id);
            console.log("Application Number:", app.applicationNumber);
            console.log("Application Kind:", app.applicationKind);
            console.log("Status:", app.status);
            console.log("Nearby Attractions (Raw):", app.nearbyAttractions);
        }
    } catch (error) {
        console.error("Error inspecting draft:", error);
    }
    process.exit(0);
}

main();

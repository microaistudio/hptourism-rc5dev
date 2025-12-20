
import { db } from "../server/db";
import { homestayApplications } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    const draftId = "47919bce-8212-4d33-870a-fc6570ce1510";
    console.log(`Fixing draft: ${draftId}`);
    try {
        const result = await db.update(homestayApplications)
            .set({ applicationKind: 'delete_rooms' })
            .where(eq(homestayApplications.id, draftId))
            .returning();

        if (result.length === 0) {
            console.log("Draft not found! Could not update.");
            // Fallback: list recent drafts to see if we can find it
            const recents = await db.query.homestayApplications.findMany({
                limit: 5,
                orderBy: (apps, { desc }) => [desc(apps.createdAt)]
            });
            console.log("Recent drafts:", recents.map(r => `${r.id} (${r.applicationKind})`));
        } else {
            console.log("Success! Updated applicationKind to 'delete_rooms'.");
            console.log("Updated Draft:", result[0].applicationKind);
        }
    } catch (error) {
        console.error("Error fixing draft:", error);
    }
    process.exit(0);
}

main();

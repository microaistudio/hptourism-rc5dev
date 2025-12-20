
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Applying manual patch to add nearby_attractions column...");
    try {
        await db.execute(sql`
      ALTER TABLE homestay_applications 
      ADD COLUMN IF NOT EXISTS nearby_attractions jsonb;
    `);
        console.log("Successfully added nearby_attractions column.");
    } catch (error) {
        console.error("Error patching database:", error);
    }
    process.exit(0);
}

main();

import { db } from "../server/db";
import { users, homestayApplications } from "../shared/schema";
import { eq, ilike, and } from "drizzle-orm";

async function main() {
    console.log("--- Checking Application ---");
    // Assuming strict Shimla district for now based on context
    const district = "Shimla";
    console.log(`Target District: ${district}`);

    console.log("\n--- Checking DA (da_shimla) ---");
    const da = await db.query.users.findFirst({
        where: ilike(users.username, "%da_shimla%"),
    });
    if (da) {
        console.log(`DA Username: ${da.username}`);
        console.log(`DA Mobile: ${da.mobile}`);
        console.log(`DA Role: ${da.role}`);
    } else {
        console.log("User 'da_shimla' not found.");
    }

    console.log("\n--- Checking DTDO for Shimla ---");
    // Logic from sendback-otp.ts: lookupDtdoByDistrictLabel -> likely uses districtStaffManifest or DB query
    // Let's check DB users with role 'district_tourism_officer' in Shimla
    const dtdos = await db.query.users.findMany({
        where: and(
            eq(users.district, district),
            eq(users.role, "district_tourism_officer")
        ),
    });

    if (dtdos.length > 0) {
        dtdos.forEach(d => {
            console.log(`DTDO Username: ${d.username}`);
            console.log(`DTDO Mobile: ${d.mobile}`);
        });
    } else {
        console.log(`No DTDO found for district '${district}' in DB.`);
    }

    console.log("\n--- Checking District Staff Manifest (if accessible via code) ---");
    // We can't easily import the manifest file to execute it here without pulling in the whole backend imports probably,
    // but we can rely on the DB check above for now. 

    process.exit(0);
}

main().catch(console.error);

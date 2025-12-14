
import { db } from "../server/db";
import { homestayApplications, himkoshTransactions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
    const appId = "c2d5eb48-0886-4af2-8333-a2b4fa3e74a8";
    console.log(`Checking status for app: ${appId}`);

    try {
        const app = await db.query.homestayApplications.findFirst({
            where: eq(homestayApplications.id, appId)
        });

        if (!app) {
            console.log("App not found");
        } else {
            console.log("App Status:", app.status);
            console.log("Payment Status:", app.paymentStatus);
        }

        const txns = await db.query.himkoshTransactions.findMany({
            where: eq(himkoshTransactions.applicationId, appId),
            orderBy: [desc(himkoshTransactions.initiatedAt)],
            limit: 5
        });

        console.log("Transactions found:", txns.length);
        txns.forEach((t, i) => {
            console.log(`[${i}] ID: ${t.id}`);
            console.log(`    Status: ${t.status} (Code: ${t.statusCd})`);
            console.log(`    Txn Status: ${t.transactionStatus}`);
            console.log(`    Amount: ${t.totalAmount}`);
            console.log(`    RefNo: ${t.appRefNo}`);
        });

    } catch (err) {
        console.error("Error querying DB:", err);
    }
    process.exit(0);
}

main();

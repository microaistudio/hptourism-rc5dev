import { db } from "../server/db";
import { inspectionOrders, users, homestayApplications } from "../shared/schema";
import { desc, eq } from "drizzle-orm";

const run = async () => {
  const orders = await db
    .select()
    .from(inspectionOrders)
    .orderBy(desc(inspectionOrders.createdAt))
    .limit(5);

  for (const order of orders) {
    const [da] = await db.select().from(users).where(eq(users.id, order.assignedTo)).limit(1);
    const [app] = await db.select().from(homestayApplications).where(eq(homestayApplications.id, order.applicationId)).limit(1);
    console.log({
      orderId: order.id,
      assignedTo: order.assignedTo,
      daUsername: da?.username,
      daDistrict: da?.district,
      appNumber: app?.applicationNumber,
      appDistrict: app?.district,
      status: order.status,
      createdAt: order.createdAt,
    });
  }
};

run().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

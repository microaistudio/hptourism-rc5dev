import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { normalizeUsername } from "@shared/userUtils";

async function ensureAdminRcUser() {
  const mobile = "9999999997";
  const usernameInput = "adminrc";
  const password = "ulan@2025";
  const normalizedUsername = normalizeUsername(usernameInput);

  if (!normalizedUsername) {
    throw new Error("Invalid username supplied for admin RC user.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await db.select().from(users).where(eq(users.mobile, mobile)).limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        fullName: existing[0].fullName || "Admin RC Console",
        role: "admin_rc",
        username: normalizedUsername,
        password: hashedPassword,
        isActive: true,
      })
      .where(eq(users.mobile, mobile));

    console.log("✅ Updated existing admin RC user credentials.");
  } else {
    await db.insert(users).values({
      mobile,
      fullName: "Admin RC Console",
      email: "admin.rc@hp.gov.in",
      username: normalizedUsername,
      role: "admin_rc",
      password: hashedPassword,
      district: "Shimla",
      isActive: true,
    });

    console.log("✅ Created admin RC user.");
  }

  console.log(`Login via username "adminrc" or mobile ${mobile} with password ${password}.`);
}

ensureAdminRcUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to provision admin RC user:", error);
    process.exit(1);
  });

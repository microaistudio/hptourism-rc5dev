import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { getDistrictStaffManifest } from "@shared/districtStaffManifest";
import { logger } from "./logger";

type StaffRole = "da" | "dtdo";

const manifest = getDistrictStaffManifest();
const staffSyncLog = logger.child({ module: "staff-sync" });

const capitalize = (value: string) =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1).toLowerCase();

const formatStaffNames = (username: string) => {
  const tokens = username.split("_").filter(Boolean);
  if (tokens.length === 0) {
    const fallback = username.trim() || "Officer";
    return {
      firstName: fallback.toUpperCase(),
      lastName: "",
      fullName: fallback.toUpperCase(),
    };
  }
  const [firstToken, ...rest] = tokens;
  const firstName = firstToken.toUpperCase();
  const lastName = rest.length > 0 ? rest.map(capitalize).join(" ") : "Officer";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return { firstName, lastName, fullName };
};

export const syncStaffAccountsFromManifest = async () => {
  for (const entry of manifest) {
    for (const role of ["da", "dtdo"] as StaffRole[]) {
      const manifestAccount = entry[role];
      const targetRole =
        role === "da" ? "dealing_assistant" : "district_tourism_officer";

      try {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.mobile, manifestAccount.mobile))
          .limit(1);

        if (!existing) {
          continue;
        }

        const updates: Partial<typeof users.$inferSelect> = {};

        const normalizedExistingUsername = (existing.username || "").trim().toLowerCase();
        const normalizedManifestUsername = manifestAccount.username.trim().toLowerCase();
        if (normalizedExistingUsername !== normalizedManifestUsername) {
          updates.username = manifestAccount.username;
        }

        if ((existing.district || "").trim() !== entry.districtLabel.trim()) {
          updates.district = entry.districtLabel;
        }

        if ((existing.email || "").trim() !== manifestAccount.email.trim()) {
          updates.email = manifestAccount.email;
        }

        const derivedNames = formatStaffNames(manifestAccount.username);
        if ((existing.fullName || "").trim() !== derivedNames.fullName) {
          updates.fullName = derivedNames.fullName;
        }
        if ((existing.firstName || "").trim() !== derivedNames.firstName) {
          updates.firstName = derivedNames.firstName;
        }
        if ((existing.lastName || "").trim() !== derivedNames.lastName) {
          updates.lastName = derivedNames.lastName;
        }

        if (manifestAccount.password) {
          const passwordMatches =
            typeof existing.password === "string" && existing.password.length > 0
              ? await bcrypt.compare(manifestAccount.password, existing.password)
              : false;

          if (!passwordMatches) {
            updates.password = await bcrypt.hash(manifestAccount.password, 10);
          }
        }

        if (existing.role !== targetRole) {
          updates.role = targetRole;
        }

        if (existing.isActive === false) {
          updates.isActive = true;
        }

        if (Object.keys(updates).length > 0) {
          await db.update(users).set(updates).where(eq(users.id, existing.id));
        }
      } catch (error) {
        staffSyncLog.error(
          { err: error, username: manifestAccount.username, district: entry.districtLabel },
          "Failed to sync staff account",
        );
      }
    }
  }
};

void syncStaffAccountsFromManifest().catch((error) => {
  staffSyncLog.error({ err: error }, "Failed to run staff manifest sync");
});

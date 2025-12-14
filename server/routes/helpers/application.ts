import { db } from "../../db";
import { homestayApplications, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export const fetchApplicationWithOwner = async (applicationId: string) => {
    const [row] = await db
        .select({
            application: homestayApplications,
            ownerName: users.fullName,
            ownerMobile: users.mobile,
            ownerEmail: users.email,
        })
        .from(homestayApplications)
        .leftJoin(users, eq(users.id, homestayApplications.userId))
        .where(eq(homestayApplications.id, applicationId))
        .limit(1);

    if (!row?.application) {
        return null;
    }

    const owner =
        row.ownerName || row.ownerMobile || row.ownerEmail
            ? {
                fullName: row.ownerName,
                mobile: row.ownerMobile,
                email: row.ownerEmail,
            }
            : null;

    return {
        application: row.application,
        owner,
    };
};

import express from "express";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { requireRole } from "../core/middleware";
import { logger } from "../../logger";
import {
  ADMIN_RC_ALLOWED_ROLES,
  LEGACY_CATEGORY_OPTIONS,
  LEGACY_LOCATION_TYPES,
  LEGACY_OWNER_GENDERS,
  LEGACY_PROPERTY_OWNERSHIP,
  LEGACY_RC_PREFIX,
  LEGACY_STATUS_OPTIONS,
} from "../helpers/legacy";
import { homestayApplications, users, documents } from "@shared/schema";
import { parseIsoDateOrNull, trimOptionalString, trimRequiredString } from "../helpers/format";

const log = logger.child({ module: "admin-legacy-rc" });

const numberOrNull = (value: number | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
};

const toNumberFromUnknown = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function createAdminLegacyRcRouter() {
  const router = express.Router();

  const legacySelection = {
    application: homestayApplications,
    owner: {
      id: users.id,
      fullName: users.fullName,
      mobile: users.mobile,
      email: users.email,
      district: users.district,
    },
  };

  const legacyApplicationUpdateSchema = z.object({
    propertyName: z.string().min(3),
    category: z.enum(LEGACY_CATEGORY_OPTIONS),
    locationType: z.enum(LEGACY_LOCATION_TYPES),
    status: z.enum(LEGACY_STATUS_OPTIONS),
    projectType: z.string().min(2),
    propertyOwnership: z.enum(LEGACY_PROPERTY_OWNERSHIP),
    address: z.string().min(3),
    district: z.string().min(3),
    tehsil: z.string().min(3),
    block: z.string().nullable().optional(),
    gramPanchayat: z.string().nullable().optional(),
    pincode: z.string().min(4),
    ownerName: z.string().min(3),
    ownerMobile: z.string().min(6),
    ownerEmail: z.string().email().nullable().optional(),
    ownerAadhaar: z.string().min(6),
    ownerGender: z.enum(LEGACY_OWNER_GENDERS),
    propertyArea: z.number().positive(),
    singleBedRooms: z.number().int().min(0).nullable().optional(),
    singleBedRoomRate: z.number().min(0).nullable().optional(),
    doubleBedRooms: z.number().int().min(0).nullable().optional(),
    doubleBedRoomRate: z.number().min(0).nullable().optional(),
    familySuites: z.number().int().min(0).nullable().optional(),
    familySuiteRate: z.number().min(0).nullable().optional(),
    attachedWashrooms: z.number().int().min(0).nullable().optional(),
    distanceAirport: z.number().min(0).nullable().optional(),
    distanceRailway: z.number().min(0).nullable().optional(),
    distanceCityCenter: z.number().min(0).nullable().optional(),
    distanceShopping: z.number().min(0).nullable().optional(),
    distanceBusStand: z.number().min(0).nullable().optional(),
    certificateNumber: z.string().max(100).nullable().optional(),
    certificateIssuedDate: z.string().datetime().nullable().optional(),
    certificateExpiryDate: z.string().datetime().nullable().optional(),
    serviceNotes: z.string().nullable().optional(),
    guardianName: z.string().nullable().optional(),
  });

  const legacyOrderBy = sql`COALESCE(${homestayApplications.updatedAt}, ${homestayApplications.createdAt}, NOW())`;

  router.get("/admin-rc/applications", requireRole(...ADMIN_RC_ALLOWED_ROLES), async (_req, res) => {
    try {
      const rows = await db
        .select(legacySelection)
        .from(homestayApplications)
        .leftJoin(users, eq(users.id, homestayApplications.userId))
        .where(like(homestayApplications.applicationNumber, `${LEGACY_RC_PREFIX}%`))
        .orderBy(desc(legacyOrderBy));

      const applications = rows.map((row) => ({
        application: row.application,
        owner: row.owner?.id ? row.owner : null,
      }));

      res.json({ applications });
    } catch (error) {
      log.error("[admin-rc] Failed to fetch legacy applications:", error);
      res.status(500).json({ message: "Failed to load legacy applications" });
    }
  });

  router.get("/admin-rc/applications/:id", requireRole(...ADMIN_RC_ALLOWED_ROLES), async (req, res) => {
    try {
      const { id } = req.params;
      const [record] = await db
        .select(legacySelection)
        .from(homestayApplications)
        .leftJoin(users, eq(users.id, homestayApplications.userId))
        .where(and(eq(homestayApplications.id, id), like(homestayApplications.applicationNumber, `${LEGACY_RC_PREFIX}%`)))
        .limit(1);

      if (!record) {
        return res.status(404).json({ message: "Legacy application not found" });
      }

      const docList = await db.select().from(documents).where(eq(documents.applicationId, id));

      res.json({
        application: record.application,
        owner: record.owner?.id ? record.owner : null,
        documents: docList,
      });
    } catch (error) {
      log.error("[admin-rc] Failed to fetch application:", error);
      res.status(500).json({ message: "Failed to load application" });
    }
  });

  router.patch("/admin-rc/applications/:id", requireRole(...ADMIN_RC_ALLOWED_ROLES), async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await db
        .select(legacySelection)
        .from(homestayApplications)
        .leftJoin(users, eq(users.id, homestayApplications.userId))
        .where(and(eq(homestayApplications.id, id), like(homestayApplications.applicationNumber, `${LEGACY_RC_PREFIX}%`)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Legacy application not found" });
      }

      const payload = legacyApplicationUpdateSchema.parse(req.body ?? {});

      const resolveNumeric = (
        incoming: number | null | undefined,
        fallback: number | null | undefined,
        { allowNull = true }: { allowNull?: boolean } = {},
      ): number | null | undefined => {
        const normalized = numberOrNull(incoming);
        if (normalized !== undefined) {
          if (normalized === null && !allowNull) {
            return typeof fallback === "number" ? fallback : toNumberFromUnknown(fallback) ?? null;
          }
          return normalized;
        }
        if (typeof fallback === "number") return fallback;
        return toNumberFromUnknown(fallback);
      };

      const resolvedPropertyArea =
        resolveNumeric(payload.propertyArea, toNumberFromUnknown(existing.application.propertyArea), { allowNull: false }) ?? 0;

      const resolvedSingleRooms = resolveNumeric(payload.singleBedRooms, existing.application.singleBedRooms);
      const resolvedDoubleRooms = resolveNumeric(payload.doubleBedRooms, existing.application.doubleBedRooms);
      const resolvedFamilySuites = resolveNumeric(payload.familySuites, existing.application.familySuites);
      const totalRooms = (resolvedSingleRooms ?? 0) + (resolvedDoubleRooms ?? 0) + (resolvedFamilySuites ?? 0);

      const updatePayload: Record<string, unknown> = {
        propertyName: trimRequiredString(payload.propertyName),
        category: payload.category,
        locationType: payload.locationType,
        status: payload.status,
        projectType: payload.projectType,
        propertyOwnership: payload.propertyOwnership,
        address: trimRequiredString(payload.address),
        district: trimRequiredString(payload.district),
        tehsil: trimRequiredString(payload.tehsil),
        block: trimOptionalString(payload.block) ?? null,
        gramPanchayat: trimOptionalString(payload.gramPanchayat) ?? null,
        pincode: trimRequiredString(payload.pincode),
        ownerName: trimRequiredString(payload.ownerName),
        ownerMobile: trimRequiredString(payload.ownerMobile),
        ownerEmail: trimOptionalString(payload.ownerEmail) ?? null,
        guardianName: trimOptionalString(payload.guardianName) ?? null,
        ownerAadhaar: trimRequiredString(payload.ownerAadhaar),
        ownerGender: payload.ownerGender,
        propertyArea: resolvedPropertyArea,
        singleBedRooms: resolvedSingleRooms ?? 0,
        doubleBedRooms: resolvedDoubleRooms ?? 0,
        familySuites: resolvedFamilySuites ?? 0,
        singleBedRoomRate: resolveNumeric(payload.singleBedRoomRate, toNumberFromUnknown(existing.application.singleBedRoomRate)),
        doubleBedRoomRate: resolveNumeric(payload.doubleBedRoomRate, toNumberFromUnknown(existing.application.doubleBedRoomRate)),
        familySuiteRate: resolveNumeric(payload.familySuiteRate, toNumberFromUnknown(existing.application.familySuiteRate)),
        attachedWashrooms: resolveNumeric(payload.attachedWashrooms, existing.application.attachedWashrooms),
        distanceAirport: resolveNumeric(payload.distanceAirport, toNumberFromUnknown(existing.application.distanceAirport)),
        distanceRailway: resolveNumeric(payload.distanceRailway, toNumberFromUnknown(existing.application.distanceRailway)),
        distanceCityCenter: resolveNumeric(payload.distanceCityCenter, toNumberFromUnknown(existing.application.distanceCityCenter)),
        distanceShopping: resolveNumeric(payload.distanceShopping, toNumberFromUnknown(existing.application.distanceShopping)),
        distanceBusStand: resolveNumeric(payload.distanceBusStand, toNumberFromUnknown(existing.application.distanceBusStand)),
        certificateNumber: trimOptionalString(payload.certificateNumber) ?? null,
        certificateIssuedDate: parseIsoDateOrNull(payload.certificateIssuedDate),
        certificateExpiryDate: parseIsoDateOrNull(payload.certificateExpiryDate),
        serviceNotes: trimOptionalString(payload.serviceNotes) ?? null,
        totalRooms,
        updatedAt: new Date(),
      };

      const currentServiceContext =
        existing.application.serviceContext && typeof existing.application.serviceContext === "object"
          ? { ...existing.application.serviceContext }
          : ({} as Record<string, unknown>);

      if (payload.guardianName !== undefined) {
        currentServiceContext.legacyGuardianName = trimOptionalString(payload.guardianName) ?? null;
      }
      updatePayload.serviceContext = currentServiceContext;

      await db.update(homestayApplications).set(updatePayload).where(eq(homestayApplications.id, id));

      if (existing.owner?.id) {
        const ownerUpdates: Record<string, unknown> = {};
        if (payload.ownerName) ownerUpdates.fullName = trimRequiredString(payload.ownerName);
        if (payload.ownerMobile) ownerUpdates.mobile = trimRequiredString(payload.ownerMobile);
        if (payload.ownerEmail !== undefined) ownerUpdates.email = trimOptionalString(payload.ownerEmail) ?? null;
        if (payload.district) ownerUpdates.district = trimRequiredString(payload.district);
        if (Object.keys(ownerUpdates).length > 0) {
          ownerUpdates.updatedAt = new Date();
          await db.update(users).set(ownerUpdates).where(eq(users.id, existing.owner.id));
        }
      }

      const [updated] = await db
        .select(legacySelection)
        .from(homestayApplications)
        .leftJoin(users, eq(users.id, homestayApplications.userId))
        .where(eq(homestayApplications.id, id))
        .limit(1);

      const docList = await db.select().from(documents).where(eq(documents.applicationId, id));

      res.json({
        application: updated?.application,
        owner: updated?.owner?.id ? updated.owner : null,
        documents: docList,
      });
    } catch (error) {
      log.error("[admin-rc] Failed to update legacy application:", error);
      res.status(500).json({ message: "Failed to update legacy application" });
    }
  });

  // Quick status update for LG-HS applications (not old LEGACY- ones)
  router.patch("/admin-rc/applications/:id/status", requireRole(...ADMIN_RC_ALLOWED_ROLES), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || typeof status !== "string") {
        return res.status(400).json({ message: "Status is required" });
      }

      const validStatuses = [
        "legacy_rc_review", "dtdo_review", "under_scrutiny", "forwarded_to_dtdo",
        "approved", "rejected", "reverted_by_dtdo", "sent_back_for_corrections"
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Valid: ${validStatuses.join(", ")}` });
      }

      const [existing] = await db
        .select({ id: homestayApplications.id, applicationNumber: homestayApplications.applicationNumber })
        .from(homestayApplications)
        .where(eq(homestayApplications.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Allow both LEGACY- and LG-HS- prefixes
      if (!existing.applicationNumber?.startsWith("LG-HS-") && !existing.applicationNumber?.startsWith("LEGACY-")) {
        return res.status(400).json({ message: "Not a legacy RC application" });
      }

      await db.update(homestayApplications)
        .set({ status, updatedAt: new Date() })
        .where(eq(homestayApplications.id, id));

      log.info(`[admin-rc] Status updated for ${existing.applicationNumber}: ${status}`);
      res.json({ message: "Status updated", applicationNumber: existing.applicationNumber, status });
    } catch (error) {
      log.error("[admin-rc] Failed to update status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  return router;
}

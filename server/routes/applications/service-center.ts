import express from "express";
import { z } from "zod";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { requireAuth } from "../core/middleware";
import { storage } from "../../storage";
import { queueNotification } from "../../services/notifications";
import { logApplicationAction } from "../../audit";
import {
  homestayApplications,
  type ApplicationServiceContext,
  type HomestayApplication,
  type InsertHomestayApplication,
} from "@shared/schema";
import { MAX_ROOMS_ALLOWED } from "@shared/fee-calculator";
import { logger } from "../../logger";
import { db } from "../../db";

const serviceCenterLog = logger.child({ module: "service-center" });

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const MIN_ROOMS_AFTER_DELETE = 1;
const CLOSED_SERVICE_STATUS_LIST = ["rejected", "approved", "cancelled", "service_completed"];

const roomDeltaSchema = z
  .object({
    single: z.number().int().min(0).max(MAX_ROOMS_ALLOWED).optional(),
    double: z.number().int().min(0).max(MAX_ROOMS_ALLOWED).optional(),
    family: z.number().int().min(0).max(MAX_ROOMS_ALLOWED).optional(),
  })
  .partial();

const serviceRequestSchema = z.object({
  baseApplicationId: z.string().uuid(),
  serviceType: z.enum(["renewal", "add_rooms", "delete_rooms", "cancel_certificate"]),
  note: z.string().max(1000).optional(),
  roomDelta: roomDeltaSchema.optional(),
});

const toRoomCount = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
};

const extractRoomBreakdown = (application: HomestayApplication) => {
  const single = toRoomCount(application.singleBedRooms);
  const double = toRoomCount(application.doubleBedRooms);
  const family = toRoomCount(application.familySuites);
  return {
    single,
    double,
    family,
    total: single + double + family,
  };
};

const computeRoomAdjustment = (
  application: HomestayApplication,
  mode: "add_rooms" | "delete_rooms",
  delta?: z.infer<typeof roomDeltaSchema>,
) => {
  if (!delta) {
    throw new Error("Room adjustments are required for this service.");
  }

  const base = extractRoomBreakdown(application);
  const deltaSingle = toRoomCount(delta.single);
  const deltaDouble = toRoomCount(delta.double);
  const deltaFamily = toRoomCount(delta.family);
  const totalDelta = deltaSingle + deltaDouble + deltaFamily;

  if (totalDelta === 0) {
    throw new Error("Specify at least one room to add or delete.");
  }

  if (mode === "add_rooms") {
    const targetSingle = base.single + deltaSingle;
    const targetDouble = base.double + deltaDouble;
    const targetFamily = base.family + deltaFamily;
    const targetTotal = targetSingle + targetDouble + targetFamily;

    if (targetTotal > MAX_ROOMS_ALLOWED) {
      throw new Error(
        `HP Homestay Rules permit a maximum of ${MAX_ROOMS_ALLOWED} rooms. This request would result in ${targetTotal} rooms.`,
      );
    }

    return {
      single: targetSingle,
      double: targetDouble,
      family: targetFamily,
      total: targetTotal,
      requestedRoomDelta: totalDelta,
    };
  }

  if (deltaSingle > base.single || deltaDouble > base.double || deltaFamily > base.family) {
    throw new Error("Cannot delete more rooms than currently exist in that category.");
  }

  const targetSingle = base.single - deltaSingle;
  const targetDouble = base.double - deltaDouble;
  const targetFamily = base.family - deltaFamily;
  const targetTotal = targetSingle + targetDouble + targetFamily;

  if (targetTotal < MIN_ROOMS_AFTER_DELETE) {
    throw new Error(`At least ${MIN_ROOMS_AFTER_DELETE} room must remain after deletion.`);
  }

  const requestedDeletions: Array<{ roomType: string; count: number }> = [];
  if (deltaSingle) requestedDeletions.push({ roomType: "single", count: deltaSingle });
  if (deltaDouble) requestedDeletions.push({ roomType: "double", count: deltaDouble });
  if (deltaFamily) requestedDeletions.push({ roomType: "family", count: deltaFamily });

  return {
    single: targetSingle,
    double: targetDouble,
    family: targetFamily,
    total: targetTotal,
    requestedRoomDelta: -totalDelta,
    requestedDeletions,
  };
};

const buildRenewalWindow = (expiry: Date | null) => {
  if (!expiry) {
    return null;
  }
  const windowStart = new Date(expiry.getTime() - NINETY_DAYS_MS);
  const now = Date.now();
  return {
    windowStart,
    windowEnd: expiry,
    inWindow: now >= windowStart.getTime() && now <= expiry.getTime(),
  };
};

async function getActiveServiceRequest(parentApplicationId: string) {
  if (!parentApplicationId) {
    return null;
  }

  const [active] = await db
    .select({
      id: homestayApplications.id,
      applicationNumber: homestayApplications.applicationNumber,
      applicationKind: homestayApplications.applicationKind,
      status: homestayApplications.status,
      totalRooms: homestayApplications.totalRooms,
      createdAt: homestayApplications.createdAt,
      updatedAt: homestayApplications.updatedAt,
    })
    .from(homestayApplications)
    .where(
      and(
        eq(homestayApplications.parentApplicationId, parentApplicationId),
        notInArray(homestayApplications.status, CLOSED_SERVICE_STATUS_LIST),
      ),
    )
    .orderBy(desc(homestayApplications.createdAt))
    .limit(1);

  return active ?? null;
}

async function buildServiceSummary(application: HomestayApplication) {
  const breakdown = extractRoomBreakdown(application);
  const expiry = application.certificateExpiryDate ? new Date(application.certificateExpiryDate) : null;
  const window = buildRenewalWindow(expiry);
  const activeRequest = await getActiveServiceRequest(application.id);

  return {
    id: application.id,
    applicationNumber: application.applicationNumber,
    propertyName: application.propertyName,
    totalRooms: breakdown.total,
    maxRoomsAllowed: MAX_ROOMS_ALLOWED,
    certificateExpiryDate: expiry ? expiry.toISOString() : null,
    renewalWindowStart: window ? window.windowStart.toISOString() : null,
    renewalWindowEnd: window ? window.windowEnd.toISOString() : null,
    canRenew: window ? window.inWindow : false,
    canAddRooms: breakdown.total < MAX_ROOMS_ALLOWED,
    canDeleteRooms: breakdown.total > MIN_ROOMS_AFTER_DELETE,
    rooms: {
      single: breakdown.single,
      double: breakdown.double,
      family: breakdown.family,
    },
    activeServiceRequest: activeRequest
      ? {
          id: activeRequest.id,
          applicationNumber: activeRequest.applicationNumber,
          applicationKind: activeRequest.applicationKind,
          status: activeRequest.status,
          totalRooms: activeRequest.totalRooms,
          createdAt: activeRequest.createdAt,
        }
      : null,
  };
}

export function createServiceCenterRouter() {
  const router = express.Router();

  router.get("/", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!["property_owner", "admin", "super_admin"].includes(user.role)) {
        return res.status(403).json({ message: "Service Center is currently available for property owners." });
      }

      const baseApplications =
        user.role === "property_owner"
          ? (await storage.getApplicationsByUser(userId)).filter((app) => app.status === "approved")
          : (await storage.getAllApplications()).filter((app) => app.status === "approved");

      const summaries = await Promise.all(baseApplications.map((app) => buildServiceSummary(app)));
      res.json({ applications: summaries });
    } catch (error) {
      serviceCenterLog.error({ err: error, route: "GET /api/service-center" }, "Failed to fetch eligibility list");
      res.status(500).json({ message: "Failed to load service center data" });
    }
  });

  router.post("/", requireAuth, async (req, res) => {
    try {
      const parsed = serviceRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
      }

      const { baseApplicationId, serviceType, note, roomDelta } = parsed.data;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (user.role !== "property_owner") {
        return res.status(403).json({ message: "Only property owners can initiate service requests." });
      }

      const baseApplication = await storage.getApplication(baseApplicationId);
      if (!baseApplication || baseApplication.userId !== userId) {
        return res.status(404).json({ message: "Application not found." });
      }

      if (baseApplication.status !== "approved") {
        return res.status(400).json({ message: "Only approved applications can be renewed or amended." });
      }

      const activeService = await getActiveServiceRequest(baseApplication.id);
      if (activeService) {
        return res.status(409).json({
          message: "Another service request is already in progress for this application.",
          activeRequest: activeService,
        });
      }

      const expiryDate = baseApplication.certificateExpiryDate ? new Date(baseApplication.certificateExpiryDate) : null;
      const renewalWindow = buildRenewalWindow(expiryDate);

      if (serviceType === "renewal") {
        if (!expiryDate) {
          return res.status(400).json({ message: "This application does not have an active certificate yet." });
        }
        if (!renewalWindow?.inWindow) {
          return res.status(400).json({
            message: "Renewal is allowed only within 90 days of certificate expiry.",
            windowStart: renewalWindow?.windowStart.toISOString(),
            windowEnd: renewalWindow?.windowEnd.toISOString(),
          });
        }
      }

      let targetRooms = extractRoomBreakdown(baseApplication);
      if (serviceType === "add_rooms" || serviceType === "delete_rooms") {
        targetRooms = computeRoomAdjustment(baseApplication, serviceType, roomDelta);
      }

      const trimmedNote = typeof note === "string" ? note.trim() : undefined;
      const serviceNotes = trimmedNote && trimmedNote.length > 0 ? trimmedNote : null;

      const serviceContextRaw: ApplicationServiceContext = {
        requestedRooms: {
          single: targetRooms.single,
          double: targetRooms.double,
          family: targetRooms.family,
          total: targetRooms.total,
        },
        requestedRoomDelta: (targetRooms as any).requestedRoomDelta,
        requestedDeletions: (targetRooms as any).requestedDeletions,
        renewalWindow: renewalWindow
          ? {
              start: renewalWindow.windowStart.toISOString(),
              end: renewalWindow.windowEnd.toISOString(),
            }
          : undefined,
        requiresPayment: !["delete_rooms", "cancel_certificate"].includes(serviceType),
        inheritsCertificateExpiry: expiryDate ? expiryDate.toISOString() : undefined,
        note: serviceNotes ?? undefined,
      };

      const serviceContext = Object.keys(serviceContextRaw).length > 0 ? serviceContextRaw : null;

      const {
        id: _ignoreId,
        applicationNumber: _ignoreNumber,
        createdAt: _ignoreCreated,
        updatedAt: _ignoreUpdated,
        parentApplicationId: _parentId,
        parentApplicationNumber: _parentNumber,
        parentCertificateNumber: _parentCert,
        inheritedCertificateValidUpto: _inheritValid,
        serviceContext: _previousContext,
        serviceNotes: _previousNotes,
        serviceRequestedAt: _previousRequested,
        certificateNumber: _certificateNumber,
        certificateIssuedDate: _certificateIssued,
        certificateExpiryDate: _certificateExpiry,
        submittedAt: _submitted,
        approvedAt: _approved,
        ...cloneSeed
      } = baseApplication;

      const baseClone = cloneSeed as unknown as InsertHomestayApplication;

      const servicePayload: InsertHomestayApplication = {
        ...baseClone,
        userId: baseApplication.userId,
        status: "draft",
        currentStage: null,
        currentPage: 1,
        districtOfficerId: null,
        districtReviewDate: null,
        districtNotes: null,
        daId: null,
        daReviewDate: null,
        daForwardedDate: null,
        stateOfficerId: null,
        stateReviewDate: null,
        stateNotes: null,
        dtdoId: null,
        dtdoReviewDate: null,
        dtdoRemarks: null,
        rejectionReason: null,
        clarificationRequested: null,
        siteInspectionScheduledDate: null,
        siteInspectionCompletedDate: null,
        siteInspectionOfficerId: null,
        siteInspectionNotes: null,
        siteInspectionOutcome: null,
        siteInspectionFindings: null,
        certificateNumber: null,
        certificateIssuedDate: null,
        certificateExpiryDate: null,
        submittedAt: null,
        approvedAt: null,
        applicationKind: serviceType,
        parentApplicationId: baseApplication.id,
        parentApplicationNumber: baseApplication.applicationNumber ?? undefined,
        parentCertificateNumber: baseApplication.certificateNumber ?? undefined,
        inheritedCertificateValidUpto: baseApplication.certificateExpiryDate ?? undefined,
        serviceRequestedAt: new Date(),
        serviceNotes: serviceNotes ?? undefined,
        serviceContext: serviceContext ?? undefined,
        totalRooms: targetRooms.total,
        singleBedRooms: targetRooms.single,
        doubleBedRooms: targetRooms.double,
        familySuites: targetRooms.family,
        attachedWashrooms: Math.max(targetRooms.total, toRoomCount(baseApplication.attachedWashrooms)),
      };

      const created = await storage.createApplication(servicePayload);
      const summary = await buildServiceSummary(baseApplication);

      res.status(201).json({
        message: "Service request created.",
        serviceRequest: {
          id: created.id,
          applicationNumber: created.applicationNumber,
          applicationKind: created.applicationKind,
          status: created.status,
        },
        nextUrl: `/applications/new?draft=${created.id}`,
        summary,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request", errors: error.flatten() });
      }
      if (error instanceof Error && error.message.toLowerCase().includes("room")) {
        return res.status(400).json({ message: error.message });
      }
      serviceCenterLog.error({ err: error, route: "POST /api/service-center" }, "Failed to create service request");
      res.status(500).json({ message: "Failed to create service request" });
    }
  });

  return router;
}

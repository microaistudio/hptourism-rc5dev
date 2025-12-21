import express from "express";
import { desc, and, inArray, eq, notInArray, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../core/middleware";
import { storage } from "../../storage";
import { logger } from "../../logger";
import { db } from "../../db";
import {
  applicationActions,
  homestayApplications,
  type ApplicationServiceContext,
  type HomestayApplication,
  type InsertHomestayApplication,
  inspectionOrders,
  inspectionReports,
} from "@shared/schema";
import { MAX_ROOMS_ALLOWED, MAX_BEDS_ALLOWED } from "@shared/fee-calculator";
import { queueNotification } from "../../services/notifications";
import { logApplicationAction } from "../../audit";
import { getUploadPolicy } from "../../services/uploadPolicy";
import {
  validateDocumentsAgainstPolicy,
  type NormalizedDocumentRecord,
} from "../../services/documentValidation";
import { differenceInCalendarDays, format } from "date-fns";
import { buildDistrictWhereClause, districtsMatch } from "../helpers/district";
import { canViewApplicationTimeline, summarizeTimelineActor } from "../helpers/timeline";

const applicationsLog = logger.child({ module: "applications-router" });

export function createApplicationsRouter() {
  const router = express.Router();

  router.get("/primary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (user.role !== "property_owner") {
        return res.json({ application: null });
      }
      const applications = await storage.getApplicationsByUser(userId);
      const activeApplications = applications.filter(app => app.status !== 'superseded');
      res.json({ application: activeApplications[0] ?? null });
    } catch (error) {
      applicationsLog.error({ err: error, route: "/primary" }, "Failed to fetch primary application");
      res.status(500).json({ message: "Unable to load application overview" });
    }
  });

  router.get("/", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let applications: Awaited<ReturnType<typeof storage.getApplicationsByUser>> = [];
      if (user.role === "property_owner") {
        applications = await storage.getApplicationsByUser(userId);
        applications = applications.filter(app => app.status !== 'superseded');
      } else if (user.role === "district_officer" && user.district) {
        applications = await storage.getApplicationsByDistrict(user.district);
      } else if (["state_officer", "admin"].includes(user.role)) {
        applications = await storage.getApplicationsByStatus("state_review");
      }

      let latestCorrectionMap: Map<
        string,
        { createdAt: Date | null; feedback: string | null }
      > | null = null;

      if (applications.length > 0) {
        const applicationIds = applications.map((app) => app.id);
        const correctionRows = await db
          .select({
            applicationId: applicationActions.applicationId,
            createdAt: applicationActions.createdAt,
            feedback: applicationActions.feedback,
          })
          .from(applicationActions)
          .where(
            and(
              inArray(applicationActions.applicationId, applicationIds),
              eq(applicationActions.action, "correction_resubmitted"),
            ),
          )
          .orderBy(desc(applicationActions.createdAt));

        latestCorrectionMap = new Map();
        for (const row of correctionRows) {
          if (!latestCorrectionMap.has(row.applicationId)) {
            latestCorrectionMap.set(row.applicationId, {
              createdAt: row.createdAt ?? null,
              feedback: row.feedback ?? null,
            });
          }
        }
      }

      const enrichedApplications =
        latestCorrectionMap && latestCorrectionMap.size > 0
          ? applications.map((application) => ({
            ...application,
            latestCorrection: latestCorrectionMap?.get(application.id) ?? null,
          }))
          : applications;

      res.json({ applications: enrichedApplications });
    } catch (error) {
      applicationsLog.error({ err: error, route: "/" }, "Failed to fetch applications");
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  router.get(
    "/all",
    requireRole("dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        let applications: HomestayApplication[] = [];

        if (["district_officer", "dealing_assistant", "district_tourism_officer"].includes(user.role)) {
          if (!user.district) {
            return res.status(400).json({ message: "District role must have an assigned district" });
          }
          applications = await db
            .select()
            .from(homestayApplications)
            .where(eq(homestayApplications.district, user.district))
            .orderBy(desc(homestayApplications.createdAt));
        } else if (["state_officer", "admin"].includes(user.role)) {
          applications = await storage.getAllApplications();
        }

        res.json(applications);
      } catch (error) {
        applicationsLog.error({ err: error, route: "/all" }, "Failed to fetch workflow applications");
        res.status(500).json({ message: "Failed to fetch applications for monitoring" });
      }
    },
  );

  router.post(
    "/search",
    requireRole("dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"),
    async (req, res) => {
      try {
        const {
          applicationNumber,
          ownerMobile,
          ownerAadhaar,
          month,
          year,
          fromDate,
          toDate,
          status,
          recentLimit,
        } = (req.body ?? {}) as Record<string, string | undefined>;

        const userId = req.session.userId!;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        const QUICK_VIEW_LIMITS = new Set([10, 20, 50]);
        let recentLimitValue: number | undefined;
        if (typeof recentLimit === "string" && recentLimit.trim()) {
          const parsed = Number(recentLimit);
          if (Number.isFinite(parsed) && QUICK_VIEW_LIMITS.has(parsed)) {
            recentLimitValue = parsed;
          }
        }

        const searchConditions: any[] = [];

        if (typeof applicationNumber === "string" && applicationNumber.trim()) {
          searchConditions.push(eq(homestayApplications.applicationNumber, applicationNumber.trim()));
        }

        if (typeof ownerMobile === "string" && ownerMobile.trim()) {
          searchConditions.push(eq(homestayApplications.ownerMobile, ownerMobile.trim()));
        }

        if (typeof ownerAadhaar === "string" && ownerAadhaar.trim()) {
          searchConditions.push(eq(homestayApplications.ownerAadhaar, ownerAadhaar.trim()));
        }

        if (typeof status === "string" && status.trim() && status.trim().toLowerCase() !== "all") {
          searchConditions.push(eq(homestayApplications.status, status.trim()));
        }

        let rangeStart: Date | undefined;
        let rangeEnd: Date | undefined;

        if (fromDate || toDate) {
          if (fromDate) {
            const parsed = new Date(fromDate);
            if (!Number.isNaN(parsed.getTime())) {
              rangeStart = parsed;
            }
          }
          if (toDate) {
            const parsed = new Date(toDate);
            if (!Number.isNaN(parsed.getTime())) {
              parsed.setHours(23, 59, 59, 999);
              rangeEnd = parsed;
            }
          }
        } else if (month && year) {
          const monthNum = Number(month);
          const yearNum = Number(year);
          if (Number.isInteger(monthNum) && Number.isInteger(yearNum) && monthNum >= 1 && monthNum <= 12) {
            rangeStart = new Date(yearNum, monthNum - 1, 1);
            rangeEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
          }
        }

        if (rangeStart) {
          searchConditions.push(gte(homestayApplications.createdAt, rangeStart));
        }
        if (rangeEnd) {
          searchConditions.push(lte(homestayApplications.createdAt, rangeEnd));
        }

        if (searchConditions.length === 0 && !recentLimitValue) {
          return res.status(400).json({
            message:
              "Provide at least one search filter (application number, phone, Aadhaar, date range, or quick view limit).",
          });
        }

        const filters = [...searchConditions];

        if (["district_officer", "district_tourism_officer", "dealing_assistant"].includes(user.role)) {
          if (!user.district) {
            return res.status(400).json({ message: "Your profile is missing district information." });
          }
          const districtCondition = buildDistrictWhereClause(homestayApplications.district, user.district);
          filters.push(districtCondition);
        }

        const whereClause = filters.length === 1 ? filters[0] : and(...filters);

        const results = await db
          .select()
          .from(homestayApplications)
          .where(whereClause)
          .orderBy(desc(homestayApplications.createdAt))
          .limit(recentLimitValue ?? 200);

        res.json({ results });
      } catch (error) {
        applicationsLog.error({ err: error, route: "/search" }, "Failed to search applications via workflow monitor");
        res.status(500).json({ message: "Failed to search applications" });
      }
    },
  );

  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userId = req.session.userId!;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (currentUser.role === "property_owner" && application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ application });
    } catch {
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  router.post("/:id/review", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, comments } = req.body;

      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.role !== "district_officer" && user.role !== "state_officer") {
        return res.status(403).json({ message: "Only officers can review applications" });
      }

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (user.role === "district_officer" && !districtsMatch(user.district, application.district)) {
        return res.status(403).json({ message: "You can only review applications in your district" });
      }

      if (user.role === "district_officer" && application.status !== "pending") {
        return res
          .status(400)
          .json({ message: "This application is not in pending status and cannot be reviewed by district officer" });
      }

      if (user.role === "state_officer" && application.status !== "state_review") {
        return res
          .status(400)
          .json({ message: "This application is not in state review status and cannot be reviewed by state officer" });
      }

      const updateData: Partial<HomestayApplication> = {};

      if (user.role === "district_officer") {
        updateData.districtOfficerId = user.id;
        updateData.districtReviewDate = new Date();
        updateData.districtNotes = comments || null;

        if (action === "approve") {
          updateData.status = "state_review";
          updateData.currentStage = "state";
        } else {
          updateData.status = "rejected";
          updateData.rejectionReason = comments || "Rejected at district level";
        }
      } else {
        updateData.stateOfficerId = user.id;
        updateData.stateReviewDate = new Date();
        updateData.stateNotes = comments || null;

        if (action === "approve") {
          updateData.status = "approved";
          updateData.approvedAt = new Date();
          updateData.currentStage = "final";
        } else {
          updateData.status = "rejected";
          updateData.rejectionReason = comments || "Rejected at state level";
        }
      }

      const updated = await storage.updateApplication(id, updateData);
      res.json({ application: updated });
    } catch {
      res.status(500).json({ message: "Failed to review application" });
    }
  });

  router.post(
    "/:id/send-back",
    requireRole("district_officer", "state_officer"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { feedback } = req.body;

        if (!feedback || feedback.trim().length < 10) {
          return res.status(400).json({ message: "Feedback is required (minimum 10 characters)" });
        }

        const user = await storage.getUser(req.session.userId!);
        if (!user || (user.role !== "district_officer" && user.role !== "state_officer")) {
          return res.status(403).json({ message: "Only officers can send back applications" });
        }

        const application = await storage.getApplication(id);
        if (!application) {
          return res.status(404).json({ message: "Application not found" });
        }

        const updated = await storage.updateApplication(id, {
          status: "sent_back_for_corrections",
          clarificationRequested: feedback,
        });

        res.json({ application: updated, message: "Application sent back to applicant" });
      } catch (error) {
        applicationsLog.error({ err: error, route: "/:id/send-back" }, "Send back error");
        res.status(500).json({ message: "Failed to send back application" });
      }
    },
  );

  router.post(
    "/:id/move-to-inspection",
    requireRole("district_officer", "state_officer"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { scheduledDate, notes } = req.body;

        const user = await storage.getUser(req.session.userId!);
        if (!user || (user.role !== "district_officer" && user.role !== "state_officer")) {
          return res.status(403).json({ message: "Only officers can schedule inspections" });
        }

        const application = await storage.getApplication(id);
        if (!application) {
          return res.status(404).json({ message: "Application not found" });
        }

        const updated = await storage.updateApplication(id, {
          status: "site_inspection_scheduled",
          currentStage: "site_inspection",
          siteInspectionScheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          siteInspectionOfficerId: user.id,
          siteInspectionNotes: notes,
        });
        await logApplicationAction({
          applicationId: id,
          actorId: user.id,
          action: "inspection_scheduled",
          previousStatus: application.status,
          newStatus: "site_inspection_scheduled",
          feedback: notes || undefined,
        });

        const inspectionOwner = await storage.getUser(application.userId);
        const inspectionDate = scheduledDate
          ? format(new Date(scheduledDate), "dd MMM yyyy")
          : updated?.siteInspectionScheduledDate
            ? format(new Date(updated.siteInspectionScheduledDate), "dd MMM yyyy")
            : "";
        queueNotification("inspection_scheduled", {
          application: updated,
          owner: inspectionOwner ?? null,
          extras: {
            INSPECTION_DATE: inspectionDate,
          },
        });

        res.json({ application: updated, message: "Site inspection scheduled" });
      } catch (error) {
        applicationsLog.error({ err: error, route: "/:id/move-to-inspection" }, "Move to inspection error");
        res.status(500).json({ message: "Failed to schedule inspection" });
      }
    },
  );

  router.post(
    "/:id/complete-inspection",
    requireRole("district_officer", "state_officer"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { outcome, findings, notes } = req.body;

        const user = await storage.getUser(req.session.userId!);
        if (!user || (user.role !== "district_officer" && user.role !== "state_officer")) {
          return res.status(403).json({ message: "Only officers can complete inspections" });
        }

        const application = await storage.getApplication(id);
        if (!application) {
          return res.status(404).json({ message: "Application not found" });
        }

        if (!["approved", "corrections_needed", "rejected"].includes(outcome)) {
          return res.status(400).json({ message: "Invalid inspection outcome" });
        }

        if (
          (outcome === "corrections_needed" || outcome === "rejected") &&
          !findings?.issuesFound &&
          !notes
        ) {
          return res.status(400).json({
            message: "Issues description is required when sending back for corrections or rejecting an application",
          });
        }

        let newStatus;
        let clarificationRequested = null;

        // Legacy RC applications skip payment - they already have valid RCs
        const isLegacyRC = application.applicationNumber?.startsWith('LG-HS-');

        switch (outcome) {
          case "approved":
            // Legacy RC: skip payment, go directly to approved
            newStatus = isLegacyRC ? "approved" : "payment_pending";
            break;
          case "corrections_needed":
            newStatus = "sent_back_for_corrections";
            clarificationRequested = findings?.issuesFound || notes || "Site inspection found issues that need correction";
            break;
          case "rejected":
            newStatus = "rejected";
            break;
          default:
            newStatus = "inspection_completed";
        }

        const updateData: any = {
          status: newStatus,
          siteInspectionCompletedDate: new Date(),
          siteInspectionOutcome: outcome,
          siteInspectionFindings: findings || {},
          siteInspectionNotes: notes,
        };

        if (outcome === "rejected") {
          updateData.rejectionReason = findings?.issuesFound || notes || "Application rejected after site inspection";
        } else if (outcome === "corrections_needed") {
          updateData.clarificationRequested = clarificationRequested;
        } else if (outcome === "approved" && isLegacyRC) {
          // Legacy RC: set approval date directly since no payment step
          updateData.approvedAt = new Date();
        }

        const updated = await storage.updateApplication(id, updateData);
        await logApplicationAction({
          applicationId: id,
          actorId: user.id,
          action: "inspection_completed",
          previousStatus: application.status,
          newStatus: newStatus,
          feedback: notes || clarificationRequested || null,
        });

        res.json({ application: updated, message: "Inspection completed successfully" });
      } catch (error) {
        applicationsLog.error({ err: error, route: "/:id/complete-inspection" }, "Complete inspection error");
        res.status(500).json({ message: "Failed to complete inspection" });
      }
    },
  );

  router.get("/:id/timeline", requireAuth, async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const viewer = await storage.getUser(req.session.userId!);
      if (!canViewApplicationTimeline(viewer ?? null, application)) {
        return res.status(403).json({ message: "You are not allowed to view this timeline" });
      }

      const actions = await storage.getApplicationActions(req.params.id);
      const actorIds = Array.from(
        new Set(actions.map((action) => action.officerId).filter((value): value is string => Boolean(value))),
      );

      const actorMap = new Map<string, ReturnType<typeof summarizeTimelineActor>>();
      await Promise.all(
        actorIds.map(async (actorId) => {
          const actor = await storage.getUser(actorId);
          if (actor) {
            actorMap.set(actorId, summarizeTimelineActor(actor));
          }
        }),
      );

      const timeline = actions.map((action) => ({
        id: action.id,
        action: action.action,
        previousStatus: action.previousStatus ?? null,
        newStatus: action.newStatus ?? null,
        feedback: action.feedback ?? null,
        createdAt: action.createdAt,
        actor: action.officerId ? actorMap.get(action.officerId) ?? null : null,
      }));

      res.json({ timeline });
    } catch (error) {
      applicationsLog.error({ err: error, route: "/:id/timeline" }, "Failed to fetch timeline");
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });

  // Inspection Schedule Routes
  router.get("/:id/inspection-schedule", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userId = req.session.userId!;
      const requester = await storage.getUser(userId);
      const isOwner = application.userId === userId;
      const officerRoles = new Set([
        'district_tourism_officer',
        'district_officer',
        'dealing_assistant',
        'state_officer',
        'admin',
        'super_admin',
      ]);

      if (!isOwner && (!requester || !officerRoles.has(requester.role))) {
        return res.status(403).json({ message: "You are not authorized to view this inspection schedule" });
      }

      const orderResult = await db
        .select()
        .from(inspectionOrders)
        .where(eq(inspectionOrders.applicationId, id))
        .orderBy(desc(inspectionOrders.createdAt))
        .limit(1);

      if (orderResult.length === 0) {
        return res.status(404).json({ message: "Inspection order not found" });
      }

      const order = orderResult[0];
      const assignedDa = await storage.getUser(order.assignedTo);

      const ackAction = await db
        .select()
        .from(applicationActions)
        .where(
          and(
            eq(applicationActions.applicationId, id),
            eq(applicationActions.action, 'inspection_acknowledged'),
          ),
        )
        .orderBy(desc(applicationActions.createdAt))
        .limit(1);

      res.json({
        order: {
          id: order.id,
          status: order.status,
          inspectionDate: order.inspectionDate,
          specialInstructions: order.specialInstructions,
          assignedTo: assignedDa
            ? { id: assignedDa.id, fullName: assignedDa.fullName, mobile: assignedDa.mobile }
            : null,
        },
        acknowledgedAt: ackAction.length ? ackAction[0].createdAt : null,
      });
    } catch (error) {
      applicationsLog.error({ err: error, route: "/:id/inspection-schedule" }, "Failed to fetch inspection schedule");
      res.status(500).json({ message: "Failed to fetch inspection schedule" });
    }
  });

  router.post("/:id/inspection-schedule/acknowledge", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Only the application owner can acknowledge the inspection schedule" });
      }

      const orderResult = await db
        .select()
        .from(inspectionOrders)
        .where(eq(inspectionOrders.applicationId, id))
        .orderBy(desc(inspectionOrders.createdAt))
        .limit(1);

      if (orderResult.length === 0) {
        return res.status(400).json({ message: "Inspection has not been scheduled yet" });
      }

      const order = orderResult[0];
      if (order.status === 'completed') {
        return res.status(400).json({ message: "Inspection already completed" });
      }

      const existingAck = await db
        .select()
        .from(applicationActions)
        .where(
          and(
            eq(applicationActions.applicationId, id),
            eq(applicationActions.action, 'inspection_acknowledged'),
          ),
        )
        .limit(1);

      if (existingAck.length > 0) {
        return res.status(400).json({ message: "Inspection already acknowledged" });
      }

      await logApplicationAction({
        applicationId: id,
        actorId: userId,
        action: "inspection_acknowledged",
        previousStatus: application.status,
        newStatus: application.status,
        feedback: "Inspection schedule acknowledged by applicant",
      });

      res.json({ message: "Inspection schedule acknowledged" });
    } catch (error) {
      applicationsLog.error({ err: error, route: "/:id/inspection-schedule/acknowledge" }, "Failed to acknowledge inspection");
      res.status(500).json({ message: "Failed to acknowledge inspection" });
    }
  });

  router.get("/:id/inspection-report", requireAuth, async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const viewer = await storage.getUser(req.session.userId!);
      // Note: canViewInspectionReport logic needs to be imported or duplicated
      // For now, simple check:
      const canView = viewer && (
        viewer.role !== "property_owner" || viewer.id === application.userId
      );

      if (!canView) {
        return res.status(403).json({ message: "You are not allowed to view this inspection report" });
      }

      const [report] = await db
        .select()
        .from(inspectionReports)
        .where(eq(inspectionReports.applicationId, application.id))
        .orderBy(desc(inspectionReports.submittedDate))
        .limit(1);

      if (!report) {
        return res.status(404).json({ message: "Inspection report not available yet" });
      }

      const [order] = await db
        .select()
        .from(inspectionOrders)
        .where(eq(inspectionOrders.id, report.inspectionOrderId))
        .limit(1);

      const owner = await storage.getUser(application.userId);

      res.json({
        report,
        inspectionOrder: order ?? null,
        application: {
          id: application.id,
          applicationNumber: application.applicationNumber,
          propertyName: application.propertyName,
          district: application.district,
          tehsil: application.tehsil,
          address: application.address,
          category: application.category,
          status: application.status,
          siteInspectionOutcome: application.siteInspectionOutcome ?? null,
          siteInspectionNotes: application.siteInspectionNotes ?? null,
          siteInspectionCompletedDate: application.siteInspectionCompletedDate ?? null,
        },
        owner: owner
          ? {
            id: owner.id,
            fullName: owner.fullName,
            email: owner.email,
            mobile: owner.mobile,
          }
          : null,
      });
    } catch (error) {
      applicationsLog.error({ err: error, route: "/:id/inspection-report" }, "Failed to fetch inspection report");
      res.status(500).json({ message: "Failed to fetch inspection report" });
    }
  });

  // Document Routes
  router.get("/:id/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByApplication(req.params.id);
      res.json({ documents });
    } catch (error) {
      applicationsLog.error({ err: error, route: "/:id/documents" }, "Failed to fetch documents");
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  return router;
}

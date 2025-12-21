import express from "express";
import { desc, and, inArray, eq } from "drizzle-orm";
import { requireAuth, requireRole } from "./core/middleware";
import { storage } from "../storage";
import { logger } from "../logger";
import { db } from "../db";
import {
    homestayApplications,
    applicationActions,
    users,
    inspectionOrders,
    inspectionReports,
} from "@shared/schema";
import { handleStaffProfileUpdate, handleStaffPasswordChange } from "./core/user-handlers";
import { getDistrictStaffManifest } from "@shared/districtStaffManifest";
import { buildDistrictWhereClause, districtsMatch } from "./helpers/district";
import { summarizeTimelineActor } from "./helpers/timeline";
import { logApplicationAction } from "../audit";
import { queueNotification, createInAppNotification } from "../services/notifications";
import { format } from "date-fns";

const routeLog = logger.child({ module: "dtdo-router" });

export function createDtdoRouter() {
    const router = express.Router();

    // Get applications for DTDO (district-specific)
    router.get("/applications", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            if (!user || !user.district) {
                return res.status(400).json({ message: "DTDO must be assigned to a district" });
            }

            const districtCondition = buildDistrictWhereClause(homestayApplications.district, user.district);

            // Get all applications from this DTDO's district ordered by most recent
            const allApplications = await db
                .select()
                .from(homestayApplications)
                .where(districtCondition)
                .orderBy(desc(homestayApplications.createdAt));

            let latestCorrectionMap: Map<
                string,
                { createdAt: Date | null; feedback: string | null }
            > | null = null;
            if (allApplications.length > 0) {
                const applicationIds = allApplications.map((app) => app.id);
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

            // Enrich with owner and DA information
            const applicationsWithDetails = await Promise.all(
                allApplications.map(async (app) => {
                    const owner = await storage.getUser(app.userId);

                    // Get DA name if the application was forwarded by DA
                    let daName = undefined;
                    const daRemarks = (app as unknown as { daRemarks?: string }).daRemarks;
                    if (daRemarks || app.daId) {
                        const da = app.daId ? await storage.getUser(app.daId) : null;
                        daName = da?.fullName || 'Unknown DA';
                    }

                    return {
                        ...app,
                        ownerName: owner?.fullName || 'Unknown',
                        ownerMobile: owner?.mobile || 'N/A',
                        daName,
                        latestCorrection: latestCorrectionMap?.get(app.id) ?? null,
                    };
                })
            );

            res.json(applicationsWithDetails);
        } catch (error) {
            routeLog.error("[dtdo] Failed to fetch applications:", error);
            res.status(500).json({ message: "Failed to fetch applications" });
        }
    });

    // Get single application details for DTDO
    router.get("/applications/:id", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(req.params.id);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district (handles labels like "Hamirpur (serving Una)")
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only access applications from your district" });
            }

            // Get owner information
            const owner = await storage.getUser(application.userId);

            // Get documents
            const documents = await storage.getDocumentsByApplication(req.params.id);

            // Get DA information if available
            let daInfo = null;
            if (application.daId) {
                const da = await storage.getUser(application.daId);
                daInfo = da ? { fullName: da.fullName, mobile: da.mobile } : null;
            }

            const correctionHistory = await db
                .select({
                    id: applicationActions.id,
                    createdAt: applicationActions.createdAt,
                    feedback: applicationActions.feedback,
                })
                .from(applicationActions)
                .where(
                    and(
                        eq(applicationActions.applicationId, req.params.id),
                        eq(applicationActions.action, 'correction_resubmitted'),
                    ),
                )
                .orderBy(desc(applicationActions.createdAt));

            res.json({
                application,
                owner: owner ? {
                    fullName: owner.fullName,
                    mobile: owner.mobile,
                    email: owner.email,
                } : null,
                documents,
                daInfo,
                correctionHistory,
            });
        } catch (error) {
            routeLog.error("[dtdo] Failed to fetch application details:", error);
            res.status(500).json({ message: "Failed to fetch application details" });
        }
    });

    // DTDO accept application (schedule inspection)
    router.post("/applications/:id/accept", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { remarks } = req.body;
            const trimmedRemarks = typeof remarks === "string" ? remarks.trim() : "";
            if (!trimmedRemarks) {
                return res.status(400).json({ message: "Remarks are required when scheduling an inspection." });
            }
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(req.params.id);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            // Verify application status
            if (application.status !== 'forwarded_to_dtdo' && application.status !== 'dtdo_review') {
                return res.status(400).json({ message: "Application is not in the correct status for DTDO review" });
            }

            // Update application status to dtdo_review (intermediate state)
            // Will only move to inspection_scheduled after successful inspection scheduling
            await storage.updateApplication(req.params.id, {
                status: 'dtdo_review',
                dtdoRemarks: trimmedRemarks,
                dtdoId: userId,
                dtdoReviewDate: new Date(),
            });
            await logApplicationAction({
                applicationId: req.params.id,
                actorId: userId,
                action: "dtdo_accept",
                previousStatus: application.status,
                newStatus: "dtdo_review",
                feedback: trimmedRemarks,
            });

            res.json({ message: "Application accepted. Proceed to schedule inspection.", applicationId: req.params.id });
        } catch (error) {
            routeLog.error("[dtdo] Failed to accept application:", error);
            res.status(500).json({ message: "Failed to accept application" });
        }
    });

    // DTDO reject application
    router.post("/applications/:id/reject", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { remarks } = req.body;

            if (!remarks || remarks.trim().length === 0) {
                return res.status(400).json({ message: "Rejection reason is required" });
            }

            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(req.params.id);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            // Update application status to rejected
            await storage.updateApplication(req.params.id, {
                status: 'rejected',
                dtdoRemarks: remarks,
                dtdoId: userId,
                dtdoReviewDate: new Date(),
                rejectionReason: remarks,
            });

            res.json({ message: "Application rejected successfully" });
        } catch (error) {
            routeLog.error("[dtdo] Failed to reject application:", error);
            res.status(500).json({ message: "Failed to reject application" });
        }
    });

    // DTDO revert application to applicant
    router.post("/applications/:id/revert", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { remarks } = req.body;

            if (!remarks || remarks.trim().length === 0) {
                return res.status(400).json({ message: "Please specify what corrections are needed" });
            }

            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(req.params.id);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            const trimmedRemarks = remarks.trim();
            const currentRevertCount = application.revertCount ?? 0;

            // AUTO-REJECT: If application was already sent back once, reject it automatically
            if (currentRevertCount >= 1) {
                routeLog.info({ applicationId: req.params.id, revertCount: currentRevertCount },
                    "Auto-rejecting application on second DTDO revert attempt");

                await storage.updateApplication(req.params.id, {
                    status: 'rejected',
                    rejectionReason: `APPLICATION AUTO-REJECTED: Application was sent back twice. Original reason: ${trimmedRemarks}`,
                    dtdoRemarks: trimmedRemarks,
                    dtdoId: userId,
                    dtdoReviewDate: new Date(),
                    revertCount: currentRevertCount + 1,
                } as Partial<HomestayApplication>);

                await logApplicationAction({
                    applicationId: req.params.id,
                    actorId: userId,
                    action: "auto_rejected",
                    previousStatus: application.status,
                    newStatus: "rejected",
                    feedback: `Auto-rejected on 2nd revert. Reason: ${trimmedRemarks}`,
                });

                const owner = await storage.getUser(application.userId);
                queueNotification("application_rejected", {
                    application: { ...application, status: "rejected" } as HomestayApplication,
                    owner: owner ?? null,
                    extras: { REMARKS: `Application was automatically rejected after multiple correction attempts. Reason: ${trimmedRemarks}` },
                });

                return res.json({
                    message: "Application has been automatically REJECTED due to multiple send-backs",
                    autoRejected: true,
                    newStatus: "rejected"
                });
            }

            // Update application status to reverted_by_dtdo and increment revertCount
            const revertedApplication = await storage.updateApplication(req.params.id, {
                status: 'reverted_by_dtdo',
                dtdoRemarks: trimmedRemarks,
                dtdoId: userId,
                dtdoReviewDate: new Date(),
                clarificationRequested: trimmedRemarks,
                revertCount: currentRevertCount + 1,
            });
            await logApplicationAction({
                applicationId: req.params.id,
                actorId: userId,
                action: "dtdo_revert",
                previousStatus: application.status,
                newStatus: "reverted_by_dtdo",
                feedback: trimmedRemarks,
            });

            const owner = await storage.getUser(application.userId);
            queueNotification("dtdo_revert", {
                application: revertedApplication ?? { ...application, status: "reverted_by_dtdo" },
                owner: owner ?? null,
                extras: { REMARKS: trimmedRemarks },
            });

            res.json({
                message: "Application reverted to applicant successfully",
                newRevertCount: currentRevertCount + 1,
                warning: "This application can only be sent back once more before automatic rejection."
            });
        } catch (error) {
            routeLog.error("[dtdo] Failed to revert application:", error);
            res.status(500).json({ message: "Failed to revert application" });
        }
    });

    // DTDO timeline view
    router.get("/applications/:id/timeline", requireAuth, async (req, res) => {
        const viewer = await storage.getUser(req.session.userId!);
        if (!viewer || (viewer.role !== 'district_tourism_officer' && viewer.role !== 'district_officer')) {
            return res.status(403).json({ message: "You are not allowed to view this timeline" });
        }
        try {
            const application = await storage.getApplication(req.params.id);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            const actions = await storage.getApplicationActions(req.params.id);
            const actorIds = Array.from(
                new Set(
                    actions
                        .map((action) => action.officerId)
                        .filter((value): value is string => Boolean(value)),
                ),
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
            routeLog.error("[dtdo timeline] Failed to fetch timeline:", error);
            res.status(500).json({ message: "Failed to fetch timeline" });
        }
    });

    // Get available DAs for DTDO's district
    router.get("/available-das", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            if (!user || !user.district) {
                return res.status(400).json({ message: "DTDO must be assigned to a district" });
            }

            const districtCondition = buildDistrictWhereClause(users.district, user.district);
            const potentialUsers = await db
                .select()
                .from(users)
                .where(districtCondition);

            const manifestEntries = getDistrictStaffManifest().filter((entry) =>
                districtsMatch(entry.districtLabel, user.district),
            );
            const canonicalUsernameTokens = new Set(
                manifestEntries.map((entry) => entry.da.username.trim().toLowerCase()),
            );
            const canonicalMobiles = new Set(manifestEntries.map((entry) => entry.da.mobile.trim()));

            let filteredUsers = potentialUsers.filter(
                (u) =>
                    u.role === 'dealing_assistant' &&
                    districtsMatch(user.district, u.district ?? user.district),
            );

            if (manifestEntries.length > 0) {
                const manifestOnly = filteredUsers.filter((u) => {
                    const normalizedUsername = (u.username || "").trim().toLowerCase();
                    const normalizedMobile = (u.mobile || "").trim();
                    return (
                        (normalizedUsername && canonicalUsernameTokens.has(normalizedUsername)) ||
                        (normalizedMobile && canonicalMobiles.has(normalizedMobile))
                    );
                });
                if (manifestOnly.length > 0) {
                    filteredUsers = manifestOnly;
                }
            }

            const das = filteredUsers.map((da) => ({
                id: da.id,
                fullName: da.fullName,
                mobile: da.mobile,
            }));

            routeLog.info("[dtdo] available-das", {
                officer: user.username,
                district: user.district,
                manifestMatches: manifestEntries.map((entry) => entry.da.username),
                options: das.map((da) => ({ id: da.id, fullName: da.fullName, mobile: da.mobile })),
            });

            res.json({ das });
        } catch (error) {
            routeLog.error("[dtdo] Failed to fetch DAs:", error);
            res.status(500).json({ message: "Failed to fetch available DAs" });
        }
    });





    // Schedule inspection (create inspection order)
    router.post("/schedule-inspection", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { applicationId, inspectionDate, assignedTo, specialInstructions } = req.body;
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            if (!applicationId || !inspectionDate || !assignedTo) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            if (!user || !user.district) {
                return res.status(400).json({ message: "DTDO must be assigned to a district" });
            }

            const application = await storage.getApplication(applicationId);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            if (!districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            // Verify application status - should be in dtdo_review after acceptance
            if (application.status !== 'dtdo_review') {
                return res.status(400).json({ message: "Application must be accepted by DTDO before scheduling inspection" });
            }

            const assignedDaUser = await storage.getUser(assignedTo);
            if (
                !assignedDaUser ||
                assignedDaUser.role !== 'dealing_assistant' ||
                !districtsMatch(user.district, assignedDaUser.district)
            ) {
                return res.status(400).json({ message: "Selected DA is not available for your district" });
            }

            // Create inspection order
            const newInspectionOrder = await db
                .insert(inspectionOrders)
                .values({
                    applicationId,
                    scheduledBy: userId,
                    scheduledDate: new Date(),
                    assignedTo,
                    assignedDate: new Date(),
                    inspectionDate: new Date(inspectionDate),
                    inspectionAddress: application.address,
                    specialInstructions: specialInstructions || null,
                    status: 'scheduled',
                })
                .returning();
            routeLog.info("[dtdo] inspection scheduled", {
                applicationId,
                applicationNumber: application.applicationNumber,
                assignedDa: assignedDaUser.username,
            });

            // Update application status
            await storage.updateApplication(applicationId, {
                status: 'inspection_scheduled',
                siteInspectionScheduledDate: new Date(inspectionDate),
                siteInspectionOfficerId: assignedTo, // DA is the officer visiting
            });
            await logApplicationAction({
                applicationId,
                actorId: userId,
                action: "inspection_scheduled",
                previousStatus: "dtdo_review",
                newStatus: "inspection_scheduled",
                feedback: `Inspection scheduled for ${inspectionDate} by ${assignedDaUser.fullName}`,
            });

            // Notify owner
            const owner = await storage.getUser(application.userId);
            const notificationsToSend = [];

            // 1. Email/SMS to owner
            notificationsToSend.push(queueNotification("inspection_scheduled", {
                application: { ...application, status: "inspection_scheduled" },
                owner: owner ?? null,
                extras: {
                    INSPECTION_DATE: format(new Date(inspectionDate), "dd MMM yyyy"),
                    INSPECTION_OFFICER: assignedDaUser.fullName,
                    INSPECTION_OFFICER_MOBILE: assignedDaUser.mobile,
                }
            }));

            // 2. In-app notification to DA
            notificationsToSend.push(createInAppNotification({
                userId: assignedTo,
                title: "New Inspection Assigned",
                message: `You have been assigned an inspection for application ${application.applicationNumber} on ${format(new Date(inspectionDate), "dd MMM yyyy")}`,
                type: "inspection_assigned",
                entityId: applicationId,
                entityType: "application",
                metadata: {
                    inspectionDate,
                    applicationNumber: application.applicationNumber
                }
            }));

            if (notificationsToSend.length > 0) {
                await Promise.allSettled(notificationsToSend);
            }

            res.json({ message: "Inspection scheduled successfully", inspectionOrder: newInspectionOrder[0] });
        } catch (error) {
            routeLog.error("[dtdo] Failed to schedule inspection:", error);
            res.status(500).json({ message: "Failed to schedule inspection" });
        }
    });

    // Get inspection report for DTDO review
    router.get("/inspection-report/:applicationId", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { applicationId } = req.params;
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            // Get application
            const application = await storage.getApplication(applicationId);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only review applications from your district" });
            }

            // Get inspection order
            const inspectionOrder = await db
                .select()
                .from(inspectionOrders)
                .where(eq(inspectionOrders.applicationId, applicationId))
                .orderBy(desc(inspectionOrders.createdAt))
                .limit(1);

            if (inspectionOrder.length === 0) {
                return res.status(404).json({ message: "No inspection order found" });
            }

            // Get inspection report
            const report = await db
                .select()
                .from(inspectionReports)
                .where(eq(inspectionReports.inspectionOrderId, inspectionOrder[0].id))
                .limit(1);

            if (report.length === 0) {
                return res.status(404).json({ message: "Inspection report not found" });
            }

            // Get DA who submitted the report
            const da = await storage.getUser(report[0].submittedBy);

            // Get property owner
            const owner = await storage.getUser(application.userId);

            res.json({
                report: report[0],
                application,
                inspectionOrder: inspectionOrder[0],
                owner: owner ? {
                    fullName: owner.fullName,
                    mobile: owner.mobile,
                    email: owner.email,
                } : null,
                da: da ? {
                    fullName: da.fullName,
                    mobile: da.mobile,
                } : null,
            });
        } catch (error) {
            routeLog.error("[dtdo] Failed to fetch inspection report:", error);
            res.status(500).json({ message: "Failed to fetch inspection report" });
        }
    });

    // DTDO approve inspection report
    router.post("/inspection-report/:applicationId/approve", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { applicationId } = req.params;
            const { remarks } = req.body;
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(applicationId);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            // Verify application is in inspection_under_review status
            if (application.status !== 'inspection_under_review') {
                return res.status(400).json({
                    message: `Cannot approve inspection report. Application must be in inspection_under_review status (current: ${application.status})`
                });
            }

            // Check if payment was already made (upfront payment flow)
            const isUpfrontPaid = application.paymentStatus === 'paid' || application.paymentStatus === 'completed';

            if (isUpfrontPaid) {
                // Payment already made - issue certificate directly
                const year = new Date().getFullYear();
                const randomSuffix = Math.floor(10000 + Math.random() * 90000);
                const certificateNumber = `HP-HST-${year}-${randomSuffix}`;
                const issueDate = new Date();
                const expiryDate = new Date(issueDate);
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);

                const approvedApplication = await storage.updateApplication(applicationId, {
                    status: 'approved',
                    certificateNumber,
                    certificateIssuedDate: issueDate,
                    certificateExpiryDate: expiryDate,
                    approvedAt: issueDate,
                    dtdoId: userId,
                    districtNotes: remarks || 'Inspection approved. Certificate issued (payment was already completed).',
                    districtOfficerId: userId,
                    districtReviewDate: new Date(),
                });

                // Application Lifecycle: If this was a service request (Add Rooms, etc.), 
                // mark the parent application as superseded so it doesn't show as active/duplicate.
                if (application.parentApplicationId) {
                    await storage.updateApplication(application.parentApplicationId, {
                        status: 'superseded',
                        districtNotes: `Superseded by application ${application.applicationNumber}`
                    });
                }

                await logApplicationAction({
                    applicationId,
                    actorId: userId,
                    action: "approved",
                    previousStatus: application.status,
                    newStatus: "approved",
                    feedback: `Certificate ${certificateNumber} issued. Payment was already completed upfront.`,
                });

                const paymentOwner = await storage.getUser(application.userId);
                queueNotification("application_approved", {
                    application: approvedApplication ?? {
                        ...application,
                        status: 'approved',
                        certificateNumber,
                    },
                    owner: paymentOwner ?? null,
                });

                return res.json({
                    message: "Application approved and certificate issued",
                    certificateNumber,
                    upfrontPayment: true,
                });
            }

            // Legacy RC: skip payment entirely - they already have valid RCs
            const isLegacyRC = application.applicationNumber?.startsWith('LG-HS-');
            if (isLegacyRC) {
                const approvedApplication = await storage.updateApplication(applicationId, {
                    status: 'approved',
                    approvedAt: new Date(),
                    dtdoId: userId,
                    districtNotes: remarks || 'Existing RC verified. Certificate issued based on existing RC details.',
                    districtOfficerId: userId,
                    districtReviewDate: new Date(),
                });

                await logApplicationAction({
                    applicationId,
                    actorId: userId,
                    action: "approved",
                    previousStatus: application.status,
                    newStatus: "approved",
                    feedback: `Existing RC verified. No payment required.`,
                });

                const rcOwner = await storage.getUser(application.userId);
                queueNotification("application_approved", {
                    application: approvedApplication ?? {
                        ...application,
                        status: 'approved',
                    },
                    owner: rcOwner ?? null,
                });

                return res.json({
                    message: "Existing RC verification approved. Certificate issued.",
                    isLegacyRC: true,
                });
            }

            // Standard flow - set to verified_for_payment
            const verifiedApplication = await storage.updateApplication(applicationId, {
                status: 'verified_for_payment',
                districtNotes: remarks || 'Inspection report approved. Property meets all requirements.',
                districtOfficerId: userId,
                districtReviewDate: new Date(),
            });
            await logApplicationAction({
                applicationId,
                actorId: userId,
                action: "verified_for_payment",
                previousStatus: application.status,
                newStatus: "verified_for_payment",
                feedback: remarks || 'Inspection report approved. Property meets all requirements.',
            });

            const paymentOwner = await storage.getUser(application.userId);
            queueNotification("verified_for_payment", {
                application: verifiedApplication ?? {
                    ...application,
                    status: 'verified_for_payment',
                },
                owner: paymentOwner ?? null,
            });

            res.json({ message: "Inspection report approved successfully" });
        } catch (error) {
            routeLog.error("[dtdo] Failed to approve inspection report:", error);
            res.status(500).json({ message: "Failed to approve inspection report" });
        }
    });

    // DTDO reject inspection report
    router.post("/inspection-report/:applicationId/reject", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { applicationId } = req.params;
            const { remarks } = req.body;

            if (!remarks || remarks.trim().length === 0) {
                return res.status(400).json({ message: "Rejection reason is required" });
            }

            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(applicationId);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            // Verify application is in inspection_under_review status
            if (application.status !== 'inspection_under_review') {
                return res.status(400).json({
                    message: `Cannot reject application. Application must be in inspection_under_review status (current: ${application.status})`
                });
            }

            // Update application status to rejected
            await storage.updateApplication(applicationId, {
                status: 'rejected',
                rejectionReason: remarks,
                districtNotes: remarks,
                districtOfficerId: userId,
                districtReviewDate: new Date(),
            });
            await logApplicationAction({
                applicationId,
                actorId: userId,
                action: "dtdo_reject",
                previousStatus: application.status,
                newStatus: "rejected",
                feedback: remarks,
            });

            res.json({ message: "Application rejected successfully" });
        } catch (error) {
            routeLog.error("[dtdo] Failed to reject inspection report:", error);
            res.status(500).json({ message: "Failed to reject inspection report" });
        }
    });

    // DTDO raise objections on inspection report
    router.post("/inspection-report/:applicationId/raise-objections", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { applicationId } = req.params;
            const { remarks } = req.body;

            if (!remarks || remarks.trim().length === 0) {
                return res.status(400).json({ message: "Please specify the objections" });
            }

            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(applicationId);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            // Verify application is in inspection_under_review status
            if (application.status !== 'inspection_under_review') {
                return res.status(400).json({
                    message: `Cannot raise objections. Application must be in inspection_under_review status (current: ${application.status})`
                });
            }

            // Update application status to objection_raised
            await storage.updateApplication(applicationId, {
                status: 'objection_raised',
                districtNotes: remarks,
                districtOfficerId: userId,
                districtReviewDate: new Date(),
                clarificationRequested: remarks,
            });
            await logApplicationAction({
                applicationId,
                actorId: userId,
                action: "objection_raised",
                previousStatus: application.status,
                newStatus: "objection_raised",
                feedback: remarks,
            });

            const owner = await storage.getUser(application.userId);
            queueNotification("dtdo_objection", {
                application: { ...application, status: "objection_raised" },
                owner: owner ?? null,
                extras: { REMARKS: remarks },
            });

            res.json({ message: "Objections raised successfully" });
        } catch (error) {
            routeLog.error("[dtdo] Failed to raise objections:", error);
            res.status(500).json({ message: "Failed to raise objections" });
        }
    });
    // DTDO approve cancellation request
    router.post("/applications/:id/approve-cancellation", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { remarks } = req.body;
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(req.params.id);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            // Verify it is a cancellation request
            if (application.applicationKind !== 'cancel_certificate') {
                return res.status(400).json({ message: "This action is only for cancellation requests" });
            }

            // Update cancellation request status
            await storage.updateApplication(req.params.id, {
                status: 'certificate_cancelled',
                districtNotes: remarks || 'Cancellation approved. Certificate revoked.',
                districtOfficerId: userId,
                districtReviewDate: new Date(),
                approvedAt: new Date(),
                certificateExpiryDate: new Date(), // Expire immediately
            });

            await logApplicationAction({
                applicationId: req.params.id,
                actorId: userId,
                action: "cancellation_approved",
                previousStatus: application.status,
                newStatus: "certificate_cancelled",
                feedback: remarks || 'Cancellation approved',
            });

            // If there is a parent application, cancel it too (Revoke Certificate)
            if (application.parentApplicationId) {
                await storage.updateApplication(application.parentApplicationId, {
                    status: 'certificate_cancelled', // Revoked
                    districtNotes: `Certificate revoked via cancellation request #${application.applicationNumber}. Remarks: ${remarks || 'N/A'}`,
                    certificateExpiryDate: new Date(), // Expire immediately
                });

                await logApplicationAction({
                    applicationId: application.parentApplicationId,
                    actorId: userId,
                    action: "certificate_revoked",
                    previousStatus: "approved", // Assuming it was approved
                    newStatus: "certificate_cancelled",
                    feedback: `Revoked via request #${application.applicationNumber}`,
                });
            }

            const owner = await storage.getUser(application.userId);
            queueNotification("application_approved", {
                application: { ...application, status: 'certificate_cancelled' } as HomestayApplication,
                owner: owner ?? null,
                extras: { REMARKS: "Your request to cancel the Homestay Certificate has been approved. The certificate is now revoked." }
            });

            res.json({ message: "Cancellation request approved. Certificate revoked." });
        } catch (error) {
            routeLog.error("[dtdo] Failed to approve cancellation:", error);
            res.status(500).json({ message: "Failed to approve cancellation" });
        }
    });


    // Profile and Password Management
    router.patch("/profile", requireRole('district_tourism_officer', 'district_officer'), handleStaffProfileUpdate);
    router.post("/change-password", requireRole('district_tourism_officer', 'district_officer'), handleStaffPasswordChange);

    // DTDO approve without inspection (Bypass)
    router.post("/applications/:id/approve-bypass", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
        try {
            const { remarks } = req.body;
            const userId = req.session.userId!;
            const user = await storage.getUser(userId);

            const application = await storage.getApplication(req.params.id);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            // Verify application is from DTDO's district
            if (user?.district && !districtsMatch(user.district, application.district)) {
                return res.status(403).json({ message: "You can only process applications from your district" });
            }

            // Verify global setting allows this bypass (Legacy RC is always allowed)
            const isLegacyRC = application.applicationNumber?.startsWith('LG-HS-');
            const { getSystemSettingRecord } = await import("../services/systemSettings");
            const inspectionSetting = await getSystemSettingRecord("inspection_config");
            const optionalKinds = (inspectionSetting?.settingValue as { optionalKinds: string[] })?.optionalKinds || [];

            // Legacy RC: Always allow bypass - they already have valid RCs
            if (!isLegacyRC && !optionalKinds.includes(application.applicationKind)) {
                return res.status(400).json({
                    message: `Inspection bypass is not enabled for '${application.applicationKind}'. Please schedule an inspection.`
                });
            }

            // Status Check: Should be in review stage
            if (application.status !== 'forwarded_to_dtdo' && application.status !== 'dtdo_review') {
                return res.status(400).json({ message: "Application is not in a reviewable status" });
            }

            // Logic for Cancel Certificate (Special Case)
            if (application.applicationKind === 'cancel_certificate') {
                // Reuse logic for cancellation matching the dedicated endpoint
                // But strictly speaking, the dedicated endpoint /approve-cancellation (above) works too.
                // However, the frontend might call this generic bypass for all "optional" types.
                // Let's forward to standard cancellation logic effectively:

                await storage.updateApplication(req.params.id, {
                    status: 'certificate_cancelled',
                    districtNotes: remarks || 'Cancellation approved (Inspection Skipped). Certificate revoked.',
                    districtOfficerId: userId,
                    districtReviewDate: new Date(),
                    approvedAt: new Date(),
                    certificateExpiryDate: new Date(),
                });

                if (application.parentApplicationId) {
                    await storage.updateApplication(application.parentApplicationId, {
                        status: 'certificate_cancelled',
                        districtNotes: `Certificate revoked via cancellation request #${application.applicationNumber}. Remarks: ${remarks || 'Skipped Inspection'}`,
                        certificateExpiryDate: new Date(),
                    });
                    await logApplicationAction({
                        applicationId: application.parentApplicationId,
                        actorId: userId,
                        action: "certificate_revoked",
                        previousStatus: "approved",
                        newStatus: "certificate_cancelled",
                        feedback: `Revoked via request #${application.applicationNumber} (Inspection Skipped)`,
                    });
                }
                await logApplicationAction({
                    applicationId: req.params.id,
                    actorId: userId,
                    action: "cancellation_approved_bypass",
                    previousStatus: application.status,
                    newStatus: "certificate_cancelled",
                    feedback: remarks || 'Cancellation approved without inspection',
                });
                return res.json({ message: "Cancellation approved without inspection." });
            }

            // Standard Approval Logic (Issue Certificate)
            const year = new Date().getFullYear();
            const randomSuffix = Math.floor(10000 + Math.random() * 90000);
            const certificateNumber = `HP-HST-${year}-${randomSuffix}`;
            const issueDate = new Date();
            const expiryDate = new Date(issueDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);

            const approvedApplication = await storage.updateApplication(req.params.id, {
                status: 'approved',
                certificateNumber,
                certificateIssuedDate: issueDate,
                certificateExpiryDate: expiryDate,
                approvedAt: issueDate,
                dtdoId: userId,
                districtNotes: remarks || 'Approved without inspection (Administrative Approval).',
                districtOfficerId: userId,
                districtReviewDate: new Date(),
            });

            // Supersede Parent logic
            if (application.parentApplicationId) {
                await storage.updateApplication(application.parentApplicationId, {
                    status: 'superseded',
                    districtNotes: `Superseded by application ${application.applicationNumber}`
                });
            }

            await logApplicationAction({
                applicationId: req.params.id,
                actorId: userId,
                action: "approved_bypass_inspection",
                previousStatus: application.status,
                newStatus: "approved",
                feedback: remarks || `Approved without inspection (Configurable Bypass). Certificate ${certificateNumber} issued.`,
            });

            const owner = await storage.getUser(application.userId);
            queueNotification("application_approved", {
                application: approvedApplication ?? {
                    ...application,
                    status: 'approved',
                    certificateNumber,
                },
                owner: owner ?? null,
                extras: { REMARKS: "Your application has been approved directly." }
            });

            res.json({ message: "Application approved without inspection", certificateNumber });

        } catch (error) {
            routeLog.error("[dtdo] Failed to bypass approve application:", error);
            res.status(500).json({ message: "Failed to process approval" });
        }
    });

    return router;
}

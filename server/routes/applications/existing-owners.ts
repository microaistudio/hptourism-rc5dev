import express from "express";
import { z } from "zod";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { requireAuth } from "../core/middleware";
import { storage } from "../../storage";
import { db } from "../../db";
import { homestayApplications, documents } from "@shared/schema";
import { deriveDistrictRoutingLabel } from "@shared/districtRouting";
import { MAX_ROOMS_ALLOWED } from "@shared/fee-calculator";
import {
  DEFAULT_EXISTING_RC_MIN_ISSUE_DATE,
  EXISTING_RC_MIN_ISSUE_DATE_SETTING_KEY,
  normalizeIsoDateSetting,
} from "@shared/appSettings";
import { getSystemSettingRecord } from "../../services/systemSettings";
import {
  LEGACY_LOCATION_TYPES,
  generateLegacyApplicationNumber,
} from "../helpers/legacy";
import { trimOptionalString, trimRequiredString, parseIsoDateOrNull } from "../helpers/format";
import { removeUndefined } from "../helpers/object";
import { isPgUniqueViolation } from "../helpers/db";
import { linkDocumentToStorage } from "../../storageManifest";
import { logger } from "../../logger";

const existingOwnersLog = logger.child({ module: "existing-owners-router" });

const uploadedFileSchema = z.object({
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  fileSize: z.number().int().nonnegative().optional(),
  mimeType: z.string().min(3).optional(),
});

const existingOwnerIntakeSchema = z.object({
  ownerName: z.string().min(3),
  ownerMobile: z.string().min(6),
  ownerEmail: z.string().email().optional().or(z.literal("")),
  propertyName: z.string().min(3),
  district: z.string().min(2),
  tehsil: z.string().min(2),
  address: z.string().min(5),
  pincode: z.string().min(4),
  locationType: z.enum(LEGACY_LOCATION_TYPES),
  totalRooms: z.coerce.number().int().min(1).max(MAX_ROOMS_ALLOWED),
  guardianName: z.string().min(3),
  rcNumber: z.string().min(3),
  rcIssueDate: z.string().min(4),
  rcExpiryDate: z.string().min(4),
  notes: z.string().optional(),
  certificateDocuments: z.array(uploadedFileSchema).min(1),
  identityProofDocuments: z.array(uploadedFileSchema).min(1),
});

// Relaxed schema for drafts - only require minimal fields
const existingOwnerDraftSchema = z.object({
  ownerName: z.string().optional(),
  ownerMobile: z.string().optional(),
  ownerEmail: z.string().optional(),
  propertyName: z.string().optional(),
  district: z.string().optional(),
  tehsil: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  locationType: z.enum(LEGACY_LOCATION_TYPES).optional(),
  totalRooms: z.coerce.number().int().min(1).max(MAX_ROOMS_ALLOWED).optional(),
  guardianName: z.string().optional(),
  rcNumber: z.string().optional(),
  rcIssueDate: z.string().optional(),
  rcExpiryDate: z.string().optional(),
  notes: z.string().optional(),
  certificateDocuments: z.array(uploadedFileSchema).optional(),
  identityProofDocuments: z.array(uploadedFileSchema).optional(),
});

const LEGACY_RC_DRAFT_STATUS = "legacy_rc_draft";

const getExistingOwnerIntakeCutoff = async () => {
  const record = await getSystemSettingRecord(EXISTING_RC_MIN_ISSUE_DATE_SETTING_KEY);
  const iso = normalizeIsoDateSetting(record?.settingValue, DEFAULT_EXISTING_RC_MIN_ISSUE_DATE);
  return parseIsoDateOrNull(iso) ?? parseIsoDateOrNull(DEFAULT_EXISTING_RC_MIN_ISSUE_DATE) ?? new Date("2022-01-01");
};

const findActiveExistingOwnerRequest = async (userId: string) => {
  const [application] = await db
    .select({
      id: homestayApplications.id,
      applicationNumber: homestayApplications.applicationNumber,
      status: homestayApplications.status,
      createdAt: homestayApplications.createdAt,
    })
    .from(homestayApplications)
    .where(
      and(
        eq(homestayApplications.userId, userId),
        // Treat any renewal/legacy onboarding request as active, EXCEPT drafts
        eq(homestayApplications.applicationKind, 'renewal'),
        ne(homestayApplications.status, LEGACY_RC_DRAFT_STATUS),
      ),
    )
    .orderBy(desc(homestayApplications.createdAt))
    .limit(1);

  return application ?? null;
};

// Find existing draft for the user (not yet submitted)
const findDraftExistingOwnerRequest = async (userId: string) => {
  const [application] = await db
    .select()
    .from(homestayApplications)
    .where(
      and(
        eq(homestayApplications.userId, userId),
        eq(homestayApplications.applicationKind, 'renewal'),
        eq(homestayApplications.status, LEGACY_RC_DRAFT_STATUS),
      ),
    )
    .orderBy(desc(homestayApplications.createdAt))
    .limit(1);

  return application ?? null;
};

const findApplicationByCertificateNumber = async (certificateNumber: string) => {
  const normalized = certificateNumber?.trim();
  if (!normalized) {
    return null;
  }

  const [application] = await db
    .select({
      id: homestayApplications.id,
      applicationNumber: homestayApplications.applicationNumber,
      status: homestayApplications.status,
      userId: homestayApplications.userId,
    })
    .from(homestayApplications)
    .where(eq(homestayApplications.certificateNumber, normalized))
    .limit(1);

  return application ?? null;
};

export function createExistingOwnersRouter() {
  const router = express.Router();

  router.get("/settings", requireAuth, async (_req, res) => {
    try {
      const cutoff = await getExistingOwnerIntakeCutoff();
      res.json({ minIssueDate: cutoff.toISOString() });
    } catch (error) {
      existingOwnersLog.error({ err: error, route: "GET /settings" }, "Failed to load intake settings");
      res.status(500).json({ message: "Unable to load onboarding settings" });
    }
  });

  router.get("/active", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const application = await findActiveExistingOwnerRequest(userId);
      res.json({ application });
    } catch (error) {
      existingOwnersLog.error({ err: error, route: "GET /active" }, "Failed to load active onboarding request");
      res.status(500).json({ message: "Unable to load active onboarding request" });
    }
  });

  // Get user's existing owner draft
  router.get("/draft", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const draft = await findDraftExistingOwnerRequest(userId);

      if (!draft) {
        return res.json({ draft: null });
      }

      // Fetch associated documents
      const draftDocs = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, draft.id));

      const certificateDocuments = draftDocs
        .filter(d => d.documentType === "legacy_certificate")
        .map(d => ({
          fileName: d.fileName,
          filePath: d.filePath,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
        }));

      const identityProofDocuments = draftDocs
        .filter(d => d.documentType === "owner_identity_proof")
        .map(d => ({
          fileName: d.fileName,
          filePath: d.filePath,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
        }));

      res.json({
        draft: {
          id: draft.id,
          values: {
            ownerName: draft.ownerName || "",
            ownerMobile: draft.ownerMobile || "",
            ownerEmail: draft.ownerEmail || "",
            propertyName: draft.propertyName || "",
            district: draft.district || "",
            tehsil: draft.tehsil || "",
            address: draft.address || "",
            pincode: draft.pincode || "",
            locationType: draft.locationType || "gp",
            totalRooms: draft.totalRooms || 1,
            guardianName: draft.guardianName || "",
            rcNumber: draft.certificateNumber || "",
            rcIssueDate: draft.certificateIssuedDate?.toISOString().slice(0, 10) || "",
            rcExpiryDate: draft.certificateExpiryDate?.toISOString().slice(0, 10) || "",
            notes: draft.serviceNotes || "",
          },
          certificateDocuments,
          identityProofDocuments,
          savedAt: draft.updatedAt?.toISOString(),
        },
      });
    } catch (error) {
      existingOwnersLog.error({ err: error, route: "GET /draft" }, "Failed to load draft");
      res.status(500).json({ message: "Unable to load draft" });
    }
  });

  // Save/update draft
  router.post("/draft", requireAuth, async (req, res) => {
    try {
      const payload = existingOwnerDraftSchema.parse(req.body ?? {});
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const now = new Date();
      const existingDraft = await findDraftExistingOwnerRequest(userId);

      // Check if certificate number is already used by another application
      if (payload.rcNumber) {
        const existingCertificate = await findApplicationByCertificateNumber(payload.rcNumber);
        if (existingCertificate && (!existingDraft || existingCertificate.id !== existingDraft.id)) {
          return res.status(409).json({
            message: `This RC Number (${payload.rcNumber}) is already registered in the system.`,
          });
        }
      }

      const routedDistrict = payload.district
        ? (deriveDistrictRoutingLabel(payload.district, payload.tehsil || "") ?? payload.district)
        : null;

      const certificateIssuedDate = payload.rcIssueDate ? parseIsoDateOrNull(payload.rcIssueDate) : null;
      const certificateExpiryDate = payload.rcExpiryDate ? parseIsoDateOrNull(payload.rcExpiryDate) : null;

      const draftValues = {
        propertyName: payload.propertyName ? trimRequiredString(payload.propertyName) : null,
        locationType: payload.locationType || "gp",
        totalRooms: payload.totalRooms || 1,
        singleBedRooms: payload.totalRooms || 1,
        doubleBedRooms: 0,
        district: routedDistrict ? trimRequiredString(routedDistrict) : null,
        tehsil: payload.tehsil ? trimRequiredString(payload.tehsil) : undefined,
        address: payload.address ? trimRequiredString(payload.address) : undefined,
        pincode: payload.pincode ? trimRequiredString(payload.pincode) : undefined,
        ownerName: payload.ownerName ? trimRequiredString(payload.ownerName) : undefined,
        ownerMobile: payload.ownerMobile ? trimRequiredString(payload.ownerMobile) : undefined,
        ownerEmail: payload.ownerEmail ? trimOptionalString(payload.ownerEmail) : undefined,
        guardianName: payload.guardianName ? trimOptionalString(payload.guardianName) : undefined,
        certificateNumber: payload.rcNumber ? trimRequiredString(payload.rcNumber) : undefined,
        certificateIssuedDate,
        certificateExpiryDate,
        serviceNotes: payload.notes ? trimOptionalString(payload.notes) : undefined,
        updatedAt: now,
      };

      let draftId: string;

      if (existingDraft) {
        // Update existing draft
        await db
          .update(homestayApplications)
          .set(draftValues as any)
          .where(eq(homestayApplications.id, existingDraft.id));
        draftId = existingDraft.id;
      } else {
        // Create new draft - provide required fields with fallbacks
        const applicationNumber = await generateLegacyApplicationNumber(routedDistrict || "DRAFT");
        const [newDraft] = await db
          .insert(homestayApplications)
          .values({
            userId,
            applicationNumber,
            applicationKind: 'renewal',
            status: LEGACY_RC_DRAFT_STATUS,
            currentStage: LEGACY_RC_DRAFT_STATUS,
            category: 'silver',
            ownerAadhaar: user.aadhaarNumber,
            ownerGender: 'other',
            propertyOwnership: 'owned',
            projectType: 'existing_property',
            propertyArea: "50",
            familySuites: 0,
            attachedWashrooms: 1,
            createdAt: now,
            updatedAt: now,
            // Required fields with defaults for draft
            propertyName: draftValues.propertyName || "Draft Property",
            ownerName: draftValues.ownerName || user.fullName || "Draft Owner",
            ownerMobile: draftValues.ownerMobile || user.mobile || "",
            locationType: draftValues.locationType || "gp",
            totalRooms: draftValues.totalRooms || 1,
            singleBedRooms: draftValues.singleBedRooms || 1,
            doubleBedRooms: 0,
            district: draftValues.district,
            tehsil: draftValues.tehsil,
            address: draftValues.address,
            pincode: draftValues.pincode,
            ownerEmail: draftValues.ownerEmail,
            guardianName: draftValues.guardianName,
            certificateNumber: draftValues.certificateNumber,
            certificateIssuedDate: draftValues.certificateIssuedDate,
            certificateExpiryDate: draftValues.certificateExpiryDate,
            serviceNotes: draftValues.serviceNotes,
          } as any)
          .returning({ id: homestayApplications.id });
        draftId = newDraft.id;
      }

      // Handle documents - delete old ones and insert new ones
      await db.delete(documents).where(eq(documents.applicationId, draftId));

      if (payload.certificateDocuments && payload.certificateDocuments.length > 0) {
        const certDocs = payload.certificateDocuments.map((file) => ({
          applicationId: draftId,
          documentType: "legacy_certificate",
          fileName: file.fileName,
          filePath: file.filePath,
          fileSize: Math.max(1, Math.round(file.fileSize ?? 0)),
          mimeType: file.mimeType || "application/pdf",
        }));
        const insertedCertDocs = await db.insert(documents).values(certDocs).returning();
        for (const doc of insertedCertDocs) {
          await linkDocumentToStorage(doc);
        }
      }

      if (payload.identityProofDocuments && payload.identityProofDocuments.length > 0) {
        const idDocs = payload.identityProofDocuments.map((file) => ({
          applicationId: draftId,
          documentType: "owner_identity_proof",
          fileName: file.fileName,
          filePath: file.filePath,
          fileSize: Math.max(1, Math.round(file.fileSize ?? 0)),
          mimeType: file.mimeType || "application/pdf",
        }));
        const insertedIdDocs = await db.insert(documents).values(idDocs).returning();
        for (const doc of insertedIdDocs) {
          await linkDocumentToStorage(doc);
        }
      }

      res.json({
        message: "Draft saved",
        draftId,
      });
    } catch (error) {
      existingOwnersLog.error({ err: error, route: "POST /draft" }, "Failed to save draft");
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.flatten() });
      }
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  router.post("/", requireAuth, async (req, res) => {
    try {
      const payload = existingOwnerIntakeSchema.parse(req.body ?? {});
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!user.aadhaarNumber) {
        return res.status(400).json({
          message: "Please add your Aadhaar number in profile before submitting existing owner intake.",
        });
      }

      // Check for existing draft or active application
      const existingDraft = await findDraftExistingOwnerRequest(userId);
      const existingActive = await findActiveExistingOwnerRequest(userId);

      // Block only if there's a non-draft active application
      if (existingActive) {
        return res.status(409).json({
          message: "We already captured your existing license request. Please wait for the Admin-RC desk to verify.",
          applicationId: existingActive.id,
        });
      }

      // Check if certificate number is already used by another application
      const existingCertificate = await findApplicationByCertificateNumber(payload.rcNumber);
      if (existingCertificate && (!existingDraft || existingCertificate.id !== existingDraft.id)) {
        return res.status(409).json({
          message: `This RC Number (${payload.rcNumber}) is already registered in the system. Please contact support if this is an error.`,
        });
      }

      const certificateIssuedDate = parseIsoDateOrNull(payload.rcIssueDate);
      const certificateExpiryDate = parseIsoDateOrNull(payload.rcExpiryDate);

      if (!certificateIssuedDate || !certificateExpiryDate) {
        return res.status(400).json({ message: "Invalid certificate dates provided" });
      }

      const cutoffDate = await getExistingOwnerIntakeCutoff();
      if (certificateIssuedDate < cutoffDate) {
        return res.status(400).json({
          message: `Certificates issued before ${cutoffDate.toISOString().slice(0, 10)} are not eligible for onboarding.`,
        });
      }
      if (certificateExpiryDate <= certificateIssuedDate) {
        return res.status(400).json({ message: "Certificate expiry must be after the issue date" });
      }

      const now = new Date();
      const routedLegacyDistrict =
        deriveDistrictRoutingLabel(payload.district, payload.tehsil) ?? payload.district;
      const sanitizedGuardian = trimOptionalString(payload.guardianName);
      const sanitizedNotes = trimOptionalString(payload.notes);
      const derivedAreaSqm = Math.max(50, payload.totalRooms * 30);

      let application: any;

      if (existingDraft) {
        // Update existing draft to submitted status
        const [updated] = await db
          .update(homestayApplications)
          .set({
            propertyName: trimRequiredString(payload.propertyName),
            locationType: payload.locationType,
            totalRooms: payload.totalRooms,
            singleBedRooms: payload.totalRooms,
            doubleBedRooms: 0,
            familySuites: 0,
            attachedWashrooms: payload.totalRooms,
            district: trimRequiredString(routedLegacyDistrict),
            tehsil: trimRequiredString(payload.tehsil),
            address: trimRequiredString(payload.address),
            pincode: trimRequiredString(payload.pincode),
            ownerName: trimRequiredString(payload.ownerName),
            ownerMobile: trimRequiredString(payload.ownerMobile || user.mobile || ""),
            ownerEmail: trimOptionalString(payload.ownerEmail) ?? user.email ?? null,
            ownerAadhaar: user.aadhaarNumber,
            propertyArea: derivedAreaSqm.toString(),
            guardianName: sanitizedGuardian ?? null,
            rooms: [
              {
                roomType: "Declared Rooms",
                size: 0,
                count: payload.totalRooms,
              },
            ],
            status: 'legacy_rc_review',
            currentStage: 'legacy_rc_review',
            submittedAt: now,
            updatedAt: now,
            certificateNumber: trimRequiredString(payload.rcNumber),
            certificateIssuedDate,
            certificateExpiryDate,
            parentCertificateNumber: trimRequiredString(payload.rcNumber),
            parentApplicationNumber: trimRequiredString(payload.rcNumber),
            serviceNotes:
              sanitizedNotes ??
              `Existing owner onboarding request captured on ${now.toLocaleDateString()} with RC #${payload.rcNumber}.`,
            serviceContext: removeUndefined({
              requestedRooms: {
                total: payload.totalRooms,
              },
              legacyGuardianName: sanitizedGuardian ?? undefined,
              inheritsCertificateExpiry: certificateExpiryDate.toISOString(),
              requiresPayment: false,
              note: sanitizedNotes ?? undefined,
              legacyOnboarding: true,
            }),
          })
          .where(eq(homestayApplications.id, existingDraft.id))
          .returning();
        application = updated;
      } else {
        // Create new application (no draft exists)
        const applicationNumber = await generateLegacyApplicationNumber(routedLegacyDistrict);
        const [created] = await db
          .insert(homestayApplications)
          .values({
            userId,
            applicationNumber,
            applicationKind: 'renewal',
            propertyName: trimRequiredString(payload.propertyName),
            category: 'silver',
            locationType: payload.locationType,
            totalRooms: payload.totalRooms,
            singleBedRooms: payload.totalRooms,
            doubleBedRooms: 0,
            familySuites: 0,
            attachedWashrooms: payload.totalRooms,
            district: trimRequiredString(routedLegacyDistrict),
            tehsil: trimRequiredString(payload.tehsil),
            block: null,
            gramPanchayat: null,
            address: trimRequiredString(payload.address),
            pincode: trimRequiredString(payload.pincode),
            ownerName: trimRequiredString(payload.ownerName),
            ownerMobile: trimRequiredString(payload.ownerMobile || user.mobile || ""),
            ownerEmail: trimOptionalString(payload.ownerEmail) ?? user.email ?? null,
            ownerAadhaar: user.aadhaarNumber,
            ownerGender: 'other',
            propertyOwnership: 'owned',
            projectType: 'existing_property',
            propertyArea: derivedAreaSqm.toString(),
            guardianName: sanitizedGuardian ?? null,
            rooms: [
              {
                roomType: "Declared Rooms",
                size: 0,
                count: payload.totalRooms,
              },
            ],
            status: 'legacy_rc_review',
            currentStage: 'legacy_rc_review',
            submittedAt: now,
            createdAt: now,
            updatedAt: now,
            certificateNumber: trimRequiredString(payload.rcNumber),
            certificateIssuedDate,
            certificateExpiryDate,
            parentCertificateNumber: trimRequiredString(payload.rcNumber),
            parentApplicationNumber: trimRequiredString(payload.rcNumber),
            serviceNotes:
              sanitizedNotes ??
              `Existing owner onboarding request captured on ${now.toLocaleDateString()} with RC #${payload.rcNumber}.`,
            serviceContext: removeUndefined({
              requestedRooms: {
                total: payload.totalRooms,
              },
              legacyGuardianName: sanitizedGuardian ?? undefined,
              inheritsCertificateExpiry: certificateExpiryDate.toISOString(),
              requiresPayment: false,
              note: sanitizedNotes ?? undefined,
              legacyOnboarding: true,
            }),
          })
          .returning();
        application = created;
      }

      if (!application) {
        throw new Error("Failed to create/update legacy onboarding record");
      }

      const certificateDocuments = payload.certificateDocuments.map((file) => ({
        applicationId: application.id,
        documentType: "legacy_certificate",
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize: Math.max(1, Math.round(file.fileSize ?? 0)),
        mimeType: file.mimeType || "application/pdf",
      }));

      const identityProofDocuments = payload.identityProofDocuments.map((file) => ({
        applicationId: application.id,
        documentType: "owner_identity_proof",
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize: Math.max(1, Math.round(file.fileSize ?? 0)),
        mimeType: file.mimeType || "application/pdf",
      }));

      if (certificateDocuments.length > 0) {
        const insertedCertificateDocs = await db.insert(documents).values(certificateDocuments).returning();
        for (const doc of insertedCertificateDocs) {
          await linkDocumentToStorage(doc);
        }
      }
      if (identityProofDocuments.length > 0) {
        const insertedIdentityDocs = await db.insert(documents).values(identityProofDocuments).returning();
        for (const doc of insertedIdentityDocs) {
          await linkDocumentToStorage(doc);
        }
      }

      res.status(201).json({
        message: "Existing owner submission received. An Admin-RC editor will verify the certificate shortly.",
        application: {
          id: application.id,
          applicationNumber: application.applicationNumber,
          status: application.status,
        },
      });
    } catch (error) {
      existingOwnersLog.error({ err: error, route: "POST /" }, "Failed to capture onboarding request");
      if (isPgUniqueViolation(error, "homestay_applications_certificate_number_key")) {
        const certificateNumber = typeof req.body?.rcNumber === "string" ? req.body.rcNumber : undefined;
        if (certificateNumber) {
          const existing = await findApplicationByCertificateNumber(certificateNumber);
          if (existing) {
            return res.status(409).json({
              message:
                "This RC / certificate number is already registered in the system. Please open the captured request instead of submitting a new one.",
              applicationId: existing.id,
            });
          }
        }
        return res.status(409).json({
          message: "This RC / certificate number already exists in the system.",
        });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.flatten() });
      }
      res.status(500).json({ message: "Failed to submit onboarding request" });
    }
  });

  return router;
}

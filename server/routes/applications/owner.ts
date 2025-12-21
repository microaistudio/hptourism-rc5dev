import express from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAuth } from "../core/middleware";
import { storage } from "../../storage";
import { logger } from "../../logger";
import { getUploadPolicy } from "../../services/uploadPolicy";
import {
  validateDocumentsAgainstPolicy,
  type NormalizedDocumentRecord,
} from "../../services/documentValidation";
import { deriveDistrictRoutingLabel } from "@shared/districtRouting";
import {
  MAX_ROOMS_ALLOWED,
  MAX_BEDS_ALLOWED,
  validateCategorySelection,
  type CategoryType,
} from "@shared/fee-calculator";
import { queueNotification } from "../../services/notifications";
import { logApplicationAction } from "../../audit";
import { linkDocumentToStorage } from "../../storageManifest";
import { removeUndefined } from "../helpers/object";
import type { HomestayApplication } from "@shared/schema";
import { CORRECTION_CONSENT_TEXT } from "../constants";

const CORRECTION_RESUBMIT_TARGET =
  (process.env.CORRECTION_RESUBMIT_TARGET || "").trim().toLowerCase() === "dtdo" ? "dtdo" : "da";

type OwnerRouterDeps = {
  getRoomRateBandsSetting: () => Promise<any>;
};

const ownerLog = logger.child({ module: "applications-owner" });

const preprocessNumericInput = (val: unknown) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const coerceNumberField = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const normalizeStringField = (value: unknown, fallback = "", maxLength?: number) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  if (typeof maxLength === "number" && maxLength > 0) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
};

const normalizeDocumentsForPersistence = (
  docs: Array<{
    id?: string;
    documentType?: string;
    type?: string;
    fileName?: string;
    name?: string;
    filePath?: string;
    fileUrl?: string;
    url?: string;
    fileSize?: number | string;
    mimeType?: string;
    uploadedAt?: string;
    required?: boolean;
  }> | undefined,
) => {
  if (!Array.isArray(docs)) {
    return undefined;
  }

  const normalized = docs
    .map((doc, index) => {
      const documentType = doc.documentType || doc.type || "supporting_document";
      const fileName = doc.fileName || doc.name || `Document ${index + 1}`;
      const filePath = doc.filePath || doc.fileUrl || doc.url;

      if (!filePath || typeof filePath !== "string") {
        return null;
      }

      let fileSize = doc.fileSize;
      if (typeof fileSize === "string") {
        const parsed = Number(fileSize);
        fileSize = Number.isFinite(parsed) ? parsed : undefined;
      }

      const resolvedSize =
        typeof fileSize === "number" && Number.isFinite(fileSize) ? fileSize : 0;

      return {
        id: doc.id && typeof doc.id === "string" ? doc.id : randomUUID(),
        documentType,
        fileName,
        filePath,
        fileSize: resolvedSize,
        mimeType:
          doc.mimeType && typeof doc.mimeType === "string" && doc.mimeType.length > 0
            ? doc.mimeType
            : "application/octet-stream",
        name: fileName,
        type: documentType,
        url: filePath,
        uploadedAt: doc.uploadedAt,
        required: typeof doc.required === "boolean" ? doc.required : undefined,
      };
    })
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc));

  return normalized;
};

const resolveTehsilFields = (rawTehsil: unknown, rawTehsilOther: unknown) => {
  const tehsilString = typeof rawTehsil === "string" ? rawTehsil.trim() : "";
  const tehsilOtherString = typeof rawTehsilOther === "string" ? rawTehsilOther.trim() : "";

  const isPlaceholder =
    tehsilString.length === 0 ||
    tehsilString.toLowerCase() === "not provided" ||
    tehsilString === "__other" ||
    tehsilString === "__manual";

  const resolvedTehsil =
    !isPlaceholder && tehsilString.length > 0
      ? tehsilString
      : tehsilOtherString.length > 0
        ? tehsilOtherString
        : "Not Provided";

  const resolvedTehsilOther = tehsilOtherString.length > 0 ? tehsilOtherString : null;

  return {
    tehsil: resolvedTehsil,
    tehsilOther: resolvedTehsilOther,
  };
};

// Helper to remove undefined keys so Drizzle ignores them during update
const removeUndefinedKeys = (obj: any) => {
  Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
  return obj;
};

const sanitizeDraftForPersistence = (
  validatedData: any,
  draftOwner: Awaited<ReturnType<typeof storage.getUser>> | null,
  isPartial = false,
) => {
  const normalizedDocuments = normalizeDocumentsForPersistence(validatedData.documents);

  // Helper to conditionally apply defaults
  // If isPartial is true AND value is undefined, return undefined (don't update)
  // Otherwise apply normalization/defaults
  const sStr = (val: unknown, fallback: string = "", max?: number) =>
    (isPartial && val === undefined) ? undefined : normalizeStringField(val, fallback, max);

  const sNum = (val: unknown, fallback?: number) =>
    (isPartial && val === undefined) ? undefined : coerceNumberField(val, fallback);

  // Special handling for tehsil due to interdependent fields
  let resolvedTehsil: string | undefined | null = undefined;
  let resolvedTehsilOther: string | undefined | null = undefined;

  // If either tehsil field is present, or if it's a full Save/POST (not partial), we resolve
  if (!isPartial || validatedData.tehsil !== undefined || validatedData.tehsilOther !== undefined) {
    const { tehsil, tehsilOther } = resolveTehsilFields(
      validatedData.tehsil,
      validatedData.tehsilOther,
    );
    resolvedTehsil = tehsil;
    resolvedTehsilOther = tehsilOther;
  }

  const fallbackOwnerName = normalizeStringField(draftOwner?.fullName, "Draft Owner");
  const fallbackOwnerMobile = normalizeStringField(draftOwner?.mobile, "0000000000");
  const fallbackOwnerEmail = normalizeStringField(draftOwner?.email, "");

  // Clean the object
  const result = {
    ...validatedData,
    propertyName: sStr(validatedData.propertyName, "Draft Homestay"),
    category: validatedData.category || (isPartial ? undefined : "silver"),
    locationType: validatedData.locationType || (isPartial ? undefined : "gp"),
    district: sStr(validatedData.district),
    // Only update tehsil if we resolved it
    ...(resolvedTehsil !== undefined ? { tehsil: resolvedTehsil } : {}),
    ...(resolvedTehsilOther !== undefined ? { tehsilOther: resolvedTehsilOther } : {}),

    block: sStr(validatedData.block),
    blockOther: sStr(validatedData.blockOther),
    gramPanchayat: sStr(validatedData.gramPanchayat),
    gramPanchayatOther: sStr(validatedData.gramPanchayatOther),
    urbanBody: sStr(validatedData.urbanBody),
    urbanBodyOther: sStr(validatedData.urbanBodyOther),
    ward: sStr(validatedData.ward),
    address: sStr(validatedData.address),
    pincode: sStr(validatedData.pincode, "", 10),
    telephone: sStr(validatedData.telephone, "", 20),
    ownerName: sStr(validatedData.ownerName, fallbackOwnerName),
    ownerGender: validatedData.ownerGender || (isPartial ? undefined : "other"),
    ownerMobile: sStr(validatedData.ownerMobile, fallbackOwnerMobile, 15),
    ownerEmail: sStr(validatedData.ownerEmail, fallbackOwnerEmail),
    ownerAadhaar: sStr(validatedData.ownerAadhaar, "000000000000", 12),
    propertyOwnership: validatedData.propertyOwnership === "leased" ? "leased" : "owned",
    projectType: validatedData.projectType || (isPartial ? undefined : "new_project"),
    propertyArea: sNum(validatedData.propertyArea),
    singleBedRooms: sNum(validatedData.singleBedRooms),
    singleBedBeds: sNum(validatedData.singleBedBeds, 1),
    singleBedRoomSize: sNum(validatedData.singleBedRoomSize),
    singleBedRoomRate: sNum(validatedData.singleBedRoomRate),
    doubleBedRooms: sNum(validatedData.doubleBedRooms),
    doubleBedBeds: sNum(validatedData.doubleBedBeds, 2),
    doubleBedRoomSize: sNum(validatedData.doubleBedRoomSize),
    doubleBedRoomRate: sNum(validatedData.doubleBedRoomRate),
    familySuites: sNum(validatedData.familySuites),
    familySuiteBeds: sNum(validatedData.familySuiteBeds, 4),
    familySuiteSize: sNum(validatedData.familySuiteSize),
    familySuiteRate: sNum(validatedData.familySuiteRate),
    attachedWashrooms: sNum(validatedData.attachedWashrooms),
    gstin: sStr(validatedData.gstin, "", 15),
    selectedCategory: validatedData.selectedCategory || validatedData.category || (isPartial ? undefined : "silver"),
    averageRoomRate: sNum(validatedData.averageRoomRate),
    highestRoomRate: sNum(validatedData.highestRoomRate),
    lowestRoomRate: sNum(validatedData.lowestRoomRate),
    certificateValidityYears: validatedData.certificateValidityYears ?? (isPartial ? undefined : 1),
    isPangiSubDivision: validatedData.isPangiSubDivision ?? (isPartial ? undefined : false),
    distanceAirport: sNum(validatedData.distanceAirport),
    distanceRailway: sNum(validatedData.distanceRailway),
    distanceCityCenter: sNum(validatedData.distanceCityCenter),
    distanceShopping: sNum(validatedData.distanceShopping),
    distanceBusStand: sNum(validatedData.distanceBusStand),
    lobbyArea: sNum(validatedData.lobbyArea),
    diningArea: sNum(validatedData.diningArea),
    parkingArea: sStr(validatedData.parkingArea),
    ecoFriendlyFacilities: sStr(validatedData.ecoFriendlyFacilities),
    differentlyAbledFacilities: sStr(validatedData.differentlyAbledFacilities),
    fireEquipmentDetails: sStr(validatedData.fireEquipmentDetails),
    nearestHospital: sStr(validatedData.nearestHospital),
    amenities: validatedData.amenities, // Ensure amenities are passed through
    nearbyAttractions: validatedData.nearbyAttractions, // Ensure nearbyAttractions are passed through
    // For documents: if not present in partial update, leave undefined. Default to [] only for full updates.
    documents: isPartial && normalizedDocuments === undefined ? undefined : (normalizedDocuments ?? []),
    baseFee: sNum(validatedData.baseFee),
    totalBeforeDiscounts: sNum(validatedData.totalBeforeDiscounts),
    validityDiscount: sNum(validatedData.validityDiscount),
    femaleOwnerDiscount: sNum(validatedData.femaleOwnerDiscount),
    pangiDiscount: sNum(validatedData.pangiDiscount),
    totalDiscount: sNum(validatedData.totalDiscount),
    totalFee: sNum(validatedData.totalFee),
    perRoomFee: sNum(validatedData.perRoomFee),
    gstAmount: sNum(validatedData.gstAmount),
  };

  return removeUndefinedKeys(result);
};



// I will wrap the return
// But wait, there was no removeUndefinedKeys in original.
// If Drizzle receives undefined, it might crash or set NULL?
// It usually ignores it in update.

// I'll add a simple recursive undefined remover or just use JSON cleaning logic if needed.
// 'removeUndefined' helper was imported at line 22!
// "import { removeUndefined } from "../helpers/object";"
// So I should use it!

// Re-structuring the return to use removeUndefined


const toNumberFromUnknown = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const draftSchema = z
  .object({
    propertyName: z.string().optional(),
    category: z.enum(["diamond", "gold", "silver"]).optional(),
    address: z.string().optional(),
    district: z.string().optional(),
    tehsil: z.string().optional(),
    tehsilOther: z.string().optional(),
    block: z.string().optional(),
    blockOther: z.string().optional(),
    gramPanchayat: z.string().optional(),
    gramPanchayatOther: z.string().optional(),
    urbanBody: z.string().optional(),
    urbanBodyOther: z.string().optional(),
    ward: z.string().optional(),
    pincode: z.string().optional(),
    locationType: z.enum(["mc", "tcp", "gp"]).optional(),
    telephone: z.string().optional(),
    ownerName: z.string().optional(),
    ownerMobile: z.string().optional(),
    ownerEmail: z.string().optional(),
    ownerAadhaar: z.string().optional(),
    proposedRoomRate: z.coerce.number().optional(),
    singleBedRoomRate: z.coerce.number().optional(),
    doubleBedRoomRate: z.coerce.number().optional(),
    familySuiteRate: z.coerce.number().optional(),
    projectType: z.enum(["new_rooms", "new_project"]).optional(),
    propertyArea: z.coerce.number().optional(),
    singleBedRooms: z.coerce.number().optional(),
    singleBedBeds: z.coerce.number().optional(),
    singleBedRoomSize: z.coerce.number().optional(),
    doubleBedRooms: z.coerce.number().optional(),
    doubleBedBeds: z.coerce.number().optional(),
    doubleBedRoomSize: z.coerce.number().optional(),
    familySuites: z.coerce.number().optional(),
    familySuiteBeds: z.coerce.number().optional(),
    familySuiteSize: z.coerce.number().optional(),
    attachedWashrooms: z.coerce.number().optional(),
    gstin: z.string().optional(),
    distanceAirport: z.coerce.number().optional(),
    distanceRailway: z.coerce.number().optional(),
    distanceCityCenter: z.coerce.number().optional(),
    distanceShopping: z.coerce.number().optional(),
    distanceBusStand: z.coerce.number().optional(),
    lobbyArea: z.coerce.number().optional(),
    diningArea: z.coerce.number().optional(),
    parkingArea: z.string().optional(),
    ecoFriendlyFacilities: z.string().optional(),
    differentlyAbledFacilities: z.string().optional(),
    fireEquipmentDetails: z.string().optional(),
    nearestHospital: z.string().optional(),
    amenities: z.any().optional(),
    baseFee: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    totalBeforeDiscounts: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    validityDiscount: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    femaleOwnerDiscount: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    pangiDiscount: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    totalDiscount: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    totalFee: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    perRoomFee: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    gstAmount: z.preprocess(preprocessNumericInput, z.coerce.number().optional()),
    certificateValidityYears: z.coerce.number().optional(),
    isPangiSubDivision: z.boolean().optional(),
    ownerGender: z.enum(["male", "female", "other"]).optional(),
    documents: z.array(z.any()).optional(),
  })
  .passthrough();

// Extended schema for service requests
const serviceRequestDraftSchema = draftSchema.extend({
  applicationKind: z.enum(['new_registration', 'add_rooms', 'delete_rooms', 'cancel_certificate', 'change_category']).optional(),
  parentApplicationId: z.string().uuid().optional(),
  serviceContext: z.object({
    requestedRooms: z.any().optional(),
    requestedDeletions: z.any().optional(),
    note: z.string().optional(),
  }).optional(),
});

const ownerSubmittableSchema = z.object({
  propertyName: z.string(),
  category: z.enum(["diamond", "gold", "silver"]),
  address: z.string(),
  district: z.string(),
  pincode: z.string(),
  locationType: z.enum(["mc", "tcp", "gp"]),
  telephone: z.string().optional(),
  block: z.string().optional(),
  blockOther: z.string().optional(),
  gramPanchayat: z.string().optional(),
  gramPanchayatOther: z.string().optional(),
  urbanBody: z.string().optional(),
  urbanBodyOther: z.string().optional(),
  ward: z.string().optional(),
  ownerName: z.string(),
  ownerMobile: z.string(),
  ownerEmail: z.string().optional(),
  ownerAadhaar: z.string(),
  propertyOwnership: z.enum(["owned", "leased"]).optional(),
  proposedRoomRate: z.coerce.number().min(0),
  singleBedRoomRate: z.coerce.number().min(0).optional(),
  doubleBedRoomRate: z.coerce.number().min(0).optional(),
  familySuiteRate: z.coerce.number().min(0).optional(),
  projectType: z.enum(["new_rooms", "new_project"]),
  propertyArea: z.coerce.number().min(0),
  singleBedRooms: z.coerce.number().min(0).optional(),
  singleBedBeds: z.coerce.number().min(0).optional(),
  singleBedRoomSize: z.coerce.number().min(0).optional(),
  doubleBedRooms: z.coerce.number().min(0).optional(),
  doubleBedBeds: z.coerce.number().min(0).optional(),
  doubleBedRoomSize: z.coerce.number().min(0).optional(),
  familySuites: z.coerce.number().min(0).optional(),
  familySuiteBeds: z.coerce.number().min(0).optional(),
  familySuiteSize: z.coerce.number().min(0).optional(),
  attachedWashrooms: z.coerce.number().min(0),
  gstin: z
    .string()
    .regex(/^[0-9A-Z]{15}$/, "GSTIN must be 15 uppercase alphanumeric characters")
    .optional(),
  distanceAirport: z.coerce.number().optional(),
  distanceRailway: z.coerce.number().optional(),
  distanceCityCenter: z.coerce.number().optional(),
  distanceShopping: z.coerce.number().optional(),
  distanceBusStand: z.coerce.number().optional(),
  lobbyArea: z.coerce.number().optional(),
  diningArea: z.coerce.number().optional(),
  parkingArea: z.string().optional(),
  ecoFriendlyFacilities: z.string().optional(),
  differentlyAbledFacilities: z.string().optional(),
  fireEquipmentDetails: z.string().optional(),
  nearestHospital: z.string().optional(),
  amenities: z.any().optional(),
  baseFee: z.coerce.number(),
  totalBeforeDiscounts: z.coerce.number().optional(),
  validityDiscount: z.coerce.number().optional(),
  femaleOwnerDiscount: z.coerce.number().optional(),
  pangiDiscount: z.coerce.number().optional(),
  totalDiscount: z.coerce.number().optional(),
  totalFee: z.coerce.number(),
  perRoomFee: z.coerce.number().optional(),
  gstAmount: z.coerce.number().optional(),
  certificateValidityYears: z.coerce.number().optional(),
  isPangiSubDivision: z.boolean().optional(),
  ownerGender: z.enum(["male", "female", "other"]).optional(),
  tehsil: z.string().optional().nullable(),
  tehsilOther: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  documents: z
    .array(
      z.preprocess(
        (value) => {
          if (!value || typeof value !== "object") {
            return value;
          }
          const doc = { ...(value as Record<string, unknown>) };
          doc.filePath =
            typeof doc.filePath === "string" && doc.filePath.length > 0
              ? doc.filePath
              : typeof doc.fileUrl === "string" && doc.fileUrl.length > 0
                ? doc.fileUrl
                : typeof doc.url === "string" && doc.url.length > 0
                  ? doc.url
                  : `missing://${randomUUID()}`;
          doc.documentType =
            typeof doc.documentType === "string" && doc.documentType.length > 0
              ? doc.documentType
              : typeof doc.type === "string" && doc.type.length > 0
                ? doc.type
                : "supporting_document";
          doc.fileName =
            typeof doc.fileName === "string" && doc.fileName.length > 0
              ? doc.fileName
              : typeof doc.name === "string" && doc.name.length > 0
                ? doc.name
                : `${doc.documentType}.pdf`;
          if (doc.fileSize === undefined && typeof doc.size !== "undefined") {
            doc.fileSize = doc.size;
          }
          if (typeof doc.fileSize !== "number" || !Number.isFinite(doc.fileSize)) {
            doc.fileSize = 0;
          }
          doc.mimeType =
            typeof doc.mimeType === "string" && doc.mimeType.length > 0
              ? doc.mimeType
              : typeof doc.type === "string" && doc.type.length > 0
                ? doc.type
                : "application/octet-stream";
          return doc;
        },
        z.object({
          filePath: z.string().min(1, "Document file path is required"),
          fileName: z.string().min(1, "Document file name is required"),
          fileSize: z.coerce.number().nonnegative().optional(),
          mimeType: z.string().optional(),
          documentType: z.string(),
        }),
      ),
    )
    .optional(),
});

const correctionUpdateSchema = z.object({
  propertyName: z.string().optional(),
  category: z.enum(["diamond", "gold", "silver"]).optional(),
  locationType: z.enum(["mc", "tcp", "gp"]).optional(),
  district: z.string().optional(),
  districtOther: z.string().optional(),
  tehsil: z.string().optional(),
  tehsilOther: z.string().optional(),
  block: z.string().optional(),
  blockOther: z.string().optional(),
  gramPanchayat: z.string().optional(),
  gramPanchayatOther: z.string().optional(),
  urbanBody: z.string().optional(),
  urbanBodyOther: z.string().optional(),
  ward: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional(),
  telephone: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  ownerName: z.string().optional(),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
  ownerGender: z.enum(["male", "female", "other"]).optional(),
  ownerMobile: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerAadhaar: z.string().optional(),
  propertyOwnership: z.enum(["owned", "leased"]).optional(),
  projectType: z.enum(["new_rooms", "new_project"]).optional(),
  propertyArea: z.coerce.number().min(0).optional(),
  singleBedRooms: z.coerce.number().int().min(0).optional(),
  singleBedBeds: z.coerce.number().int().min(0).optional(),
  singleBedRoomSize: z.coerce.number().min(0).optional(),
  singleBedRoomRate: z.coerce.number().min(0).optional(),
  doubleBedRooms: z.coerce.number().int().min(0).optional(),
  doubleBedBeds: z.coerce.number().int().min(0).optional(),
  doubleBedRoomSize: z.coerce.number().min(0).optional(),
  doubleBedRoomRate: z.coerce.number().min(0).optional(),
  familySuites: z.coerce.number().int().min(0).max(3).optional(),
  familySuiteBeds: z.coerce.number().int().min(0).optional(),
  familySuiteSize: z.coerce.number().min(0).optional(),
  familySuiteRate: z.coerce.number().min(0).optional(),
  attachedWashrooms: z.coerce.number().int().min(0).optional(),
  gstin: z.string().optional().or(z.literal("")),
  certificateValidityYears: z.coerce.number().int().min(1).max(3).optional(),
  isPangiSubDivision: z.boolean().optional(),
  distanceAirport: z.coerce.number().min(0).optional(),
  distanceRailway: z.coerce.number().min(0).optional(),
  distanceCityCenter: z.coerce.number().min(0).optional(),
  distanceShopping: z.coerce.number().min(0).optional(),
  distanceBusStand: z.coerce.number().min(0).optional(),
  lobbyArea: z.coerce.number().min(0).optional(),
  diningArea: z.coerce.number().min(0).optional(),
  parkingArea: z.string().optional().or(z.literal("")),
  ecoFriendlyFacilities: z.string().optional().or(z.literal("")),
  differentlyAbledFacilities: z.string().optional().or(z.literal("")),
  fireEquipmentDetails: z.string().optional().or(z.literal("")),
  nearestHospital: z.string().optional().or(z.literal("")),
  amenities: z
    .object({
      ac: z.boolean().optional(),
      wifi: z.boolean().optional(),
      parking: z.boolean().optional(),
      restaurant: z.boolean().optional(),
      hotWater: z.boolean().optional(),
      tv: z.boolean().optional(),
      laundry: z.boolean().optional(),
      roomService: z.boolean().optional(),
      garden: z.boolean().optional(),
      mountainView: z.boolean().optional(),
      petFriendly: z.boolean().optional(),
    })
    .optional(),
  rooms: z
    .array(
      z.object({
        roomType: z.string(),
        size: z.coerce.number(),
        count: z.coerce.number(),
      }),
    )
    .optional(),
  baseFee: z.coerce.number().optional(),
  totalBeforeDiscounts: z.coerce.number().optional(),
  validityDiscount: z.coerce.number().optional(),
  femaleOwnerDiscount: z.coerce.number().optional(),
  pangiDiscount: z.coerce.number().optional(),
  totalDiscount: z.coerce.number().optional(),
  totalFee: z.coerce.number().optional(),
  perRoomFee: z.coerce.number().optional(),
  gstAmount: z.coerce.number().optional(),
  documents: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        type: z.string().optional(),
        url: z.string().optional(),
        fileName: z.string().optional(),
        filePath: z.string().optional(),
        fileUrl: z.string().optional(),
        documentType: z.string().optional(),
        fileSize: z.preprocess((value) => {
          if (typeof value === "string" && value.trim() !== "") {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? value : parsed;
          }
          return value;
        }, z.number().optional()),
        mimeType: z.string().optional(),
        uploadedAt: z.string().optional(),
        required: z.boolean().optional(),
      }),
    )
    .optional(),
  ownershipProofUrl: z.string().optional(),
  aadhaarCardUrl: z.string().optional(),
  panCardUrl: z.string().optional(),
  gstCertificateUrl: z.string().optional(),
  propertyPhotosUrls: z.array(z.string()).optional(),
});

export function createOwnerApplicationsRouter({ getRoomRateBandsSetting }: OwnerRouterDeps) {
  const router = express.Router();

  router.post("/draft", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const body = serviceRequestDraftSchema.parse(req.body);
      const applicationKind = body.applicationKind || "new_registration";

      // Fetch all existing applications for this user
      const existingApps = await storage.getApplicationsByUser(userId);

      let parentApp: HomestayApplication | undefined;
      let draftData = { ...body };

      if (applicationKind === "new_registration") {
        // ORIGINAL LOGIC: One active application check
        if (existingApps.length > 0) {
          const existing = existingApps[0];
          // If the *only* existing app is a draft, we can return it (or user should resume it)
          // But strict rule: "Only one homestay application... permitted" including history often implies one *active* flow.
          // RC5 Logic: If existing is draft, return it. If approved/submitted, block new registration.
          if (existing.status === "draft") {
            return res.json({ application: existing, message: "Existing draft loaded" });
          }

          return res.status(409).json({
            message: "Only one homestay application is permitted per owner account. Please maintain your existing property.",
            existingApplicationId: existing.id,
            status: existing.status,
          });
        }
      } else {
        // SERVICE REQUEST LOGIC (Add/Delete Rooms, Cancel, Change Category, etc.)

        // 1. Must have an APPROVED parent application
        // If parentApplicationId is explicitly provided, use that; otherwise find any approved application
        const explicitParentId = body.parentApplicationId;
        console.log('[DEBUG /draft] applicationKind:', applicationKind);
        console.log('[DEBUG /draft] explicitParentId:', explicitParentId);
        console.log('[DEBUG /draft] existingApps count:', existingApps.length);
        console.log('[DEBUG /draft] existingApps statuses:', existingApps.map(a => ({ id: a.id, status: a.status, kind: a.applicationKind })));

        if (explicitParentId) {
          parentApp = existingApps.find(app => app.id === explicitParentId && app.status === 'approved');
          console.log('[DEBUG /draft] Found by explicitParentId:', parentApp ? parentApp.id : 'NOT FOUND');
        } else {
          // Fallback: find the first approved application (new registration, renewal, or existing RC)
          parentApp = existingApps.find(app => app.status === 'approved');
          console.log('[DEBUG /draft] Found by fallback:', parentApp ? parentApp.id : 'NOT FOUND');
        }

        if (!parentApp) {
          console.log('[DEBUG /draft] RETURNING 400 - no approved parent found');
          return res.status(400).json({
            message: "You must have an approved Homestay Registration before applying for amendments or cancellation."
          });
        }

        // 2. Check for pending service requests
        // (Prevent starting "Add Rooms" if "timely_renewal" is already open, etc.)
        const closedStatuses = ['approved', 'rejected', 'superseded', 'certificate_cancelled'];
        const openServiceRequest = existingApps.find(app =>
          !closedStatuses.includes(app.status || '') &&
          app.applicationKind !== 'new_registration'
        );

        if (openServiceRequest) {
          return res.status(409).json({
            message: `You already have a pending service request (${openServiceRequest.applicationKind.replace('_', ' ')}). Please complete it first.`,
            existingApplicationId: openServiceRequest.id
          });
        }

        // 3. Populate Draft with Parent Data
        // We copy property/owner details so the user starts with the current state
        draftData = {
          ...draftData,
          // Core Identity
          propertyName: parentApp.propertyName ?? undefined,
          ownerName: parentApp.ownerName ?? undefined,
          ownerGender: parentApp.ownerGender ?? 'male', // Default to 'male' if not set
          ownerMobile: parentApp.ownerMobile ?? undefined,
          ownerEmail: parentApp.ownerEmail ?? undefined,
          ownerAadhaar: parentApp.ownerAadhaar ?? undefined,

          // Address (Usually invariant)
          district: parentApp.district ?? undefined,
          tehsil: parentApp.tehsil ?? undefined,
          tehsilOther: parentApp.tehsilOther ?? undefined,
          block: parentApp.block ?? undefined,
          blockOther: parentApp.blockOther ?? undefined,
          gramPanchayat: parentApp.gramPanchayat ?? undefined,
          gramPanchayatOther: parentApp.gramPanchayatOther ?? undefined,
          urbanBody: parentApp.urbanBody ?? undefined,
          urbanBodyOther: parentApp.urbanBodyOther ?? undefined,
          ward: parentApp.ward ?? undefined,
          address: parentApp.address ?? undefined,
          pincode: parentApp.pincode ?? undefined,
          locationType: (parentApp.locationType ?? undefined) as any,

          // Property Specs (Current State)
          category: (parentApp.category ?? undefined) as any,
          selectedCategory: (parentApp.category ?? undefined) as any, // Start with current
          totalRooms: parentApp.totalRooms ?? undefined,
          propertyArea: parentApp.propertyArea ? Number(parentApp.propertyArea) : undefined,
          projectType: (parentApp.projectType ?? 'new_project') as any, // Default if not set
          propertyOwnership: (parentApp.propertyOwnership ?? 'owned') as any, // Default if not set

          // Room Configs
          singleBedRooms: parentApp.singleBedRooms ?? 0,
          singleBedBeds: parentApp.singleBedBeds ?? 1,
          singleBedRoomRate: parentApp.singleBedRoomRate ? Number(parentApp.singleBedRoomRate) : undefined,

          doubleBedRooms: parentApp.doubleBedRooms ?? 0,
          doubleBedBeds: parentApp.doubleBedBeds ?? 2,
          doubleBedRoomRate: parentApp.doubleBedRoomRate ? Number(parentApp.doubleBedRoomRate) : undefined,

          familySuites: parentApp.familySuites ?? 0,
          familySuiteBeds: parentApp.familySuiteBeds ?? 4,
          familySuiteRate: parentApp.familySuiteRate ? Number(parentApp.familySuiteRate) : undefined,

          attachedWashrooms: parentApp.attachedWashrooms ?? undefined,

          // Linkage
          applicationKind: applicationKind,
          parentApplicationId: parentApp.id,
          parentApplicationNumber: parentApp.applicationNumber ?? undefined,
          parentCertificateNumber: parentApp.certificateNumber ?? undefined,
        };
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // 4. Validate and Save
      // We use the draftSchema validation but applied to our merged data
      const validatedData = serviceRequestDraftSchema.parse(draftData);
      const sanitizedDraft = sanitizeDraftForPersistence(validatedData, user, true);

      // Ensure required linkage fields are preserved after sanitation
      if (applicationKind !== 'new_registration') {
        (sanitizedDraft as any).applicationKind = applicationKind;
        (sanitizedDraft as any).parentApplicationId = parentApp?.id;
        (sanitizedDraft as any).parentApplicationNumber = parentApp?.applicationNumber;
        (sanitizedDraft as any).parentCertificateNumber = parentApp?.certificateNumber;
      }

      const policy = await getUploadPolicy();
      const draftDocsError = validateDocumentsAgainstPolicy(
        sanitizedDraft.documents as NormalizedDocumentRecord[] | undefined,
        policy,
      );
      if (draftDocsError) {
        return res.status(400).json({ message: draftDocsError });
      }

      const application = await storage.createApplication({
        ...sanitizedDraft,
        userId,
        status: "draft",
      } as any);

      res.json({
        application,
        message: applicationKind === 'new_registration'
          ? "Draft saved successfully."
          : `${applicationKind.replace('_', ' ')} request initiated.`
      });
    } catch (error) {
      ownerLog.error({ err: error }, "[draft:create] Failed to save draft");
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  router.patch("/:id/draft", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;

      const existing = await storage.getApplication(id);
      if (!existing) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this application" });
      }
      if (existing.status !== "draft") {
        return res.status(400).json({ message: "Can only update draft applications" });
      }

      const validatedData = draftSchema.parse(req.body);
      console.log("[draft:update] Payload validated");

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log("[draft:update] Sanitizing draft...");
      const sanitizedDraft = sanitizeDraftForPersistence(validatedData, user, true);
      console.log("[draft:update] Draft sanitized");

      const policy = await getUploadPolicy();
      console.log("[draft:update] Validating documents...");
      const draftDocsError = validateDocumentsAgainstPolicy(
        sanitizedDraft.documents as NormalizedDocumentRecord[] | undefined,
        policy,
      );
      if (draftDocsError) {
        console.log("[draft:update] Document validation failed:", draftDocsError);
        return res.status(400).json({ message: draftDocsError });
      }

      const totalRooms =
        (sanitizedDraft.singleBedRooms || 0) +
        (sanitizedDraft.doubleBedRooms || 0) +
        (sanitizedDraft.familySuites || 0);

      console.log("[draft:update] Updating database...");
      const updated = await storage.updateApplication(id, {
        ...sanitizedDraft,
        totalRooms: totalRooms || existing.totalRooms,
      } as any);
      console.log("[draft:update] Database updated successfully");

      res.json({ application: updated, message: "Draft updated successfully" });
    } catch (error) {
      console.error("[draft:update] CRITIAL ERROR:", error);
      if (error instanceof Error) {
        console.error(error.stack);
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      ownerLog.error({ err: error }, "[draft:update] Failed to update draft");
      res.status(500).json({ message: "Failed to update draft" });
    }
  });

  router.post("/", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validatedData = ownerSubmittableSchema.parse(req.body);

      const totalRooms =
        (validatedData.singleBedRooms || 0) +
        (validatedData.doubleBedRooms || 0) +
        (validatedData.familySuites || 0);
      if (totalRooms <= 0) {
        return res.status(400).json({
          message: "Please configure at least one room before submitting the application.",
        });
      }

      const singleBedsPerRoom =
        validatedData.singleBedBeds ?? ((validatedData.singleBedRooms || 0) > 0 ? 1 : 0);
      const doubleBedsPerRoom =
        validatedData.doubleBedBeds ?? ((validatedData.doubleBedRooms || 0) > 0 ? 2 : 0);
      const suiteBedsPerRoom =
        validatedData.familySuiteBeds ?? ((validatedData.familySuites || 0) > 0 ? 4 : 0);
      const totalBeds =
        (validatedData.singleBedRooms || 0) * singleBedsPerRoom +
        (validatedData.doubleBedRooms || 0) * doubleBedsPerRoom +
        (validatedData.familySuites || 0) * suiteBedsPerRoom;

      if (totalRooms > MAX_ROOMS_ALLOWED) {
        return res.status(400).json({
          message: `HP Homestay Rules 2025 permit a maximum of ${MAX_ROOMS_ALLOWED} rooms.`,
        });
      }
      if (totalBeds > MAX_BEDS_ALLOWED) {
        return res.status(400).json({
          message: `Total beds cannot exceed ${MAX_BEDS_ALLOWED} across all room types. Please adjust the bed counts.`,
        });
      }
      if (totalRooms > 0 && (validatedData.attachedWashrooms || 0) < totalRooms) {
        return res.status(400).json({
          message:
            "Every room must have its own washroom. Increase attached washrooms to at least the total number of rooms.",
        });
      }

      if ((validatedData.singleBedRooms || 0) > 0 && !validatedData.singleBedRoomRate) {
        return res.status(400).json({
          message:
            "Per-room-type rates are mandatory. Single bed room rate is required (HP Homestay Rules 2025 - ANNEXURE-I Form-A Certificate Requirement)",
        });
      }
      if ((validatedData.doubleBedRooms || 0) > 0 && !validatedData.doubleBedRoomRate) {
        return res.status(400).json({
          message:
            "Per-room-type rates are mandatory. Double bed room rate is required (HP Homestay Rules 2025 - ANNEXURE-I Form-A Certificate Requirement)",
        });
      }
      if ((validatedData.familySuites || 0) > 0 && !validatedData.familySuiteRate) {
        return res.status(400).json({
          message:
            "Per-room-type rates are mandatory. Family suite rate is required (HP Homestay Rules 2025 - ANNEXURE-I Form-A Certificate Requirement)",
        });
      }

      const roomRateBands = await getRoomRateBandsSetting();
      const highestRoomRate = Math.max(
        validatedData.singleBedRoomRate || 0,
        validatedData.doubleBedRoomRate || 0,
        validatedData.familySuiteRate || 0,
        validatedData.proposedRoomRate || 0,
      );
      const categoryValidation = validateCategorySelection(
        validatedData.category as CategoryType,
        totalRooms,
        highestRoomRate,
        roomRateBands,
      );
      if (!categoryValidation.isValid) {
        return res.status(400).json({
          message:
            categoryValidation.errors[0] ||
            "The selected category does not match the nightly tariffs. Update the rates or choose a higher category.",
        });
      }

      const existingApps = await storage.getApplicationsByUser(userId);
      const existingApp = existingApps[0];
      if (existingApp && existingApp.status !== "draft") {
        return res.status(409).json({
          message: `You already have an application (${existingApp.applicationNumber}) in status "${existingApp.status}". Amendments are required instead of creating a new application.`,
          existingApplicationId: existingApp.id,
          status: existingApp.status,
        });
      }

      const { tehsil: resolvedTehsilValue, tehsilOther: resolvedTehsilOther } = resolveTehsilFields(
        validatedData.tehsil,
        validatedData.tehsilOther,
      );

      const routedDistrictLabel =
        deriveDistrictRoutingLabel(validatedData.district, resolvedTehsilValue) ??
        validatedData.district;

      const applicationPayload: any = removeUndefined({
        propertyName: validatedData.propertyName,
        category: validatedData.category,
        totalRooms,
        address: validatedData.address,
        district: routedDistrictLabel,
        block: validatedData.block || null,
        blockOther: validatedData.blockOther || null,
        gramPanchayat: validatedData.gramPanchayat || null,
        gramPanchayatOther: validatedData.gramPanchayatOther || null,
        urbanBody: validatedData.urbanBody || null,
        urbanBodyOther: validatedData.urbanBodyOther || null,
        ward: validatedData.ward || null,
        pincode: validatedData.pincode,
        locationType: validatedData.locationType,
        telephone: validatedData.telephone || null,
        tehsil: resolvedTehsilValue,
        tehsilOther: resolvedTehsilOther || null,
        ownerName: validatedData.ownerName,
        propertyOwnership: validatedData.propertyOwnership || null,
        ownerMobile: validatedData.ownerMobile,
        ownerEmail: validatedData.ownerEmail || null,
        ownerAadhaar: validatedData.ownerAadhaar,
        proposedRoomRate: validatedData.proposedRoomRate,
        singleBedRoomRate: validatedData.singleBedRoomRate,
        doubleBedRoomRate: validatedData.doubleBedRoomRate,
        familySuiteRate: validatedData.familySuiteRate,
        projectType: validatedData.projectType,
        propertyArea: validatedData.propertyArea,
        singleBedRooms: validatedData.singleBedRooms,
        singleBedBeds: validatedData.singleBedBeds,
        singleBedRoomSize: validatedData.singleBedRoomSize,
        doubleBedRooms: validatedData.doubleBedRooms,
        doubleBedBeds: validatedData.doubleBedBeds,
        doubleBedRoomSize: validatedData.doubleBedRoomSize,
        familySuites: validatedData.familySuites,
        familySuiteBeds: validatedData.familySuiteBeds,
        familySuiteSize: validatedData.familySuiteSize,
        attachedWashrooms: validatedData.attachedWashrooms,
        gstin: validatedData.gstin || null,
        distanceAirport: validatedData.distanceAirport,
        distanceRailway: validatedData.distanceRailway,
        distanceCityCenter: validatedData.distanceCityCenter,
        distanceShopping: validatedData.distanceShopping,
        distanceBusStand: validatedData.distanceBusStand,
        lobbyArea: validatedData.lobbyArea,
        diningArea: validatedData.diningArea,
        parkingArea: validatedData.parkingArea || null,
        ecoFriendlyFacilities: validatedData.ecoFriendlyFacilities || null,
        differentlyAbledFacilities: validatedData.differentlyAbledFacilities || null,
        fireEquipmentDetails: validatedData.fireEquipmentDetails || null,
        nearestHospital: validatedData.nearestHospital || null,
        amenities: validatedData.amenities,
        baseFee: typeof validatedData.baseFee === "string" ? Number(validatedData.baseFee) : validatedData.baseFee,
        totalBeforeDiscounts:
          typeof validatedData.totalBeforeDiscounts === "string"
            ? Number(validatedData.totalBeforeDiscounts)
            : validatedData.totalBeforeDiscounts ?? null,
        validityDiscount:
          typeof validatedData.validityDiscount === "string"
            ? Number(validatedData.validityDiscount)
            : validatedData.validityDiscount ?? null,
        femaleOwnerDiscount:
          typeof validatedData.femaleOwnerDiscount === "string"
            ? Number(validatedData.femaleOwnerDiscount)
            : validatedData.femaleOwnerDiscount ?? null,
        pangiDiscount:
          typeof validatedData.pangiDiscount === "string"
            ? Number(validatedData.pangiDiscount)
            : validatedData.pangiDiscount ?? null,
        totalDiscount:
          typeof validatedData.totalDiscount === "string"
            ? Number(validatedData.totalDiscount)
            : validatedData.totalDiscount ?? null,
        totalFee:
          typeof validatedData.totalFee === "string"
            ? Number(validatedData.totalFee)
            : validatedData.totalFee,
        perRoomFee:
          typeof validatedData.perRoomFee === "string"
            ? Number(validatedData.perRoomFee)
            : validatedData.perRoomFee ?? null,
        gstAmount:
          typeof validatedData.gstAmount === "string"
            ? Number(validatedData.gstAmount)
            : validatedData.gstAmount ?? null,
        certificateValidityYears: validatedData.certificateValidityYears,
        isPangiSubDivision: validatedData.isPangiSubDivision ?? false,
        ownerGender: validatedData.ownerGender || null,
        latitude: validatedData.latitude || null,
        longitude: validatedData.longitude || null,
        userId,
      });

      const normalizedDocuments = normalizeDocumentsForPersistence(validatedData.documents);
      const submissionPolicy = await getUploadPolicy();
      const submissionDocsError = validateDocumentsAgainstPolicy(
        normalizedDocuments as NormalizedDocumentRecord[] | undefined,
        submissionPolicy,
      );
      if (submissionDocsError) {
        return res.status(400).json({ message: submissionDocsError });
      }
      if (normalizedDocuments) {
        applicationPayload.documents = normalizedDocuments;
      }

      let application;
      const submissionMeta = {
        status: "submitted" as const,
        submittedAt: new Date(),
      };

      if (existingApp) {
        application = await storage.updateApplication(
          existingApp.id,
          removeUndefined({
            ...applicationPayload,
            ...submissionMeta,
          }) as any,
        );
        if (!application) {
          throw new Error("Failed to update existing application");
        }
      } else {
        application = await storage.createApplication(
          {
            ...applicationPayload,
            ...submissionMeta,
          } as any,
          { trusted: true },
        );
      }

      if (normalizedDocuments && normalizedDocuments.length > 0) {
        await storage.deleteDocumentsByApplication(application.id);
        for (const doc of normalizedDocuments) {
          const createdDoc = await storage.createDocument({
            applicationId: application.id,
            documentType: doc.documentType,
            fileName: doc.fileName,
            filePath: doc.filePath,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
          });
          await linkDocumentToStorage(createdDoc);
        }
      }

      const ownerForNotification = await storage.getUser(application.userId);
      queueNotification("application_submitted", {
        application,
        owner: ownerForNotification ?? null,
      });
      await logApplicationAction({
        applicationId: application.id,
        actorId: userId,
        action: "owner_submitted",
        previousStatus: existingApp?.status ?? null,
        newStatus: "submitted",
        feedback: existingApp
          ? "Existing application finalized and submitted."
          : "New application submitted.",
      });

      res.json({ application });
    } catch (error) {
      if (error instanceof z.ZodError) {
        ownerLog.error({ errors: error.errors }, "[applications:create] Validation error");
        return res.status(400).json({ message: error.errors[0].message });
      }
      ownerLog.error({ err: error }, "[applications:create] Failed to create application");
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  router.patch("/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (
        application.status !== "sent_back_for_corrections" &&
        application.status !== "reverted_to_applicant" &&
        application.status !== "reverted_by_dtdo" &&
        application.status !== "objection_raised" &&
        application.status !== "legacy_rc_reverted" // Allow Legacy RC corrections
      ) {
        return res.status(400).json({
          message: "Application can only be updated when sent back for corrections",
        });
      }

      const validatedData = correctionUpdateSchema.parse(req.body);
      const normalizedUpdate: Record<string, unknown> = { ...validatedData };

      // SPECIAL CASE: Legacy RC corrections only update documents, skip all other validations
      const isLegacyRC = application.applicationNumber?.startsWith('LG-HS-');
      if (isLegacyRC) {
        const normalizedDocuments = normalizeDocumentsForPersistence(validatedData.documents);
        const nextCorrectionCount = (application.correctionSubmissionCount ?? 0) + 1;

        // Use same routing as normal corrections - go back to DTDO if that's the target
        const targetStatus =
          CORRECTION_RESUBMIT_TARGET === "dtdo" ? "dtdo_review" : "legacy_rc_review";

        const updatedApplication = await storage.updateApplication(id, {
          documents: normalizedDocuments as any,
          status: targetStatus,
          submittedAt: new Date(),
          clarificationRequested: null,
          dtdoRemarks: null,
          districtNotes: null,
          correctionSubmissionCount: nextCorrectionCount,
        } as Partial<HomestayApplication>);

        await logApplicationAction({
          applicationId: id,
          actorId: userId,
          action: "correction_resubmitted",
          previousStatus: application.status,
          newStatus: targetStatus,
          feedback: `Legacy RC correction resubmitted (cycle ${nextCorrectionCount})`,
        });

        // Update documents in separate table if needed
        if (normalizedDocuments) {
          await storage.deleteDocumentsByApplication(id);
          for (const doc of normalizedDocuments) {
            const createdDoc = await storage.createDocument({
              applicationId: id,
              documentType: doc.documentType,
              fileName: doc.fileName,
              filePath: doc.filePath,
              fileSize: doc.fileSize,
              mimeType: doc.mimeType,
            });
            await linkDocumentToStorage(createdDoc);
          }
        }

        return res.json({ message: "Legacy RC resubmitted for verification", application: updatedApplication });
      }


      if (normalizedUpdate.pincode !== undefined) {
        normalizedUpdate.pincode = normalizeStringField(
          normalizedUpdate.pincode,
          application.pincode ?? "",
          10,
        );
      }
      if (normalizedUpdate.telephone !== undefined) {
        normalizedUpdate.telephone = normalizeStringField(
          normalizedUpdate.telephone,
          application.telephone ?? "",
          20,
        );
      }
      if (normalizedUpdate.ownerMobile !== undefined) {
        normalizedUpdate.ownerMobile = normalizeStringField(
          normalizedUpdate.ownerMobile,
          application.ownerMobile ?? "",
          15,
        );
      }
      if (normalizedUpdate.ownerAadhaar !== undefined) {
        normalizedUpdate.ownerAadhaar = normalizeStringField(
          normalizedUpdate.ownerAadhaar,
          application.ownerAadhaar ?? "000000000000",
          12,
        );
      }
      if (normalizedUpdate.gstin !== undefined) {
        normalizedUpdate.gstin = normalizeStringField(
          normalizedUpdate.gstin,
          application.gstin ?? "",
          15,
        );
      }

      const resolveFinalNumber = (incoming: unknown, fallback: unknown) => {
        if (incoming === undefined) {
          const fallbackNumber = toNumberFromUnknown(fallback);
          return typeof fallbackNumber === "number" ? fallbackNumber : 0;
        }
        if (typeof incoming === "number") {
          return incoming;
        }
        const coerced = toNumberFromUnknown(incoming);
        return typeof coerced === "number" ? coerced : 0;
      };

      const finalSingleRooms = resolveFinalNumber(
        normalizedUpdate.singleBedRooms,
        application.singleBedRooms,
      );
      const finalDoubleRooms = resolveFinalNumber(
        normalizedUpdate.doubleBedRooms,
        application.doubleBedRooms,
      );
      const finalSuiteRooms = resolveFinalNumber(
        normalizedUpdate.familySuites,
        application.familySuites,
      );
      const finalSingleRate = resolveFinalNumber(
        normalizedUpdate.singleBedRoomRate,
        application.singleBedRoomRate,
      );
      const finalDoubleRate = resolveFinalNumber(
        normalizedUpdate.doubleBedRoomRate,
        application.doubleBedRoomRate,
      );
      const finalSuiteRate = resolveFinalNumber(
        normalizedUpdate.familySuiteRate,
        application.familySuiteRate,
      );

      if (finalSingleRooms > 0 && finalSingleRate < 100) {
        return res.status(400).json({
          message: "Single bed room rate must be at least ₹100 when single rooms are configured.",
        });
      }
      if (finalDoubleRooms > 0 && finalDoubleRate < 100) {
        return res.status(400).json({
          message: "Double bed room rate must be at least ₹100 when double rooms are configured.",
        });
      }
      if (finalSuiteRooms > 0 && finalSuiteRate < 100) {
        return res.status(400).json({
          message: "Family suite rate must be at least ₹100 when suites are configured.",
        });
      }

      const normalizedDocuments = normalizeDocumentsForPersistence(validatedData.documents);
      const updatePolicy = await getUploadPolicy();
      const updateDocsError = validateDocumentsAgainstPolicy(
        normalizedDocuments as NormalizedDocumentRecord[] | undefined,
        updatePolicy,
      );
      if (updateDocsError) {
        return res.status(400).json({ message: updateDocsError });
      }
      if (normalizedDocuments) {
        normalizedUpdate.documents = normalizedDocuments;
      }

      if (
        Object.prototype.hasOwnProperty.call(normalizedUpdate, "tehsil") ||
        Object.prototype.hasOwnProperty.call(normalizedUpdate, "tehsilOther")
      ) {
        const { tehsil, tehsilOther } = resolveTehsilFields(
          normalizedUpdate.tehsil,
          normalizedUpdate.tehsilOther,
        );
        normalizedUpdate.tehsil = tehsil;
        if (Object.prototype.hasOwnProperty.call(normalizedUpdate, "tehsilOther")) {
          normalizedUpdate.tehsilOther = tehsilOther;
        }
      }

      const routedDistrictForUpdate = deriveDistrictRoutingLabel(
        typeof normalizedUpdate.district === "string" ? normalizedUpdate.district : application.district,
        typeof normalizedUpdate.tehsil === "string" ? normalizedUpdate.tehsil : application.tehsil,
      );
      if (routedDistrictForUpdate) {
        normalizedUpdate.district = routedDistrictForUpdate;
      }

      const decimalFields = [
        "propertyArea",
        "singleBedRoomSize",
        "singleBedRoomRate",
        "doubleBedRoomSize",
        "doubleBedRoomRate",
        "familySuiteSize",
        "familySuiteRate",
        "distanceAirport",
        "distanceRailway",
        "distanceCityCenter",
        "distanceShopping",
        "distanceBusStand",
        "lobbyArea",
        "diningArea",
        "averageRoomRate",
        "highestRoomRate",
        "lowestRoomRate",
        "totalBeforeDiscounts",
        "validityDiscount",
        "femaleOwnerDiscount",
        "pangiDiscount",
        "totalDiscount",
        "totalFee",
        "perRoomFee",
        "gstAmount",
      ] as const;

      for (const field of decimalFields) {
        const value = normalizedUpdate[field as keyof typeof normalizedUpdate];
        if (typeof value === "number") {
          normalizedUpdate[field as string] = value.toString();
        }
      }

      const singleRooms =
        typeof normalizedUpdate.singleBedRooms === "number"
          ? normalizedUpdate.singleBedRooms
          : application.singleBedRooms ?? 0;
      const doubleRooms =
        typeof normalizedUpdate.doubleBedRooms === "number"
          ? normalizedUpdate.doubleBedRooms
          : application.doubleBedRooms ?? 0;
      const familySuites =
        typeof normalizedUpdate.familySuites === "number"
          ? normalizedUpdate.familySuites
          : application.familySuites ?? 0;
      const singleBeds =
        typeof normalizedUpdate.singleBedBeds === "number"
          ? normalizedUpdate.singleBedBeds
          : application.singleBedBeds ?? ((singleRooms || 0) > 0 ? 1 : 0);
      const doubleBeds =
        typeof normalizedUpdate.doubleBedBeds === "number"
          ? normalizedUpdate.doubleBedBeds
          : application.doubleBedBeds ?? ((doubleRooms || 0) > 0 ? 2 : 0);
      const suiteBeds =
        typeof normalizedUpdate.familySuiteBeds === "number"
          ? normalizedUpdate.familySuiteBeds
          : application.familySuiteBeds ?? ((familySuites || 0) > 0 ? 4 : 0);

      const totalRooms = Number(singleRooms || 0) + Number(doubleRooms || 0) + Number(familySuites || 0);
      const totalBeds =
        Number(singleRooms || 0) * Number(singleBeds || 0) +
        Number(doubleRooms || 0) * Number(doubleBeds || 0) +
        Number(familySuites || 0) * Number(suiteBeds || 0);

      if (totalRooms > MAX_ROOMS_ALLOWED) {
        return res.status(400).json({
          message: `HP Homestay Rules 2025 permit a maximum of ${MAX_ROOMS_ALLOWED} rooms.`,
        });
      }
      if (totalBeds > MAX_BEDS_ALLOWED) {
        return res.status(400).json({
          message: `Total beds cannot exceed ${MAX_BEDS_ALLOWED} across all room types.`,
        });
      }

      const updatedAttachedWashrooms =
        typeof normalizedUpdate.attachedWashrooms === "number"
          ? normalizedUpdate.attachedWashrooms
          : application.attachedWashrooms ?? 0;
      if (totalRooms > 0 && Number(updatedAttachedWashrooms || 0) < totalRooms) {
        return res.status(400).json({
          message:
            "Every room must have its own washroom. Increase attached washrooms to at least the total number of rooms.",
        });
      }
      normalizedUpdate.totalRooms = totalRooms;

      const nextCorrectionCount = (application.correctionSubmissionCount ?? 0) + 1;

      // Decide which queue to send the resubmission to
      // Note: Legacy RC already returned early, so this is for regular corrections only
      const targetStatus =
        CORRECTION_RESUBMIT_TARGET === "dtdo" ? "dtdo_review" : "under_scrutiny";

      const updatedApplication = await storage.updateApplication(id, {
        ...normalizedUpdate,
        status: targetStatus,
        submittedAt: new Date(),
        clarificationRequested: null,
        dtdoRemarks: null,
        districtNotes: null,
        correctionSubmissionCount: nextCorrectionCount,
      } as Partial<HomestayApplication>);

      await logApplicationAction({
        applicationId: id,
        actorId: userId,
        action: "correction_resubmitted",
        previousStatus: application.status,
        newStatus: targetStatus,
        feedback: `${CORRECTION_CONSENT_TEXT} (cycle ${nextCorrectionCount})`,
      });

      if (normalizedDocuments) {
        await storage.deleteDocumentsByApplication(id);
        for (const doc of normalizedDocuments) {
          const createdDoc = await storage.createDocument({
            applicationId: id,
            documentType: doc.documentType,
            fileName: doc.fileName,
            filePath: doc.filePath,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
          });
          await linkDocumentToStorage(createdDoc);
        }
      }

      res.json({ application: updatedApplication });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      ownerLog.error({ err: error }, "[applications:update] Failed to update application");
      res.status(500).json({ message: "Failed to update application" });
    }
  });



  router.delete("/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to access this application" });
      }

      if (application.status !== "draft") {
        console.log('[DEBUG DELETE] Application status is not draft:', application.status, 'id:', id);
        return res.status(400).json({
          message:
            "Only draft applications can be deleted. Please contact support if you need to withdraw a submitted application.",
        });
      }

      await storage.deleteApplication(id);

      ownerLog.info(
        { applicationId: id, userId },
        "[applications:delete] Draft application deleted by owner"
      );

      res.json({
        success: true,
        message: "Draft deleted successfully",
      });
    } catch (error) {
      ownerLog.error(
        { err: error, applicationId: req.params.id },
        "[applications:delete] Failed to delete draft",
      );
      res.status(500).json({ message: "Failed to delete draft" });
    }
  });

  router.post("/:id/submit", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to access this application" });
      }

      if (application.status !== "paid_pending_submit") {
        return res.status(400).json({
          message:
            "Application is not in a state that requires manual submission.",
          currentStatus: application.status,
        });
      }

      const updatedApplication = await storage.updateApplication(id, {
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      } as Partial<HomestayApplication>);

      await logApplicationAction({
        applicationId: id,
        actorId: userId,
        action: "submitted",
        previousStatus: "paid_pending_submit",
        newStatus: "submitted",
        feedback: "Manual submission confirmed by applicant after upfront payment.",
      });

      res.json({
        success: true,
        message: "Application submitted successfully",
        application: updatedApplication,
      });
    } catch (error) {
      ownerLog.error(
        { err: error, applicationId: req.params.id },
        "[applications:submit] Failed to manually submit application",
      );
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  return router;
}

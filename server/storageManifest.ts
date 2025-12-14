import { eq } from "drizzle-orm";
import { db } from "./db";
import { storageObjects, type Document } from "@shared/schema";
import { OBJECT_STORAGE_MODE } from "./objectStorage";

const LOCAL_DOWNLOAD_PREFIX = "/api/local-object/download/";

const sanitizeType = (value?: string | null) => {
  if (!value) {
    return "document";
  }
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned.length > 0 ? cleaned : "document";
};

export const buildLocalObjectKey = (fileType: string, objectId: string) => {
  const safeType = sanitizeType(fileType);
  return `${safeType}s/${objectId}`;
};

export interface StorageMetadataUpsert {
  objectKey: string;
  storageProvider?: string;
  fileType?: string;
  category?: string;
  mimeType?: string;
  sizeBytes?: number;
  checksumSha256?: string | null;
  uploadedBy?: string | null;
  applicationId?: string | null;
  documentId?: string | null;
}

const normalizedSize = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.max(0, Math.round(value));
  return Number.isFinite(rounded) ? rounded : undefined;
};

const compact = <T extends Record<string, any>>(payload: T) => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
};

export const upsertStorageMetadata = async (meta: StorageMetadataUpsert) => {
  if (!meta.objectKey) {
    return;
  }

  const sizeValue = normalizedSize(meta.sizeBytes);

  const insertPayload = {
    objectKey: meta.objectKey,
    storageProvider: meta.storageProvider ?? OBJECT_STORAGE_MODE ?? "local",
    fileType: meta.fileType ?? "document",
    category: meta.category ?? "general",
    mimeType: meta.mimeType ?? "application/octet-stream",
    sizeBytes: sizeValue ?? 0,
    checksumSha256: meta.checksumSha256 ?? null,
    uploadedBy: meta.uploadedBy ?? null,
    applicationId: meta.applicationId ?? null,
    documentId: meta.documentId ?? null,
  };

  const updatePayload = compact({
    storageProvider: meta.storageProvider ?? insertPayload.storageProvider,
    fileType: meta.fileType,
    category: meta.category,
    mimeType: meta.mimeType,
    sizeBytes: sizeValue,
    checksumSha256: meta.checksumSha256 ?? null,
    uploadedBy: meta.uploadedBy ?? null,
    applicationId: meta.applicationId ?? null,
    documentId: meta.documentId ?? null,
  });

  await db
    .insert(storageObjects)
    .values(insertPayload)
    .onConflictDoUpdate({
      target: storageObjects.objectKey,
      set: updatePayload,
    });
};

export const deriveStorageDescriptorFromFilePath = (filePath?: string | null) => {
  if (!filePath || typeof filePath !== "string") {
    return null;
  }

  try {
    const url = new URL(filePath, "http://localhost");
    if (url.pathname.startsWith(LOCAL_DOWNLOAD_PREFIX)) {
      const segments = url.pathname.split("/").filter(Boolean);
      const objectId = segments[segments.length - 1];
      if (!objectId) {
        return null;
      }
      const safeType = sanitizeType(url.searchParams.get("type"));
      return {
        objectKey: buildLocalObjectKey(safeType, objectId),
        storageProvider: "local" as const,
        fileType: safeType,
      };
    }

    const normalizedPath = url.pathname.replace(/^\/+/, "");
    if (!normalizedPath) {
      return null;
    }
    const [bucket, ...objectParts] = normalizedPath.split("/");
    if (!bucket || objectParts.length === 0) {
      return {
        objectKey: normalizedPath,
        storageProvider: OBJECT_STORAGE_MODE ?? "local",
      };
    }
    const objectName = objectParts.join("/");
    const firstSegment = objectParts[0] || "";
    const inferredType =
      firstSegment.endsWith("s") && firstSegment.length > 1
        ? firstSegment.slice(0, -1)
        : firstSegment;
    return {
      objectKey: `${bucket}/${objectName}`,
      storageProvider: OBJECT_STORAGE_MODE ?? "local",
      fileType: inferredType || undefined,
    };
  } catch {
    return null;
  }
};

export const linkDocumentToStorage = async (doc: Document) => {
  const descriptor = deriveStorageDescriptorFromFilePath(doc.filePath);
  if (!descriptor) {
    return;
  }

  await upsertStorageMetadata({
    objectKey: descriptor.objectKey,
    storageProvider: descriptor.storageProvider,
    fileType: descriptor.fileType ?? doc.documentType ?? "document",
    category: doc.documentType ?? "general",
    mimeType: doc.mimeType,
    sizeBytes: doc.fileSize,
    applicationId: doc.applicationId,
    documentId: doc.id,
  });
};

export const markStorageObjectAccessed = async (objectKey: string) => {
  if (!objectKey) {
    return;
  }
  await db
    .update(storageObjects)
    .set({ lastAccessedAt: new Date() })
    .where(eq(storageObjects.objectKey, objectKey));
};

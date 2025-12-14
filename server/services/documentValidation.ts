import { type UploadPolicy, type UploadCategoryKey } from "@shared/uploadPolicy";
import type { InsertHomestayApplication } from "@shared/schema";

export const BYTES_PER_MB = 1024 * 1024;

export type NormalizedDocumentRecord = Exclude<
  NonNullable<InsertHomestayApplication["documents"]>[number],
  null | undefined
>;

export const normalizeMime = (mime?: string | null) => {
  if (!mime || typeof mime !== "string") return "";
  return mime.split(";")[0].trim().toLowerCase();
};

export const getExtension = (input?: string | null) => {
  if (!input || typeof input !== "string") return "";
  const lastDot = input.lastIndexOf(".");
  if (lastDot === -1 || lastDot === input.length - 1) {
    return "";
  }
  return input.slice(lastDot).toLowerCase();
};

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[idx]}`;
};

export const resolveDocumentCategory = (doc: NormalizedDocumentRecord): UploadCategoryKey => {
  const anyDoc = doc as any;
  const type = anyDoc.documentType?.toLowerCase?.() || anyDoc.type?.toLowerCase?.() || "";
  if (type.includes("photo") || type.includes("image")) {
    return "photos";
  }
  const mime = anyDoc.mimeType?.toLowerCase?.() || "";
  if (mime.startsWith("image/")) {
    return "photos";
  }
  return "documents";
};

export const validateDocumentsAgainstPolicy = (
  docs: NormalizedDocumentRecord[] | undefined,
  policy: UploadPolicy,
): string | null => {
  if (!docs || docs.length === 0) {
    return null;
  }

  let totalBytes = 0;

  for (const doc of docs) {
    const category = resolveDocumentCategory(doc);
    const categoryPolicy = policy[category];
    const maxBytes = categoryPolicy.maxFileSizeMB * BYTES_PER_MB;
    const sizeBytes =
      typeof (doc as any).fileSize === "number" && Number.isFinite((doc as any).fileSize)
        ? (doc as any).fileSize
        : 0;

    if (sizeBytes > maxBytes) {
      return `${doc.fileName} exceeds the ${categoryPolicy.maxFileSizeMB} MB limit`;
    }

      const normalizedMime = normalizeMime((doc as any).mimeType);
    const mimeAllowed =
      categoryPolicy.allowedMimeTypes.length === 0 ||
      !normalizedMime ||
      normalizedMime === "application/octet-stream" ||
      normalizedMime === "binary/octet-stream" ||
      categoryPolicy.allowedMimeTypes.includes(normalizedMime) ||
      (normalizedMime === "image/jpg" && categoryPolicy.allowedMimeTypes.includes("image/jpeg"));
    if (!mimeAllowed) {
      return `${doc.fileName} has an unsupported file type (${normalizedMime}). Allowed types: ${categoryPolicy.allowedMimeTypes.join(", ")}`;
    }

    const extension =
      getExtension((doc as any).fileName) ||
      getExtension((doc as any).filePath) ||
      getExtension((doc as any).url);
    if (
      categoryPolicy.allowedExtensions.length > 0 &&
      (!extension || !categoryPolicy.allowedExtensions.includes(extension))
    ) {
      return `${doc.fileName} must use one of the following extensions: ${categoryPolicy.allowedExtensions.join(", ")}`;
    }

    totalBytes += sizeBytes;
  }

  const maxTotalBytes = policy.totalPerApplicationMB * BYTES_PER_MB;
  if (totalBytes > maxTotalBytes) {
    return `Total document size ${formatBytes(totalBytes)} exceeds ${policy.totalPerApplicationMB} MB limit per application`;
  }

  return null;
};

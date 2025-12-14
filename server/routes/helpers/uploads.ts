import type { UploadCategoryKey } from "@shared/uploadPolicy";

export const resolveUploadCategory = (
  rawCategory: unknown,
  fileTypeHint?: string | null,
  mimeTypeHint?: string | null,
): UploadCategoryKey => {
  if (typeof rawCategory === "string" && rawCategory.length > 0) {
    const normalized = rawCategory.toLowerCase();
    if (normalized.includes("photo") || normalized === "images" || normalized === "image") {
      return "photos";
    }
    if (normalized.includes("doc") || normalized === "documents" || normalized === "document") {
      return "documents";
    }
  }

  if (typeof fileTypeHint === "string" && fileTypeHint.toLowerCase().includes("photo")) {
    return "photos";
  }
  if (typeof mimeTypeHint === "string" && mimeTypeHint.toLowerCase().startsWith("image/")) {
    return "photos";
  }

  return "documents";
};

export const isValidMimeType = (candidate: string) =>
  /^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/.test(candidate);

export const sanitizeDownloadFilename = (name: string) => name.replace(/[^a-zA-Z0-9.\-_\s]/g, "_");

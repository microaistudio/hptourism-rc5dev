export const UPLOAD_POLICY_SETTING_KEY = "upload_policy";

export type UploadCategoryPolicy = {
  /**
   * List of allowed MIME types (lowercase) for this category.
   */
  allowedMimeTypes: string[];
  /**
   * List of allowed filename extensions (lowercase, including leading dot).
   */
  allowedExtensions: string[];
  /**
   * Maximum file size in megabytes for a single file in this category.
   */
  maxFileSizeMB: number;
};

export type UploadPolicy = {
  /**
   * Policy for general supporting documents (affidavits, revenue papers, etc.).
   */
  documents: UploadCategoryPolicy;
  /**
   * Policy for photographic evidence (property photos, images, etc.).
   */
  photos: UploadCategoryPolicy;
  /**
   * Maximum combined file size for all documents linked to a single application (in megabytes).
   */
  totalPerApplicationMB: number;
};

export type UploadCategoryKey = keyof Pick<UploadPolicy, "documents" | "photos">;

export const DEFAULT_UPLOAD_POLICY: UploadPolicy = {
  documents: {
    allowedMimeTypes: ["application/pdf"],
    allowedExtensions: [".pdf"],
    maxFileSizeMB: 2,
  },
  photos: {
    // Extended to also allow PDF for mixed uploads (e.g., supporting documents)
    allowedMimeTypes: ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".pdf"],
    maxFileSizeMB: 2,
  },
  totalPerApplicationMB: 20,
};

export const normalizeUploadPolicy = (value: unknown): UploadPolicy => {
  const toArray = (input: unknown): string[] => {
    if (!Array.isArray(input)) return [];
    return input
      .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
      .filter((item) => item.length > 0);
  };

  const toNumber = (input: unknown, fallback: number): number => {
    if (typeof input === "number" && Number.isFinite(input) && input > 0) {
      return input;
    }
    if (typeof input === "string") {
      const parsed = Number(input);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return fallback;
  };

  const asCategoryPolicy = (
    input: any,
    defaults: UploadCategoryPolicy,
  ): UploadCategoryPolicy => ({
    allowedMimeTypes: toArray(input?.allowedMimeTypes).length
      ? toArray(input?.allowedMimeTypes)
      : defaults.allowedMimeTypes,
    allowedExtensions: toArray(input?.allowedExtensions).length
      ? toArray(input?.allowedExtensions)
      : defaults.allowedExtensions,
    maxFileSizeMB: toNumber(input?.maxFileSizeMB, defaults.maxFileSizeMB),
  });

  if (typeof value !== "object" || !value) {
    return DEFAULT_UPLOAD_POLICY;
  }

  return {
    documents: asCategoryPolicy(
      (value as any).documents,
      DEFAULT_UPLOAD_POLICY.documents,
    ),
    photos: asCategoryPolicy(
      (value as any).photos,
      DEFAULT_UPLOAD_POLICY.photos,
    ),
    totalPerApplicationMB: toNumber(
      (value as any).totalPerApplicationMB,
      DEFAULT_UPLOAD_POLICY.totalPerApplicationMB,
    ),
  };
};

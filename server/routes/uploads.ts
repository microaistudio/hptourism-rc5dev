import express from "express";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { createHash } from "crypto";
import { requireAuth } from "./core/middleware";
import { uploadRateLimiter } from "../security/rateLimit";
import {
  ObjectStorageService,
  OBJECT_STORAGE_MODE,
  LOCAL_OBJECT_DIR,
  LOCAL_MAX_UPLOAD_BYTES,
} from "../objectStorage";
import {
  buildLocalObjectKey,
  upsertStorageMetadata,
  markStorageObjectAccessed,
} from "../storageManifest";
import { logger } from "../logger";
import { normalizeMime, getExtension } from "../services/documentValidation";
import { resolveUploadCategory, isValidMimeType, sanitizeDownloadFilename } from "./helpers/uploads";
import type { UploadPolicy } from "@shared/uploadPolicy";

const uploadLog = logger.child({ module: "uploads-router" });

type UploadRouterDeps = {
  getUploadPolicy: () => Promise<UploadPolicy>;
};

export function createUploadRouter({ getUploadPolicy }: UploadRouterDeps) {
  const router = express.Router();

  // Debug: log session/user on upload-related routes to trace auth failures
  router.use((req, _res, next) => {
    uploadLog.info(`[upload-router] ${req.method} ${req.path} user=${req.session?.userId ?? "none"}`);
    next();
  });

  if (OBJECT_STORAGE_MODE === "local") {
    const uploadLimitMb = Math.max(1, Math.ceil(LOCAL_MAX_UPLOAD_BYTES / (1024 * 1024)));
    const rawUploadMiddleware = express.raw({ type: "*/*", limit: `${uploadLimitMb}mb` });

    router.put(
      "/local-object/upload/:objectId",
      uploadRateLimiter,
      requireAuth,
      rawUploadMiddleware,
      async (req, res) => {
        try {
          if (!Buffer.isBuffer(req.body)) {
            return res.status(400).json({ message: "Upload payload missing" });
          }

          const policy = await getUploadPolicy();
          const objectId = req.params.objectId;
          const fileType = (req.query.type as string) || "document";
          const categoryHint = req.query.category as string | undefined;
          const providedMime =
            (req.query.mime as string | undefined) || req.get("Content-Type") || undefined;
          const providedName = req.query.name as string | undefined;
          const category = resolveUploadCategory(categoryHint, fileType, providedMime || null);
          const categoryPolicy = policy[category];
          const fileBuffer = req.body as Buffer;
          const sizeBytes = fileBuffer.length;
          const maxBytes = categoryPolicy.maxFileSizeMB * 1024 * 1024;

          if (sizeBytes > maxBytes) {
            return res
              .status(400)
              .json({ message: `File exceeds the ${categoryPolicy.maxFileSizeMB} MB limit` });
          }

          const normalizedMime = normalizeMime(providedMime);
          if (
            categoryPolicy.allowedMimeTypes.length > 0 &&
            normalizedMime &&
            !categoryPolicy.allowedMimeTypes.includes(normalizedMime)
          ) {
            return res.status(400).json({
              message: `Unsupported file type "${normalizedMime}". Allowed types: ${categoryPolicy.allowedMimeTypes.join(", ")}`,
            });
          }

          const extension =
            getExtension(providedName) ||
            getExtension(req.query.extension as string | undefined) ||
            "";
          if (
            categoryPolicy.allowedExtensions.length > 0 &&
            (!extension || !categoryPolicy.allowedExtensions.includes(extension.toLowerCase()))
          ) {
            return res.status(400).json({
              message: `Unsupported file extension. Allowed extensions: ${categoryPolicy.allowedExtensions.join(", ")}`,
            });
          }

          const safeType = fileType.replace(/[^a-zA-Z0-9_-]/g, "");
          const targetDir = path.join(LOCAL_OBJECT_DIR, `${safeType}s`);
          await fsPromises.mkdir(targetDir, { recursive: true });
          const targetPath = path.join(targetDir, objectId);
          await fsPromises.writeFile(targetPath, fileBuffer);

          const objectKey = buildLocalObjectKey(safeType, objectId);
          const checksumSha256 = createHash("sha256").update(fileBuffer).digest("hex");
          await upsertStorageMetadata({
            objectKey,
            storageProvider: "local",
            fileType: safeType,
            category,
            mimeType: normalizedMime ?? "application/octet-stream",
            sizeBytes,
            checksumSha256,
            uploadedBy: req.session.userId ?? null,
          });

          res.status(200).json({ success: true });
        } catch (error) {
          uploadLog.error("Local upload error", error);
          res.status(500).json({ message: "Failed to store uploaded file" });
        }
      },
    );

    router.get("/local-object/download/:objectId", requireAuth, async (req, res) => {
      try {
        const objectId = req.params.objectId;
        const fileType = (req.query.type as string) || "document";
        const safeType = fileType.replace(/[^a-zA-Z0-9_-]/g, "");
        const filePath = path.join(LOCAL_OBJECT_DIR, `${safeType}s`, objectId);

        await fsPromises.access(filePath, fs.constants.R_OK);
        void markStorageObjectAccessed(buildLocalObjectKey(safeType, objectId)).catch((err) =>
          uploadLog.error("[storage-manifest] Failed to update access timestamp:", err),
        );

        const mimeOverride =
          typeof req.query.mime === "string" && isValidMimeType(req.query.mime)
            ? req.query.mime
            : undefined;
        const filenameOverride =
          typeof req.query.filename === "string" && req.query.filename.trim().length > 0
            ? sanitizeDownloadFilename(req.query.filename.trim())
            : undefined;

        res.setHeader("Content-Type", mimeOverride || "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${filenameOverride || objectId}"`,
        );

        const stream = fs.createReadStream(filePath);
        stream.on("error", (err) => {
          uploadLog.error("Stream error", err);
          res.destroy(err);
        });
        stream.pipe(res);
      } catch (error) {
        uploadLog.error("Local download error", error);
        res.status(404).json({ message: "File not found" });
      }
    });
  }

  router.get("/upload-url", requireAuth, async (req, res) => {
    try {
      const fileType = (req.query.fileType as string) || "document";
      const fileName = (req.query.fileName as string) || "";
      const fileSizeRaw = req.query.fileSize as string | undefined;
      const mimeType = (req.query.mimeType as string | undefined) || undefined;
      const categoryHint = req.query.category as string | undefined;
      const policy = await getUploadPolicy();
      const category = resolveUploadCategory(categoryHint, fileType, mimeType || null);
      const categoryPolicy = policy[category];

      const sizeBytes = Number(fileSizeRaw);
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return res.status(400).json({ message: "File size is required for validation" });
      }

      const maxBytes = categoryPolicy.maxFileSizeMB * 1024 * 1024;
      if (sizeBytes > maxBytes) {
        return res.status(400).json({
          message: `File exceeds the ${categoryPolicy.maxFileSizeMB} MB limit`,
        });
      }

      const normalizedMime = normalizeMime(mimeType);
      if (
        categoryPolicy.allowedMimeTypes.length > 0 &&
        normalizedMime &&
        !categoryPolicy.allowedMimeTypes.includes(normalizedMime)
      ) {
        return res.status(400).json({
          message: `Unsupported file type "${normalizedMime}". Allowed types: ${categoryPolicy.allowedMimeTypes.join(", ")}`,
        });
      }

      const extension = getExtension(fileName);
      if (
        categoryPolicy.allowedExtensions.length > 0 &&
        (!extension || !categoryPolicy.allowedExtensions.includes(extension))
      ) {
        return res.status(400).json({
          message: `Unsupported file extension. Allowed extensions: ${categoryPolicy.allowedExtensions.join(", ")}`,
        });
      }

      const objectStorageService = new ObjectStorageService();
      const { uploadUrl, filePath } = await objectStorageService.prepareUpload(fileType);
      res.json({ uploadUrl, filePath });
    } catch (error) {
      uploadLog.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  router.get("/object-storage/view", requireAuth, async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }

      const mimeOverride =
        typeof req.query.mime === "string" && isValidMimeType(req.query.mime)
          ? req.query.mime
          : undefined;
      const filenameOverride =
        typeof req.query.filename === "string" && req.query.filename.trim().length > 0
          ? sanitizeDownloadFilename(req.query.filename.trim())
          : undefined;

      if (OBJECT_STORAGE_MODE === "local") {
        const localUrl = new URL(`http://placeholder${filePath}`);
        const objectId = localUrl.pathname.split("/").pop();
        if (!objectId) {
          return res.status(400).json({ message: "Invalid file path" });
        }
        const fileTypeParam = localUrl.searchParams.get("type") || "document";
        const safeType = fileTypeParam.replace(/[^a-zA-Z0-9_-]/g, "");
        const diskPath = path.join(LOCAL_OBJECT_DIR, `${safeType}s`, objectId);

        try {
          await fsPromises.access(diskPath, fs.constants.R_OK);
        } catch {
          return res.status(404).json({ message: "File not found" });
        }

        const stream = fs.createReadStream(diskPath);
        stream.on("error", (err) => {
          uploadLog.error("[object-storage:view] stream error", err);
          res.destroy(err);
        });

        res.setHeader("Content-Type", mimeOverride || "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${filenameOverride || objectId}"`,
        );

        stream.pipe(res);
        return;
      }

      const objectStorageService = new ObjectStorageService();
      const viewURL = await objectStorageService.getViewURL(filePath, {
        mimeType: mimeOverride,
        fileName: filenameOverride,
        forceInline: true,
      });

      res.redirect(viewURL);
    } catch (error) {
      uploadLog.error("Error getting view URL:", error);
      res.status(500).json({ message: "Failed to get view URL" });
    }
  });

  return router;
}

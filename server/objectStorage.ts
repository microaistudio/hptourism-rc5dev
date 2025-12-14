import { Storage } from "@google-cloud/storage";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { Readable } from "stream";
import { config } from "@shared/config";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const OBJECT_STORAGE_MODE = config.objectStorage.mode;
export const LOCAL_OBJECT_DIR = path.resolve(config.objectStorage.localDirectory);
export const LOCAL_MAX_UPLOAD_BYTES = config.objectStorage.maxUploadBytes;

if (OBJECT_STORAGE_MODE === "local") {
  fs.mkdirSync(LOCAL_OBJECT_DIR, { recursive: true });
}

const objectStorageClient =
  OBJECT_STORAGE_MODE === "replit"
    ? new Storage({
        credentials: {
          audience: "replit",
          subject_token_type: "access_token",
          token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
          type: "external_account",
          credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
              type: "json",
              subject_token_field_name: "access_token",
            },
          },
          universe_domain: "googleapis.com",
        },
        projectId: "",
      })
    : undefined;

const s3Config = config.objectStorage.s3;
const s3Client =
  OBJECT_STORAGE_MODE === "s3" && s3Config
    ? new S3Client({
        region: s3Config.region,
        endpoint: s3Config.endpoint,
        forcePathStyle: s3Config.forcePathStyle,
        credentials: s3Config.credentials,
      })
    : undefined;

export class ObjectStorageService {
  async prepareUpload(fileType: string = "document"): Promise<{
    uploadUrl: string;
    filePath: string;
  }> {
    if (OBJECT_STORAGE_MODE === "local") {
      const objectId = randomUUID();
      await this.ensureLocalDirectory(fileType);
      const uploadUrl = `/api/local-object/upload/${objectId}?type=${encodeURIComponent(fileType)}`;
      const filePath = `/api/local-object/download/${objectId}?type=${encodeURIComponent(fileType)}`;
      return { uploadUrl, filePath };
    }

    if (OBJECT_STORAGE_MODE === "s3") {
      if (!s3Client || !s3Config) {
        throw new Error("S3 object storage is not configured");
      }
      const objectId = randomUUID();
      const objectName = `${fileType}s/${objectId}`;
      const command = new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: objectName,
      });
      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: config.objectStorage.signedUrlTtlSeconds,
      });
      const filePath = `/${s3Config.bucket}/${objectName}`;
      return { uploadUrl, filePath };
    }

    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/${fileType}s/${objectId}`;
    const { bucketName, objectName } = this.parseObjectPath(fullPath);

    const uploadUrl = await this.signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: config.objectStorage.signedUrlTtlSeconds,
    });

    return {
      uploadUrl,
      filePath: `/${bucketName}/${objectName}`,
    };
  }

  async getViewURL(
    filePath: string,
    options: { mimeType?: string; fileName?: string; forceInline?: boolean } = {},
  ): Promise<string> {
    if (OBJECT_STORAGE_MODE === "local") {
      return filePath;
    }

    if (OBJECT_STORAGE_MODE === "s3") {
      if (!s3Client || !s3Config) {
        throw new Error("S3 object storage is not configured");
      }
      const { bucketName, objectName } = this.parseObjectPath(filePath);
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectName,
        ResponseContentType: options.mimeType,
        ResponseContentDisposition: options.forceInline
          ? options.fileName
            ? `inline; filename="${options.fileName}"`
            : "inline"
          : options.fileName
            ? `attachment; filename="${options.fileName}"`
            : undefined,
      });
      return getSignedUrl(s3Client, command, {
        expiresIn: config.objectStorage.signedUrlTtlSeconds,
      });
    }

    const { bucketName, objectName } = this.parseObjectPath(filePath);

    const responseContentDisposition = options.forceInline
      ? options.fileName
        ? `inline; filename="${options.fileName}"`
        : "inline"
      : undefined;

    return this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec: config.objectStorage.signedUrlTtlSeconds,
      responseContentType: options.mimeType,
      responseContentDisposition,
    });
  }

  async healthCheck(): Promise<{ ok: boolean; mode: string; message?: string }> {
    try {
      if (OBJECT_STORAGE_MODE === "local") {
        await fsPromises.access(LOCAL_OBJECT_DIR, fs.constants.R_OK | fs.constants.W_OK);
        return { ok: true, mode: "local" };
      }

      if (OBJECT_STORAGE_MODE === "s3") {
        if (!s3Client || !s3Config) {
          return { ok: false, mode: "s3", message: "S3 client not configured" };
        }
        await s3Client.send(
          new HeadBucketCommand({
            Bucket: s3Config.bucket,
          }),
        );
        return { ok: true, mode: "s3" };
      }

      if (OBJECT_STORAGE_MODE === "replit") {
        if (!objectStorageClient) {
          return { ok: false, mode: "replit", message: "Replit sidecar unavailable" };
        }
        return { ok: true, mode: "replit" };
      }

      return { ok: false, mode: OBJECT_STORAGE_MODE, message: "Unknown storage mode" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, mode: OBJECT_STORAGE_MODE, message };
    }
  }

  private getPrivateObjectDir(): string {
    const dir = config.objectStorage.replitPrivateDir;
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR not set");
    }
    return dir;
  }

  private parseObjectPath(pathValue: string): { bucketName: string; objectName: string } {
    let normalizedPath = pathValue;
    if (!normalizedPath.startsWith("/")) {
      normalizedPath = `/${normalizedPath}`;
    }
    const pathParts = normalizedPath.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      throw new Error("Invalid object path");
    }
    return {
      bucketName: pathParts[0],
      objectName: pathParts.slice(1).join("/"),
    };
  }

  private async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec,
    responseContentType,
    responseContentDisposition,
  }: {
    bucketName: string;
    objectName: string;
    method: "GET" | "PUT";
    ttlSec: number;
    responseContentType?: string;
    responseContentDisposition?: string;
  }): Promise<string> {
    if (!objectStorageClient) {
      throw new Error("Object storage client not configured");
    }

    const request: Record<string, unknown> = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };

    if (responseContentType) {
      request.response_content_type = responseContentType;
    }
    if (responseContentDisposition) {
      request.response_content_disposition = responseContentDisposition;
    }

    const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to sign object URL: ${response.status}`);
    }

    const { signed_url } = await response.json();
    return signed_url;
  }

  private async ensureLocalDirectory(fileType: string) {
    const dirPath = path.join(LOCAL_OBJECT_DIR, `${fileType}s`);
    await fsPromises.mkdir(dirPath, { recursive: true });
  }

  async readObjectAsBuffer(filePath: string): Promise<Buffer> {
    if (OBJECT_STORAGE_MODE === "local") {
      const localUrl = new URL(`http://placeholder${filePath}`);
      const objectId = localUrl.pathname.split("/").pop();
      if (!objectId) {
        throw new Error("Invalid local object path");
      }
      const fileTypeParam = localUrl.searchParams.get("type") || "document";
      const safeType = fileTypeParam.replace(/[^a-zA-Z0-9_-]/g, "");
      const diskPath = path.join(LOCAL_OBJECT_DIR, `${safeType}s`, objectId);
      return fsPromises.readFile(diskPath);
    }

    if (OBJECT_STORAGE_MODE === "s3") {
      if (!s3Client || !s3Config) {
        throw new Error("S3 client not configured");
      }
      const { bucketName, objectName } = this.parseObjectPath(filePath);
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectName,
      });
      const response = await s3Client.send(command);
      if (!response.Body) {
        throw new Error("Empty S3 object body");
      }
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

    if (OBJECT_STORAGE_MODE === "replit") {
      const viewUrl = await this.getViewURL(filePath);
      const response = await fetch(viewUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch object: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw new Error(`readObjectAsBuffer not implemented for mode "${OBJECT_STORAGE_MODE}"`);
  }
}

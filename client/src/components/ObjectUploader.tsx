import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_UPLOAD_POLICY,
  type UploadPolicy,
} from "@shared/uploadPolicy";

export interface UploadedFileMetadata {
  id?: string; // Optional ID for existing documents
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface ObjectUploaderProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  fileType?: string;
  category?: "documents" | "photos";
  onUploadComplete: (files: UploadedFileMetadata[]) => void;
  existingFiles?: UploadedFileMetadata[];
  className?: string;
  isMissing?: boolean; // Show subtle indication when mandatory upload is missing
}

export function ObjectUploader({
  label,
  accept,
  multiple = false,
  maxFiles = 1,
  fileType = "document",
  category = "documents",
  onUploadComplete,
  existingFiles = [],
  className = "",
  isMissing = false,
}: ObjectUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMetadata[]>(existingFiles);
  const { data: uploadPolicyData } = useQuery<UploadPolicy>({
    queryKey: ["/api/settings/upload-policy"],
    staleTime: 5 * 60 * 1000,
  });
  const uploadPolicy = uploadPolicyData ?? DEFAULT_UPLOAD_POLICY;
  const categoryPolicy = uploadPolicy[category];
  const allowedMimeSet = useMemo(
    () => new Set(categoryPolicy.allowedMimeTypes.map((mime) => mime.toLowerCase())),
    [categoryPolicy.allowedMimeTypes],
  );
  const allowedExtensionSet = useMemo(
    () =>
      new Set(
        categoryPolicy.allowedExtensions.map((ext) =>
          ext.toLowerCase(),
        ),
      ),
    [categoryPolicy.allowedExtensions],
  );
  const maxFileSizeBytes = categoryPolicy.maxFileSizeMB * 1024 * 1024;
  const derivedAccept = useMemo(() => {
    const entries = new Set<string>();

    categoryPolicy.allowedExtensions.forEach((ext) => {
      if (ext && typeof ext === "string") {
        entries.add(ext.toLowerCase());
      }
    });

    categoryPolicy.allowedMimeTypes.forEach((mime) => {
      if (mime && typeof mime === "string") {
        entries.add(mime.toLowerCase());
      }
    });

    if (entries.size === 0) {
      return undefined;
    }

    return Array.from(entries).join(",");
  }, [categoryPolicy.allowedExtensions, categoryPolicy.allowedMimeTypes]);

  const effectiveAccept = accept ?? derivedAccept;

  const getExtension = (name: string) => {
    const lastDot = name.lastIndexOf(".");
    if (lastDot === -1 || lastDot === name.length - 1) {
      return "";
    }
    return name.slice(lastDot).toLowerCase();
  };

  const normalizeMime = (mime: string | undefined) =>
    (mime || "").split(";")[0].trim().toLowerCase();

  // Map common extensions to MIME types for custom accept validation
  const extensionToMime: Record<string, string[]> = {
    '.pdf': ['application/pdf'],
    '.jpg': ['image/jpeg', 'image/jpg'],
    '.jpeg': ['image/jpeg', 'image/jpg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    '.webp': ['image/webp'],
  };

  const isMimeAllowed = (mime: string) => {
    const normalized = normalizeMime(mime);

    // If a custom accept prop is provided with extensions, validate against those
    if (accept) {
      const customExtensions = accept.split(',')
        .filter(ext => ext.startsWith('.'))
        .map(ext => ext.toLowerCase().trim());
      if (customExtensions.length > 0) {
        // Build set of allowed MIME types from extensions
        const allowedMimes = new Set<string>();
        customExtensions.forEach(ext => {
          const mimes = extensionToMime[ext];
          if (mimes) {
            mimes.forEach(m => allowedMimes.add(m));
          }
        });
        // If we found MIME types for the extensions, validate against them
        if (allowedMimes.size > 0) {
          return allowedMimes.has(normalized);
        }
        // If no MIME mapping found, allow any MIME for custom accept
        return true;
      }
    }

    // Fall back to default policy validation
    if (!normalized) {
      return allowedMimeSet.size === 0;
    }
    if (allowedMimeSet.size === 0) {
      return true;
    }
    if (allowedMimeSet.has(normalized)) {
      return true;
    }
    // Accept image/jpg when only image/jpeg is configured (common alias)
    if (
      normalized === "image/jpg" &&
      allowedMimeSet.has("image/jpeg")
    ) {
      return true;
    }
    return false;
  };

  const isExtensionAllowed = (extension: string) => {
    // If a custom accept prop is provided, validate against that instead of the default policy
    if (accept) {
      const customExtensions = accept.split(',')
        .filter(ext => ext.startsWith('.'))
        .map(ext => ext.toLowerCase().trim());
      if (customExtensions.length > 0) {
        return customExtensions.includes(extension.toLowerCase());
      }
    }
    // Fall back to default policy validation
    if (!allowedExtensionSet.size) {
      return true;
    }
    return allowedExtensionSet.has(extension.toLowerCase());
  };

  const appendLocalUploadParams = (
    url: string,
    params: Record<string, string | undefined>,
  ) => {
    try {
      const hasProtocol = /^https?:\/\//i.test(url);
      const target = new URL(
        url,
        hasProtocol ? undefined : window.location.origin,
      );
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          target.searchParams.set(key, value);
        }
      });
      if (hasProtocol) {
        return target.toString();
      }
      return `${target.pathname}${target.search}${target.hash}`;
    } catch {
      return url;
    }
  };

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const value = bytes / Math.pow(1024, index);
    return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[index]}`;
  };

  // Sync internal state with existingFiles prop changes
  useEffect(() => {
    setUploadedFiles(existingFiles);
  }, [existingFiles]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const remainingSlots = maxFiles - uploadedFiles.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Too many files",
        description: `You can only upload ${remainingSlots} more file(s)`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const validFiles: File[] = [];
    const skippedMessages: string[] = [];

    for (const file of files) {
      const extension = getExtension(file.name);
      const normalizedMime = normalizeMime(file.type) || "application/octet-stream";

      if (file.size > maxFileSizeBytes) {
        skippedMessages.push(
          `${file.name} is ${formatBytes(file.size)} (limit ${categoryPolicy.maxFileSizeMB} MB)`,
        );
        continue;
      }

      if (!isExtensionAllowed(extension)) {
        skippedMessages.push(
          `${file.name} must use ${categoryPolicy.allowedExtensions.join(", ")}`,
        );
        continue;
      }

      if (!isMimeAllowed(normalizedMime)) {
        skippedMessages.push(
          `${file.name} has unsupported type ${normalizedMime}`,
        );
        continue;
      }

      validFiles.push(file);
    }

    if (skippedMessages.length > 0) {
      toast({
        title: "Some files were skipped",
        description: skippedMessages.join("\n"),
        variant: "destructive",
      });
    }

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const uploadedMetadata: UploadedFileMetadata[] = [];

      for (const file of validFiles) {
        const normalizedMime = normalizeMime(file.type) || "application/octet-stream";
        const params = new URLSearchParams({
          fileType,
          category,
          fileName: file.name,
          fileSize: file.size.toString(),
          mimeType: normalizedMime,
        });

        const urlResponse = await fetch(`/api/upload-url?${params.toString()}`, {
          credentials: "include",
        });
        if (!urlResponse.ok) {
          const errorText = await urlResponse.text();
          throw new Error(errorText || `Failed to prepare upload for ${file.name}`);
        }

        const { uploadUrl, filePath } = await urlResponse.json();
        const uploadTarget =
          uploadUrl.startsWith("/api/local-object/upload")
            ? appendLocalUploadParams(uploadUrl, {
              category,
              name: file.name,
              size: file.size.toString(),
              mime: normalizedMime,
            })
            : uploadUrl;

        const uploadResponse = await fetch(uploadTarget, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": normalizedMime,
          },
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(errorText || `Failed to upload ${file.name}`);
        }

        uploadedMetadata.push({
          filePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: normalizedMime,
        });
      }

      const newFiles = [...uploadedFiles, ...uploadedMetadata];
      setUploadedFiles(newFiles);
      onUploadComplete(newFiles);

      toast({
        title: "Upload successful",
        description: `${uploadedMetadata.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUploadComplete(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const hasExistingFiles = uploadedFiles.length > 0;
  const buttonLabel = hasExistingFiles
    ? (uploadedFiles.length < maxFiles ? "Add More" : "Replace")
    : label;

  return (
    <div className={className}>
      <div className="space-y-2">
        {hasExistingFiles && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Documents:</label>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-md bg-card"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{file.fileName}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    data-testid={`button-view-file-${index}`}
                  >
                    <a
                      href={`/api/object-storage/view?path=${encodeURIComponent(file.filePath)}&mime=${encodeURIComponent(file.mimeType)}&filename=${encodeURIComponent(file.fileName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={hasExistingFiles ? "secondary" : isMissing ? "outline" : "outline"}
            className={isMissing ? "border-orange-400 text-orange-600 hover:text-orange-700 hover:border-orange-500" : ""}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || uploadedFiles.length >= maxFiles}
            data-testid={`button-upload-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {buttonLabel}
              </>
            )}
          </Button>
          {uploadedFiles.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {uploadedFiles.length} / {maxFiles} file(s)
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={effectiveAccept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div >
  );
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type BuildObjectUrlOptions = {
  mimeType?: string | null | undefined
  fileName?: string | null | undefined
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
}

const inferMimeType = (fileName?: string | null, fallback?: string | null) => {
  if (fallback && fallback !== "application/octet-stream") {
    return fallback
  }
  if (!fileName) return fallback ?? undefined
  const parts = fileName.split(".")
  if (parts.length < 2) return fallback ?? undefined
  const ext = parts.pop()!.toLowerCase()
  return EXTENSION_MIME_MAP[ext] ?? fallback ?? undefined
}

export function buildObjectViewUrl(filePath: string, options: BuildObjectUrlOptions = {}) {
  const params = new URLSearchParams()
  params.set("path", filePath)

  const resolvedMime = inferMimeType(options.fileName, options.mimeType ?? undefined)
  if (resolvedMime) {
    params.set("mime", resolvedMime)
  }
  if (options.fileName) {
    params.set("filename", options.fileName)
  }

  return `/api/object-storage/view?${params.toString()}`
}

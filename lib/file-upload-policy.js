import path from "node:path";

const MEGABYTE = 1024 * 1024;

export const uploadPolicies = Object.freeze({
  image: {
    maxBytes: 10 * MEGABYTE,
    mimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
    extensions: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  },
  document: {
    maxBytes: 15 * MEGABYTE,
    mimeTypes: new Set(["application/pdf"]),
    extensions: new Set([".pdf"]),
  },
  video: {
    maxBytes: 100 * MEGABYTE,
    mimeTypes: new Set(["video/mp4", "video/webm"]),
    extensions: new Set([".mp4", ".webm"]),
  },
});

export function validateUploadMetadata({ category, filename, mimeType, size }) {
  const policy = uploadPolicies[category];
  if (!policy) return { valid: false, code: "unsupported_category" };
  if (typeof filename !== "string" || !filename.trim() || filename.includes("\0")) {
    return { valid: false, code: "invalid_filename" };
  }
  if (!Number.isSafeInteger(size) || size <= 0) return { valid: false, code: "invalid_size" };
  if (size > policy.maxBytes) return { valid: false, code: "file_too_large" };

  const normalizedMime = String(mimeType || "").toLowerCase().trim();
  const extension = path.extname(filename).toLowerCase();
  if (!policy.mimeTypes.has(normalizedMime) || !policy.extensions.has(extension)) {
    return { valid: false, code: "unsupported_file_type" };
  }

  return { valid: true, code: "accepted" };
}

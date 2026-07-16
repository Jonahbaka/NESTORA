import test from "node:test";
import assert from "node:assert/strict";
import { uploadPolicies, validateUploadMetadata } from "../lib/file-upload-policy.js";

test("accepts supported upload metadata within category limits", () => {
  assert.deepEqual(validateUploadMetadata({
    category: "image",
    filename: "listing-front.webp",
    mimeType: "image/webp",
    size: 2_000_000,
  }), { valid: true, code: "accepted" });
});

test("rejects mismatched extensions even when the MIME type is allowed", () => {
  assert.deepEqual(validateUploadMetadata({
    category: "document",
    filename: "title-document.exe",
    mimeType: "application/pdf",
    size: 400_000,
  }), { valid: false, code: "unsupported_file_type" });
});

test("rejects oversized, empty and malformed uploads", () => {
  assert.equal(validateUploadMetadata({
    category: "video",
    filename: "tour.mp4",
    mimeType: "video/mp4",
    size: uploadPolicies.video.maxBytes + 1,
  }).code, "file_too_large");
  assert.equal(validateUploadMetadata({ category: "image", filename: "", mimeType: "image/png", size: 10 }).code, "invalid_filename");
  assert.equal(validateUploadMetadata({ category: "image", filename: "photo.png", mimeType: "image/png", size: 0 }).code, "invalid_size");
  assert.equal(validateUploadMetadata({ category: "archive", filename: "data.zip", mimeType: "application/zip", size: 10 }).code, "unsupported_category");
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("production object storage uses the AWS default credential chain", () => {
  const source = fs.readFileSync(path.join(root, "lib/server/object-storage.js"), "utf8");

  assert.match(source, /new S3Client/);
  assert.match(source, /ServerSideEncryption: "AES256"/);
  assert.match(source, /return Boolean\(process\.env\.NESTORA_STORAGE_BUCKET\)/);
  assert.doesNotMatch(source, /AWS_ACCESS_KEY_ID && process\.env\.AWS_SECRET_ACCESS_KEY/);
});

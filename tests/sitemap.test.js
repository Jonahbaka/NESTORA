import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("sitemap is generated at runtime and survives a listing query outage", () => {
  const source = fs.readFileSync(path.join(root, "app/sitemap.js"), "utf8");

  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /try \{[\s\S]*listPublicListings\(\{ limit: 200 \}\)[\s\S]*\} catch/);
  assert.match(source, /const routes = \["", "\/search"/);
});

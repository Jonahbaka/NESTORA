import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { hasDatabase } from "@/lib/server/db";
import { createListingMedia, listListingMedia, removeListingMedia } from "@/lib/server/media-operations";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";
import { validateUploadMetadata } from "@/lib/file-upload-policy";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!hasDatabase()) return unavailable();
  try {
    const listingId = new URL(request.url).searchParams.get("listingId") || "";
    if (!listingId || listingId.length > 160) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    const context = await getWorkspaceContext();
    return NextResponse.json({ media: await listListingMedia({ context, listingId }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "media-upload", { limit: 20, windowMs: 60_000 });
    const form = await request.formData();
    const listingId = form.get("listingId")?.toString() || "";
    const file = form.get("file");
    if (!listingId || listingId.length > 160 || !(file instanceof File)) return NextResponse.json({ error: "Choose a listing and file to upload." }, { status: 400 });
    const category = categoryForMime(file.type);
    const validation = validateUploadMetadata({ category, filename: file.name, mimeType: file.type, size: file.size });
    if (!validation.valid) return NextResponse.json({ error: uploadError(validation.code) }, { status: 400 });
    const context = await getWorkspaceContext();
    const media = await createListingMedia({ context, listingId, file, category });
    return NextResponse.json({ media }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error);
  }
}

export async function DELETE(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "media-delete", { limit: 40, windowMs: 60_000 });
    const parsed = z.uuid().safeParse(new URL(request.url).searchParams.get("id"));
    if (!parsed.success) return NextResponse.json({ error: "Media not found." }, { status: 404 });
    const context = await getWorkspaceContext();
    return NextResponse.json(await removeListingMedia({ context, mediaId: parsed.data }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = securityError(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return routeError(error);
  }
}

function categoryForMime(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "document";
  return "unsupported";
}

function uploadError(code) {
  return ({ file_too_large: "This file exceeds the allowed size.", unsupported_file_type: "This file type is not supported.", invalid_filename: "The filename is not valid.", invalid_size: "The file is empty or invalid." })[code] || "This file cannot be uploaded.";
}

function unavailable() { return NextResponse.json({ error: "Media storage is temporarily unavailable." }, { status: 503 }); }
function routeError(error) {
  const access = accessErrorResponse(error);
  if (access) return NextResponse.json({ error: access.message }, { status: access.status });
  console.error("Media operation failed", error);
  return unavailable();
}

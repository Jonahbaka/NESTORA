import { NextResponse } from "next/server";
import { accessErrorResponse } from "@/lib/server/authorization";
import { hasDatabase } from "@/lib/server/db";
import { createProfileImage, removeProfileImage } from "@/lib/server/profile-operations";
import { assertSameOrigin, rateLimit, securityError } from "@/lib/server/request-security";
import { getWorkspaceContext } from "@/lib/server/workspace-context";
import { validateUploadMetadata } from "@/lib/file-upload-policy";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "profile-media-upload", { limit: 10, windowMs: 60_000 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a profile image." }, { status: 400 });
    const validation = validateUploadMetadata({ category: "image", filename: file.name, mimeType: file.type, size: file.size });
    if (!validation.valid) return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image within the upload limit." }, { status: 400 });
    const context = await getWorkspaceContext();
    return NextResponse.json({ media: await createProfileImage({ context, file }) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request) {
  if (!hasDatabase()) return unavailable();
  try {
    assertSameOrigin(request);
    rateLimit(request, "profile-media-delete", { limit: 20, windowMs: 60_000 });
    const context = await getWorkspaceContext();
    return NextResponse.json(await removeProfileImage(context), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

function unavailable() { return NextResponse.json({ error: "Profile media is temporarily unavailable." }, { status: 503 }); }
function routeError(error) {
  const security = securityError(error);
  if (security) return NextResponse.json({ error: security.message }, { status: security.status });
  const access = accessErrorResponse(error);
  if (access) return NextResponse.json({ error: access.message }, { status: access.status });
  console.error("Profile media operation failed", error);
  return unavailable();
}

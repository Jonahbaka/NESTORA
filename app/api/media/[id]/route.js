import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { accessErrorResponse } from "@/lib/server/authorization";
import { hasDatabase } from "@/lib/server/db";
import { readMediaObject } from "@/lib/server/media-operations";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";
import { findUserById } from "@/lib/server/users";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  if (!hasDatabase()) return NextResponse.json({ error: "Media is unavailable." }, { status: 503 });
  try {
    const parsed = z.uuid().safeParse((await params).id);
    if (!parsed.success) return NextResponse.json({ error: "Media not found." }, { status: 404 });
    const store = await cookies();
    const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
    const user = session?.sub ? await findUserById(session.sub) : null;
    const media = await readMediaObject({ mediaId: parsed.data, userId: user?.status === "active" ? user.id : null });
    return new NextResponse(media.body, {
      headers: {
        "Content-Type": media.mimeType,
        "Content-Disposition": media.publicAsset ? "inline" : `attachment; filename*=UTF-8''${encodeURIComponent(media.filename)}`,
        "Cache-Control": media.publicAsset ? "public, max-age=60, s-maxage=300" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const access = accessErrorResponse(error);
    if (access) return NextResponse.json({ error: access.message }, { status: access.status });
    console.error("Media read failed", error);
    return NextResponse.json({ error: "Media is unavailable." }, { status: 503 });
  }
}

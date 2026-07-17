import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/server/db";
import { getPrivateObject } from "@/lib/server/object-storage";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";
import { findUserById } from "@/lib/server/users";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Material not found." }, { status: 404 });
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  const user = session?.sub ? await findUserById(session.sub) : null;
  if (!user || user.status !== "active") return NextResponse.json({ error: "Sign in to open this material." }, { status: 401 });
  const result = await query(
    `SELECT m.storage_key, m.external_key, m.kind, m.owner_user_id,
            EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = m.organization_id AND om.user_id = $2 AND om.status = 'active') AS member_access
     FROM marketing_materials m WHERE m.id = $1 AND m.status = 'generated' LIMIT 1`,
    [id.data, user.id],
  );
  const material = result.rows[0];
  const adminAccess = ["admin", "moderator"].includes(user.role);
  if (!material || (!adminAccess && !material.member_access && material.owner_user_id !== user.id)) return NextResponse.json({ error: "Material not found." }, { status: 404 });
  try {
    const body = await getPrivateObject(material.storage_key);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${material.external_key}.pdf"`, "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; base-uri 'none'", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Marketing material read failed", error);
    return NextResponse.json({ error: "Material is temporarily unavailable." }, { status: 503 });
  }
}

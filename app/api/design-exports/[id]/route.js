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
  if (!id.success) return NextResponse.json({ error: "Export not found." }, { status: 404 });
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  const user = session?.sub ? await findUserById(session.sub) : null;
  if (!user || user.status !== "active") return NextResponse.json({ error: "Sign in to access this export." }, { status: 401 });

  const result = await query(
    `SELECT de.id, de.storage_key, de.format, de.design_id, de.file_size_bytes,
            md.owner_user_id, md.organization_id
     FROM design_exports de
     JOIN marketing_designs md ON md.id = de.design_id
     WHERE de.id = $1
     LIMIT 1`,
    [id.data],
  );
  const exportRecord = result.rows[0];
  if (!exportRecord) return NextResponse.json({ error: "Export not found." }, { status: 404 });

  // Check access: owner, org member, or admin
  const isOwner = exportRecord.owner_user_id === user.id;
  const isAdmin = ["admin", "moderator"].includes(user.role);
  let isMember = false;
  if (exportRecord.organization_id) {
    const member = await query(
      "SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1",
      [exportRecord.organization_id, user.id],
    );
    isMember = member.rowCount > 0;
  }
  if (!isOwner && !isMember && !isAdmin) return NextResponse.json({ error: "Export not found." }, { status: 404 });

  try {
    const body = await getPrivateObject(exportRecord.storage_key);
    const contentTypes = { pdf: "application/pdf", png: "image/png", jpeg: "image/jpeg" };
    const contentType = contentTypes[exportRecord.format] || "application/octet-stream";
    const filename = `design-export-${exportRecord.id}.${exportRecord.format}`;
    const download = new URL(request.url).searchParams.get("download") === "1";

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Content-Length": String(exportRecord.file_size_bytes || body.length),
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; base-uri 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Export download failed", error);
    return NextResponse.json({ error: "Export file is temporarily unavailable." }, { status: 503 });
  }
}

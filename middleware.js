import { NextResponse } from "next/server";
import { canAccessPath } from "@/lib/access-control";
import { buildPublicUrl } from "@/lib/public-origin";

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function readSession(token, secret) {
  try {
    const [payload, provided] = token.split(".");
    if (!payload || !provided) return null;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, decodeBase64Url(provided), new TextEncoder().encode(payload));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();
  if (request.nextUrl.pathname === "/workspace") return NextResponse.next();

  const secret = process.env.NESTORA_SESSION_SECRET;
  if (!secret || secret.length < 32) return new NextResponse("Account security is not configured.", { status: 503 });

  const session = await readSession(request.cookies.get("nestora_session")?.value || "", secret);
  if (!session) {
    const login = buildPublicUrl("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (!canAccessPath(request.nextUrl.pathname, session.role)) {
    const account = buildPublicUrl("/my-nestora", request.url);
    account.searchParams.set("notice", "access");
    return NextResponse.redirect(account);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/my-nestora/:path*", "/messages/:path*", "/workspace/:path*", "/admin/:path*"] };

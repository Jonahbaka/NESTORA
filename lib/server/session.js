import crypto from "node:crypto";

export const SESSION_COOKIE = "nestora_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function secret() {
  if (process.env.NESTORA_SESSION_SECRET?.length >= 32) return process.env.NESTORA_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("NESTORA_SESSION_SECRET must contain at least 32 characters in production");
  return "nestora-local-session-secret-change-before-production";
}

function encode(value) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function signature(payload) { return crypto.createHmac("sha256", secret()).update(payload).digest("base64url"); }

export function createSessionToken(user) {
  const payload = encode({ sub: user.id, email: user.email, role: user.role || "member", name: user.name, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS });
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token) {
  try {
    if (!token || !token.includes(".")) return null;
    const [payload, provided] = token.split(".");
    if (!payload || !provided) return null;
    const expected = signature(payload);
    const left = Buffer.from(provided); const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session || typeof session.sub !== "string" || typeof session.exp !== "number") return null;
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

const buckets = globalThis.__nestoraRateBuckets || new Map();
globalThis.__nestoraRateBuckets = buckets;

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = process.env.NEXT_PUBLIC_APP_ORIGIN || new URL(request.url).origin;
  if (new URL(origin).origin !== new URL(expected).origin) throw new Error("INVALID_ORIGIN");
}

export function rateLimit(request, scope, { limit = 8, windowMs = 60_000 } = {}) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${scope}:${forwarded || request.headers.get("x-real-ip") || "local"}`;
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  existing.count += 1;
  if (existing.count > limit) throw new Error("RATE_LIMITED");
}

export function securityError(error) {
  if (error.message === "INVALID_ORIGIN") return { status: 403, message: "Request origin was not accepted." };
  if (error.message === "RATE_LIMITED") return { status: 429, message: "Too many attempts. Please wait and try again." };
  return null;
}

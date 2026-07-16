export function buildPublicUrl(pathname, requestUrl, configuredOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN) {
  for (const candidate of [configuredOrigin, requestUrl]) {
    if (!candidate) continue;
    try {
      const base = new URL(candidate);
      if (base.protocol !== "https:" && base.protocol !== "http:") continue;
      return new URL(pathname, base.origin);
    } catch {
      // Try the request URL when the configured origin is malformed.
    }
  }
  throw new Error("A valid public application origin is required.");
}

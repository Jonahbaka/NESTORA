const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalRuntime(environment = process.env) {
  if (environment.NESTORA_ENVIRONMENT !== "local") return false;
  if (!isLoopbackUrl(environment.NEXT_PUBLIC_APP_ORIGIN)) return false;
  if (environment.DATABASE_URL && !isLoopbackUrl(environment.DATABASE_URL)) return false;
  return true;
}

export function allowDemoContent(environment = process.env) {
  return isLocalRuntime(environment) && environment.NESTORA_DEMO_MODE === "true";
}

export function shouldUseSecureCookies(environment = process.env) {
  return environment.NODE_ENV === "production" && !isLocalRuntime(environment);
}

function isLoopbackUrl(value) {
  try { return loopbackHosts.has(new URL(value).hostname); }
  catch { return false; }
}

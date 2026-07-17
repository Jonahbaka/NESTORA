import { canAccessPath } from "./access-control.js";

const ROLE_DESTINATIONS = {
  member: "/my-nestora",
  agent: "/workspace/agent",
  host: "/workspace/host",
  developer: "/workspace/developer",
  agency_admin: "/workspace/agency",
  moderator: "/admin",
  admin: "/admin",
};

export function roleDestination(role) {
  return ROLE_DESTINATIONS[role] || "/my-nestora";
}

export function safeInternalPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://nestora.invalid");
    if (url.origin !== "https://nestora.invalid") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function loginDestination(role, requestedPath) {
  const safePath = safeInternalPath(requestedPath);
  if (safePath && canAccessPath(new URL(safePath, "https://nestora.invalid").pathname, role)) return safePath;
  return roleDestination(role);
}

const workspaceRoles = {
  agent: new Set(["agent", "agency_admin", "admin"]),
  host: new Set(["host", "admin"]),
  developer: new Set(["developer", "admin"]),
  agency: new Set(["agency_admin", "admin"]),
};

const adminRoles = new Set(["moderator", "admin"]);

export function requiredRolesForPath(pathname) {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return adminRoles;

  for (const [workspace, roles] of Object.entries(workspaceRoles)) {
    const path = `/workspace/${workspace}`;
    if (pathname === path || pathname.startsWith(`${path}/`)) return roles;
  }

  return null;
}

export function canAccessPath(pathname, role) {
  const required = requiredRolesForPath(pathname);
  return !required || required.has(role);
}

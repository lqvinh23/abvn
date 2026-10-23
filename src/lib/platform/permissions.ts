import type { Role } from "./types";

export function hasAdminAccess(profile: { role: Role | null; admin_access?: boolean }) {
  return profile.admin_access === true || profile.role === "admin";
}

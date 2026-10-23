import type { Profile, TeacherStatistics } from "./types";

function hasAdminAccess(member: Profile) {
  return member.admin_access === true || member.role === "admin";
}

function hasRole(member: Profile, role: string) {
  if (role === "admin") return hasAdminAccess(member);
  if (role === "guest") return member.role === null && !hasAdminAccess(member);
  return member.role === role;
}

export function directoryRows(members: Profile[], statistics: TeacherStatistics[] | null | undefined, query: Pick<URLSearchParams, "get">, allAccounts = false) {
  const search = (query.get("q") ?? "").trim().slice(0, 100).toLowerCase();
  const participation = query.get("participation");
  const membership = allAccounts ? null : query.get("status");
  const role = allAccounts ? query.get("role") : null;
  const sort = query.get("sort") || "number";
  const descending = query.get("direction") === "desc" || (!query.get("direction") && sort === "newest");
  const stats = new Map(statistics?.map(item => [item.teacher_id, item]));
  const filtered = members.filter(member => (!search || (/^\d{1,9}$/.test(search) ? member.member_number === Number(search) : member.full_name.toLowerCase().includes(search)))
    && (!participation || member.participation_status === participation)
    && (!membership || member.status === membership)
    && (!role || hasRole(member, role))
    && (!allAccounts || !participation || member.role === "teacher" || member.role === "student"));
  function value(member: Profile): string | number | null {
    switch (sort) {
      case "name": return member.full_name;
      case "newest": return member.created_at;
      case "role": return member.admin_access && member.role !== "admin" ? `${member.role}+admin` : member.role ?? "guest";
      case "membership": return member.status;
      case "participation": return allAccounts && member.role !== "teacher" && member.role !== "student" ? null : member.participation_status;
      case "country": return member.country;
      case "completed": return stats.get(member.id)?.completed_lessons ?? null;
      case "students": return stats.get(member.id)?.students_taught ?? null;
      default: return member.member_number;
    }
  }
  return filtered.toSorted((a, b) => {
    const left = value(a), right = value(b);
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""), undefined, { sensitivity: "base", numeric: true });
    return order * (descending ? -1 : 1) || a.id.localeCompare(b.id);
  });
}

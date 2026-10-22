import type { Profile, TeacherStatistics } from "./types";

export function directoryRows(members: Profile[], statistics: TeacherStatistics[] | null | undefined, query: Pick<URLSearchParams, "get">) {
  const search = (query.get("q") ?? "").trim().slice(0, 100).toLowerCase();
  const participation = query.get("participation");
  const membership = query.get("status");
  const sort = query.get("sort") || "number";
  const descending = query.get("direction") === "desc" || (!query.get("direction") && sort === "newest");
  const stats = new Map(statistics?.map(item => [item.teacher_id, item]));
  const filtered = members.filter(member => (!search || (/^\d{1,9}$/.test(search) ? member.member_number === Number(search) : member.full_name.toLowerCase().includes(search)))
    && (!participation || member.participation_status === participation)
    && (!membership || member.status === membership));
  function value(member: Profile): string | number | null {
    switch (sort) {
      case "name": return member.full_name;
      case "newest": return member.created_at;
      case "membership": return member.status;
      case "participation": return member.participation_status;
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

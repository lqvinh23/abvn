import { DateTime } from "luxon";
import type { ParticipationStatus, Profile, StudentDirectoryRow, StudentDirectoryStatistics } from "./types";

export const studentStatuses: ParticipationStatus[] = ["active", "inactive", "suspended", "banned"];
const statusOrder = new Map(studentStatuses.map((status, index) => [status, index]));
const expiringSoonDays = 30;

export type StudyPeriod = {
  joined: DateTime | null;
  expires: DateTime | null;
  expiresOn: string | null;
  state: "none" | "active" | "soon" | "expired";
  daysLeft: number | null;
};

export function studyPeriod(member: Pick<StudentDirectoryRow, "created_at" | "student_joined_at" | "study_expires_on">, now: number, timeZone: string): StudyPeriod {
  const joined = DateTime.fromISO(member.student_joined_at ?? member.created_at, { zone: timeZone });
  const expiresOn = member.study_expires_on ?? null;
  if (!expiresOn) return { joined: joined.isValid ? joined : null, expires: null, expiresOn: null, state: "none", daysLeft: null };
  const today = DateTime.fromMillis(now, { zone: timeZone }).startOf("day");
  const expires = DateTime.fromISO(expiresOn, { zone: timeZone }).startOf("day");
  const daysLeft = Math.round(expires.diff(today, "days").days);
  return {
    joined: joined.isValid ? joined : null,
    expires: expires.isValid ? expires : null,
    expiresOn,
    daysLeft,
    state: daysLeft < 0 ? "expired" : daysLeft <= expiringSoonDays ? "soon" : "active",
  };
}

export function joinedYears(members: Pick<StudentDirectoryRow, "created_at" | "student_joined_at">[], timeZone: string) {
  const years = new Set<number>();
  for (const member of members) {
    const joined = DateTime.fromISO(member.student_joined_at ?? member.created_at, { zone: timeZone });
    if (joined.isValid) years.add(joined.year);
  }
  return [...years].sort((a, b) => b - a);
}

export function studentRowsFromProfiles(members: Profile[], statistics: StudentDirectoryStatistics[] | null): StudentDirectoryRow[] {
  const stats = new Map(statistics?.map(item => [item.student_id, item]));
  return members.map(member => {
    const item = stats.get(member.id);
    return {
      member_code: member.member_code, member_number: member.member_number, full_name: member.full_name, email: member.email,
      participation_status: member.participation_status, country: member.country, city: member.city ?? "", proficiency: member.proficiency,
      created_at: member.created_at, student_joined_at: member.student_joined_at ?? null, study_expires_on: member.study_expires_on ?? null,
      attended_total: item?.attended_total ?? null, attended_1w: item?.attended_1w ?? null, attended_4w: item?.attended_4w ?? null,
      absent: item?.absent ?? null, apologized: item?.apologized ?? null,
    };
  });
}

function address(member: Pick<StudentDirectoryRow, "city" | "country">) {
  return (member.city ?? "").trim() || member.country.trim();
}

export function studentDirectoryRows(members: StudentDirectoryRow[], query: Pick<URLSearchParams, "get">, timeZone: string) {
  const search = (query.get("q") ?? "").trim().slice(0, 100).toLowerCase();
  const status = studentStatuses.find(value => value === query.get("participation"));
  const month = /^(?:[1-9]|1[0-2])$/.test(query.get("month") ?? "") ? Number(query.get("month")) : null;
  const year = /^\d{4}$/.test(query.get("year") ?? "") ? Number(query.get("year")) : null;
  const sort = query.get("sort") || "number";
  const descending = query.get("direction") === "desc" || (!query.get("direction") && sort === "joined");
  const joinedAt = (member: StudentDirectoryRow) => DateTime.fromISO(member.student_joined_at ?? member.created_at, { zone: timeZone });

  const matches = (member: StudentDirectoryRow) => {
    if (search) {
      const numeric = /^\d{1,9}$/.test(search);
      const found = numeric
        ? member.member_number === Number(search)
        : member.full_name.toLowerCase().includes(search) || (member.email ?? "").toLowerCase().includes(search) || member.member_code.toLowerCase().includes(search);
      if (!found) return false;
    }
    if (status && member.participation_status !== status) return false;
    if (month !== null || year !== null) {
      const joined = joinedAt(member);
      if (!joined.isValid || (month !== null && joined.month !== month) || (year !== null && joined.year !== year)) return false;
    }
    return true;
  };

  function value(member: StudentDirectoryRow): string | number | null {
    switch (sort) {
      case "name": return member.full_name;
      case "status": return statusOrder.get(member.participation_status) ?? studentStatuses.length;
      case "absent": return member.absent === null ? null : member.absent + (member.apologized ?? 0);
      case "total": return member.attended_total;
      case "address": return address(member) || null;
      case "joined": return joinedAt(member).toMillis();
      default: return member.member_number;
    }
  }

  return members.filter(matches).toSorted((a, b) => {
    const left = value(a), right = value(b);
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    const order = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left ?? "").localeCompare(String(right ?? ""), undefined, { sensitivity: "base", numeric: true });
    return order * (descending ? -1 : 1) || a.member_code.localeCompare(b.member_code);
  });
}

export function studentAddress(member: Pick<Profile, "city" | "country">) {
  return [(member.city ?? "").trim(), member.country.trim()].filter(Boolean).join(", ");
}

const milestoneTargets = [1, 5, 10, 25, 50, 100];

export function studentMilestones(attended: number, reached: { count: number; reached_at: string }[]) {
  const dates = new Map(reached.map(item => [item.count, item.reached_at]));
  const items = milestoneTargets.map(count => ({
    count,
    label: count === 1 ? "First lesson attended" : `${count} lessons attended`,
    reachedAt: dates.get(count) ?? (attended >= count ? "" : null),
  }));
  const next = items.find(item => item.reachedAt === null) ?? null;
  return { items, next, remaining: next ? next.count - attended : 0 };
}

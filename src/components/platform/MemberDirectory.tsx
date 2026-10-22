"use client";

import { useSearchParams } from "next/navigation";
import type { ParticipationStatus, Profile, TeacherStatistics } from "@/src/lib/platform/types";
import { directoryRows } from "@/src/lib/platform/directory-table";
import { tablePage } from "@/src/lib/platform/table-pagination";
import AutoFilters from "./AutoFilters";
import { Field, Select } from "./Fields";
import MemberManagementTable from "./MemberManagementTable";
import TablePagination from "./TablePagination";

export default function MemberDirectory({ members, teacherStatistics, timeZone, view, section, participationOptions }: {
  members: Profile[]; teacherStatistics?: TeacherStatistics[] | null; timeZone: string; view: string; section: string; participationOptions: ParticipationStatus[];
}) {
  const query = useSearchParams();
  const teacherDirectory = teacherStatistics !== undefined;
  const sort = query.get("sort") || "number";
  const direction = query.get("direction") || (sort === "newest" ? "desc" : "asc");
  const size = [10,25,50,100].find(value => String(value) === query.get("size")) ?? 10;
  const filtered = directoryRows(members, teacherStatistics, { get: key => teacherDirectory && key === "status" ? null : query.get(key) });
  const pagination = tablePage(filtered.length, Number(query.get("page")) || 1, size);
  const base = `/dashboard/admin?view=${view}&section=${section}`;
  const params = new URLSearchParams(query);
  params.delete("page"); params.delete("size");
  return <div className="workspace-stack">
    <AutoFilters local label={teacherDirectory ? "Teacher directory filters" : "Account filters"} clearHref={`${base}&size=${size}&sort=${sort}&direction=${direction}`}>
      <input type="hidden" name="view" value={view} /><input type="hidden" name="section" value={section} /><input type="hidden" name="size" value={size} />
      <Field compact label={teacherDirectory ? "Search teachers" : "Search accounts"} type="search" name="q" placeholder="Name or member ID" defaultValue={query.get("q") ?? ""} maxLength={100} />
      {!teacherDirectory ? <Select compact label="Membership status" name="status" defaultValue={query.get("status") ?? ""}><option value="">All memberships</option>{["pending","approved","suspended","rejected"].map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select> : null}
      <Select compact label={teacherDirectory ? "Teaching status" : view === "students" ? "Study status" : "Participation status"} name="participation" defaultValue={query.get("participation") ?? ""}><option value="">All statuses</option>{participationOptions.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select>
    </AutoFilters>
    {teacherStatistics === null ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Apply migration 015 to show teacher statistics. Missing statistics are not displayed as zero.</p> : null}
    <MemberManagementTable members={filtered.slice(pagination.start, pagination.end)} timeZone={timeZone} teacherStatistics={teacherStatistics} serverPaginated localSort />
    <TablePagination local label="Account pages" total={filtered.length} page={pagination.page} pageSize={size} href={`/dashboard/admin?${params}`} />
  </div>;
}

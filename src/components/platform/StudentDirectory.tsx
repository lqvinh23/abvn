"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { StudentDirectoryRow } from "@/src/lib/platform/types";
import { joinedYears, studentAddress, studentDirectoryRows, studentStatuses, studyPeriod } from "@/src/lib/platform/student-directory";
import { tablePage } from "@/src/lib/platform/table-pagination";
import ActionIcon from "./ActionIcon";
import AutoFilters from "./AutoFilters";
import { Field, Select } from "./Fields";
import PaginatedTable from "./PaginatedTable";
import SortHeader from "./SortHeader";
import TablePagination from "./TablePagination";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const statusClass: Record<string, string> = {
  active: "bg-green-50 text-green-900",
  inactive: "bg-slate-100 text-slate-700",
  suspended: "bg-amber-50 text-amber-900",
  banned: "bg-rose-50 text-rose-900",
};
const baseColumns = [
  { label: "ID", sort: "number" },
  { label: "Name / email", sort: "name" },
  { label: "Student status / Absent", sort: "status" },
  { label: "Total / 1w / 4w", sort: "total" },
  { label: "Address / level", sort: "address" },
  { label: "Joined / Expired", sort: "joined" },
];

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

export default function StudentDirectory({ members, timeZone, now, role, statisticsMissing = false }: {
  members: StudentDirectoryRow[]; timeZone: string; now: number; role: "admin" | "teacher"; statisticsMissing?: boolean;
}) {
  const readOnly = role === "teacher";
  const base = readOnly ? "/dashboard/teacher?view=students" : "/dashboard/admin?view=students&section=directory";
  const profileBase = `/dashboard/${role}/students`;
  const columns = readOnly ? baseColumns : [...baseColumns, { label: "Actions", sort: null as string | null }];
  const routeQuery = useSearchParams();
  const query = new URLSearchParams(routeQuery);
  if (readOnly && !routeQuery.has("participation")) query.set("participation", "");
  const sort = query.get("sort") || "number";
  const direction = query.get("direction") || (sort === "joined" ? "desc" : "asc");
  const size = [10, 25, 50, 100].find(value => String(value) === query.get("size")) ?? 10;
  const filtered = studentDirectoryRows(members, query, timeZone);
  const pagination = tablePage(filtered.length, Number(query.get("page")) || 1, size);
  const years = joinedYears(members, timeZone);
  const params = new URLSearchParams(query);
  params.delete("page"); params.delete("size");
  return <div className="workspace-stack">
    <AutoFilters local label="Student directory filters" clearHref={`${base}&size=${size}&sort=${sort}&direction=${direction}`}>
      <input type="hidden" name="view" value="students" />{readOnly ? null : <input type="hidden" name="section" value="directory" />}<input type="hidden" name="size" value={size} />
      <Field compact label="Search students" type="search" name="q" placeholder="Name, email or ID" defaultValue={query.get("q") ?? ""} maxLength={100} />
      <Select compact label="Student status" name="participation" defaultValue={query.get("participation") ?? ""}><option value="">All statuses</option>{studentStatuses.map(value => <option key={value} value={value}>{capitalize(value)}</option>)}</Select>
      <Select compact label="Joined month" name="month" defaultValue={query.get("month") ?? ""}><option value="">All months</option>{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</Select>
      <Select compact label="Joined year" name="year" defaultValue={query.get("year") ?? ""}><option value="">All years</option>{years.map(year => <option key={year} value={year}>{year}</option>)}</Select>
    </AutoFilters>
    {statisticsMissing ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Apply migration 202610240025_student_directory.sql to show student lesson statistics. Missing statistics are not displayed as zero.</p> : null}
    <div role="region" aria-label="Student directory table" className="workspace-stack min-h-0">
      <PaginatedTable paginate={false} caption="Student directory" columns={columns.length} tableClassName="min-w-[900px]" resetKey={filtered.map(member => member.member_code).join(",")} headers={<tr>{columns.map(column => column.sort
        ? <SortHeader key={column.label} local column={column.sort} defaultDirection={column.sort === "joined" ? "desc" : "asc"}>{column.label}</SortHeader>
        : <th key={column.label} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">{column.label}</th>)}</tr>}>
        {filtered.slice(pagination.start, pagination.end).map(member => {
          const period = studyPeriod(member, now, timeZone);
          const missing = <span className="text-xs text-slate-500">Not available</span>;
          const address = studentAddress(member);
          const profileHref = `${profileBase}/${member.member_code}`;
          return <tr key={member.member_code} className="align-top hover:bg-slate-50/70">
            <td className="px-3 py-3 font-semibold tabular-nums">{member.member_number ?? <span className="font-normal text-slate-500">Pending</span>}</td>
            <th scope="row" className="max-w-xs px-3 py-3 font-normal"><Link href={profileHref} className="font-semibold text-slate-900 hover:text-green-900 hover:underline">{member.full_name}</Link>{member.email ? <p className="mt-0.5 break-all text-slate-500">{member.email}</p> : null}</th>
            <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClass[member.participation_status] ?? statusClass.inactive}`}>{member.participation_status}</span><p className="mt-1 tabular-nums text-slate-700" title="Absent with apology / Absent">{member.absent !== null ? `${member.apologized ?? 0} / ${member.absent}` : missing}</p></td>
            <td className="whitespace-nowrap px-3 py-3 tabular-nums">{member.attended_total !== null ? <><span className="font-semibold text-slate-900">{member.attended_total}</span> / {member.attended_1w} / {member.attended_4w}</> : missing}</td>
            <td className="px-3 py-3"><p>{address || <span className="text-slate-500">Not provided</span>}</p><p className="mt-0.5 text-slate-500">{member.proficiency || "-"}</p></td>
            <td className="whitespace-nowrap px-3 py-3 tabular-nums"><p>{period.joined?.toFormat("dd/MM/yyyy") ?? "-"}</p><p className={`mt-0.5 ${period.state === "expired" ? "font-semibold text-rose-800" : period.state === "soon" ? "font-semibold text-amber-800" : "text-slate-500"}`}>{period.expires?.toFormat("dd/MM/yyyy") ?? "-"}</p></td>
            {readOnly ? null : <td className="px-3 py-3"><div className="flex gap-2">
              <Link className="workspace-icon-action" title={`Edit ${member.full_name}`} aria-label={`Edit ${member.full_name}`} href={`${profileHref}/edit`}><ActionIcon name="edit" /></Link>
              <Link className="workspace-icon-action" title={`View ${member.full_name}'s profile`} aria-label={`View ${member.full_name}'s profile`} href={profileHref}><ActionIcon name="eye" /></Link>
            </div></td>}
          </tr>;
        })}
      </PaginatedTable>
    </div>
    <TablePagination local label="Student pages" total={filtered.length} page={pagination.page} pageSize={size} href={`${readOnly ? "/dashboard/teacher" : "/dashboard/admin"}?${params}`} />
  </div>;
}

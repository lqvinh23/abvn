"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { RecruitmentApplication, RecruitmentRole } from "@/src/lib/platform/types";
import { recruitmentStatusLabels, recruitmentStatuses } from "@/src/lib/platform/recruitment";
import { formatLessonTime } from "@/src/lib/platform/scheduling";
import { tablePage } from "@/src/lib/platform/table-pagination";
import AutoFilters from "../platform/AutoFilters";
import { Field, Select } from "../platform/Fields";
import SortHeader from "../platform/SortHeader";
import TablePagination from "../platform/TablePagination";
import ActionIcon from "../platform/ActionIcon";

type ApplicationSummary = Pick<RecruitmentApplication, "id" | "full_name" | "email" | "country" | "weekly_hours" | "created_at" | "status">;

export default function ApplicationsTable({ applications, role, timeZone }: { applications: ApplicationSummary[]; role: RecruitmentRole; timeZone: string }) {
  const query = useSearchParams();
  const q = (query.get("q") ?? "").trim().toLowerCase();
  const status = query.get("status") ?? "";
  const sort = (["full_name","country","created_at","status"] as const).find(value => value === query.get("sort")) ?? "created_at";
  const direction = query.get("direction") || "desc";
  const filtered = applications.filter(app => (!q || app.full_name.toLowerCase().includes(q)) && (!status || app.status === status)).toSorted((a, b) =>
    a[sort].localeCompare(b[sort], undefined, { sensitivity: "base", numeric: true }) * (direction === "desc" ? -1 : 1) || a.id.localeCompare(b.id));
  const size = [10,25,50,100].find(value => String(value) === query.get("size")) ?? 10;
  const page = tablePage(filtered.length, Number(query.get("page")) || 1, size);
  const view = role === "teacher" ? "teachers" : "students";
  const base = `/dashboard/admin?view=${view}&section=recruitment`;
  const params = new URLSearchParams(query);
  params.delete("page"); params.delete("size"); params.delete("application");
  return <div className="workspace-stack">
    <AutoFilters local label="Applicant filters" clearHref={`${base}&tab=applications&size=${size}&sort=${sort}&direction=${direction}`}>
      <input type="hidden" name="view" value={view} /><input type="hidden" name="section" value="recruitment" /><input type="hidden" name="tab" value="applications" /><input type="hidden" name="size" value={size} />
      <Field compact label="Search applicants" type="search" name="q" placeholder="Applicant name" defaultValue={q} maxLength={100} />
      <Select compact label="Stage" name="status" defaultValue={status}><option value="">All stages</option>{recruitmentStatuses.map(value => <option key={value} value={value}>{recruitmentStatusLabels[value]}</option>)}</Select>
    </AutoFilters>
    <div className="workspace-table">
      <div role="region" aria-label={`${role} applications`} tabIndex={0} className="workspace-table-scroll rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm"><caption className="sr-only">{role} applications</caption><thead className="bg-slate-50 text-slate-600"><tr>
          {[["Applicant","full_name"],["Country / hours","country"],["Submitted","created_at"],["Current stage","status"]].map(([label,column]) => <SortHeader local key={column} column={column} defaultColumn="created_at" defaultDirection="desc">{label}</SortHeader>)}<th scope="col">Actions</th>
        </tr></thead><tbody className="divide-y divide-slate-100">{filtered.slice(page.start, page.end).map(application => <tr key={application.id}>
          <th scope="row" data-label="Applicant" className="font-medium">{application.full_name}<span className="mt-1 block text-xs font-normal text-slate-500">{application.email}</span></th>
          <td data-label="Country / hours">{application.country}<span className="mt-1 block text-xs text-slate-500">{application.weekly_hours} h/week</span></td>
          <td data-label="Submitted">{formatLessonTime(application.created_at, timeZone)}</td><td data-label="Current stage"><span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">{recruitmentStatusLabels[application.status]}</span></td>
          <td data-label="Actions"><Link className="workspace-icon-action" title={`Review ${application.full_name}`} aria-label={`Review ${application.full_name}`} href={`${base}&application=${application.id}`}><ActionIcon name="eye" /></Link></td>
        </tr>)}{!filtered.length ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">No matching applications.</td></tr> : null}</tbody></table>
      </div>
      <TablePagination local label={`${role} applications pagination`} total={filtered.length} page={page.page} pageSize={size} href={`/dashboard/admin?${params}`} />
    </div>
  </div>;
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { RecruitmentApplication, RecruitmentRole, StudentRecruitmentCampaign } from "@/src/lib/platform/types";
import { applicationBirthDateSummary, campaignSelection, campaignTimeZone, recruitmentStatusLabels, recruitmentStatuses, studentApplicationDecision } from "@/src/lib/platform/recruitment";
import { formatLessonTime } from "@/src/lib/platform/scheduling";
import type { StudentApplicationReview } from "@/src/lib/platform/types";
import { tablePage } from "@/src/lib/platform/table-pagination";
import AutoFilters from "../platform/AutoFilters";
import { Field, Select } from "../platform/Fields";
import SortHeader from "../platform/SortHeader";
import TablePagination from "../platform/TablePagination";
import ActionIcon from "../platform/ActionIcon";

type ApplicationSummary = Pick<RecruitmentApplication, "id" | "full_name" | "email" | "city" | "country" | "date_of_birth" | "weekly_hours" | "created_at" | "status" | "campaign_id">;

export default function ApplicationsTable({ applications, role, timeZone, campaigns = [], campaignsMissing = false, now, studentReviews = [], reviewsAvailable = false }: { applications: ApplicationSummary[]; role: RecruitmentRole; timeZone: string; campaigns?: StudentRecruitmentCampaign[]; campaignsMissing?: boolean; now: number; studentReviews?: Pick<StudentApplicationReview, "application_id" | "round" | "decision">[]; reviewsAvailable?: boolean }) {
  const query = useSearchParams();
  const q = (query.get("q") ?? "").trim().toLowerCase();
  const status = query.get("status") ?? "";
  const decisionFilter = query.get("decision") ?? "";
  const selectedCampaign = role === "student" ? campaignSelection(campaigns, query.get("campaign")) : "";
  const reviewsByApplication = new Map<string, Pick<StudentApplicationReview, "round" | "decision">[]>();
  for (const review of studentReviews) reviewsByApplication.set(review.application_id, [...(reviewsByApplication.get(review.application_id) ?? []), review]);
  const decisionFor = (app: ApplicationSummary) => studentApplicationDecision(app.status, reviewsByApplication.get(app.id) ?? [], reviewsAvailable);
  const campaignMatches = (app: ApplicationSummary) => {
    if (role !== "student") return true;
    if (selectedCampaign === "unassigned" ? !!app.campaign_id : selectedCampaign && app.campaign_id !== selectedCampaign) return false;
    return true;
  };
  const sort = (["full_name","country","created_at","status"] as const).find(value => value === query.get("sort")) ?? "created_at";
  const direction = query.get("direction") || "desc";
  const filtered = applications.filter(app => campaignMatches(app) && (!q || app.full_name.toLowerCase().includes(q) || app.email.toLowerCase().includes(q)) && (!status || app.status === status) && (role !== "student" || !decisionFilter || decisionFor(app).decision === decisionFilter)).toSorted((a, b) =>
    a[sort].localeCompare(b[sort], undefined, { sensitivity: "base", numeric: true }) * (direction === "desc" ? -1 : 1) || a.id.localeCompare(b.id));
  const size = [10,25,50,100].find(value => String(value) === query.get("size")) ?? 10;
  const page = tablePage(filtered.length, Number(query.get("page")) || 1, size);
  const view = role === "teacher" ? "teachers" : "students";
  const base = `/dashboard/admin?view=${view}&section=recruitment`;
  const params = new URLSearchParams(query);
  params.delete("page"); params.delete("size"); params.delete("application");
  const applicationHref = (id: string) => {
    const detailParams = new URLSearchParams(query);
    detailParams.set("view", view);
    detailParams.set("section", "recruitment");
    detailParams.set("tab", "applications");
    detailParams.set("application", id);
    return `/dashboard/admin?${detailParams}`;
  };
  return <div className={role === "student" ? "workspace-stack student-recruitment-applications" : "workspace-stack"}>
    {campaignsMissing ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">Apply campaign migrations 031 through 202610250033_student_campaign_due_dates.sql in order to enable campaign filters. Run only migrations not yet applied. Existing applications are shown below.</p> : null}
    <AutoFilters local label="Applicant filters" clearHref={`${base}&tab=applications&size=${size}&sort=${sort}&direction=${direction}`}>
      <input type="hidden" name="view" value={view} /><input type="hidden" name="section" value="recruitment" /><input type="hidden" name="tab" value="applications" /><input type="hidden" name="size" value={size} />
      <Field compact label="Search applicants" type="search" name="q" placeholder="Name or email" defaultValue={q} maxLength={100} />
      {role === "student" && !campaignsMissing ? <>
        <Select compact label="Campaign" name="campaign" defaultValue={selectedCampaign}><option value="">All campaigns</option><option value="unassigned">Unassigned</option>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</Select>
      </> : null}
      {role === "student" ? <Select compact label="Decision" name="decision" defaultValue={decisionFilter}><option value="">All decisions</option><option value="pending">Not decided</option><option value="pass">Pass</option><option value="fail">Fail</option>{!reviewsAvailable ? <option value="unavailable">Review unavailable</option> : null}</Select> : null}
      <Select compact label="Stage" name="status" defaultValue={status}><option value="">All stages</option>{recruitmentStatuses.map(value => <option key={value} value={value}>{recruitmentStatusLabels[value]}</option>)}</Select>
    </AutoFilters>
    {role === "student" && !reviewsAvailable ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Apply migration 202610250036_campaign_round_decisions.sql after migration 035 to view saved review decisions. Published outcomes are shown from application stages.</p> : null}
    <div className="workspace-table">
      <div role="region" aria-label={`${role} applications`} tabIndex={0} className="workspace-table-scroll rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm"><caption className="sr-only">{role} applications</caption><thead className="bg-slate-50 text-slate-600"><tr>
          <th scope="col">No.</th>{[["Applicant","full_name"],[role === "student" ? "DOB (Age) / Address" : "Country / hours","country"],[role === "student" ? "Submitted (UTC+7)" : "Submitted","created_at"],[role === "student" ? "Stage" : "Current stage","status"]].map(([label,column]) => <SortHeader local key={column} column={column} defaultColumn="created_at" defaultDirection="desc">{label}</SortHeader>)}{role === "student" ? <th scope="col">Decision</th> : <th scope="col">Actions</th>}
        </tr></thead><tbody className="divide-y divide-slate-100">{filtered.slice(page.start, page.end).map((application, index) => <tr key={application.id}>
          <td data-label="No.">{page.start + index + 1}</td>
          <th scope="row" data-label="Applicant" className="font-medium"><Link className="block leading-6 text-green-900 underline-offset-4 hover:underline focus-visible:underline" href={applicationHref(application.id)}>{application.full_name}</Link><span className="mt-1 block text-sm leading-6 font-normal text-slate-700">{application.email}</span></th>
          {role === "student" ? <td data-label="DOB (Age) / Address" className="space-y-1 text-sm leading-6 text-slate-700"><span className="block">{applicationBirthDateSummary(application.date_of_birth, now)}</span><span className="block">{[application.city, application.country].filter(Boolean).join(", ") || "Address not provided"}</span></td> : <td data-label="Country / hours">{application.country}{application.weekly_hours !== null ? <span className="mt-1 block text-xs text-slate-500">{application.weekly_hours} h/week</span> : null}</td>}
          <td data-label={role === "student" ? "Submitted (UTC+7)" : "Submitted"}>{formatLessonTime(application.created_at, role === "student" ? campaignTimeZone : timeZone, role !== "student")}</td><td data-label={role === "student" ? "Stage" : "Current stage"}><span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">{recruitmentStatusLabels[application.status]}</span></td>
          {role === "student" ? <td data-label="Decision">{(() => { const result = decisionFor(application); const label = result.decision === "unavailable" ? "Unavailable" : result.decision === "pending" ? "Not decided" : result.decision === "pass" ? "Pass" : "Fail"; const color = result.decision === "pass" ? "bg-green-100 text-green-900" : result.decision === "fail" ? "bg-red-100 text-red-900" : result.decision === "unavailable" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"; return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${color}`}>{result.round === "application" ? "Application" : "Interview"}: {label}</span>; })()}</td> : null}
          {role === "teacher" ? <td data-label="Actions"><Link className="workspace-icon-action" title={`Review ${application.full_name}`} aria-label={`Review ${application.full_name}`} href={applicationHref(application.id)}><ActionIcon name="eye" /></Link></td> : null}
        </tr>)}{!filtered.length ? <tr><td colSpan={6} className="p-6 text-center text-slate-500">No matching applications.</td></tr> : null}</tbody></table>
      </div>
      <TablePagination local label={`${role} applications pagination`} total={filtered.length} page={page.page} pageSize={size} href={`/dashboard/admin?${params}`} />
    </div>
  </div>;
}

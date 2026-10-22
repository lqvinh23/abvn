import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Children, type ComponentProps, type ReactNode } from "react";
import { requireMember } from "@/src/lib/platform/auth";
import type { RecruitmentRole, RecruitmentQuestion } from "@/src/lib/platform/types";
import { recruitmentStatuses, recruitmentStatusLabels } from "@/src/lib/platform/recruitment";
import { formatLessonTime } from "@/src/lib/platform/scheduling";
import { cancelInterviewSlot, createInterviewSlot, recordInterviewResult, reopenApplication, reviewApplication, saveQuestion } from "@/src/app/recruitment/actions";
import PlatformActionForm from "../platform/ActionForm";
import { Field, Select, TextArea } from "../platform/Fields";
import TablePagination from "../platform/TablePagination";
import PaginatedTable from "../platform/PaginatedTable";
import { loadTablePage, tablePage, tablePageHref } from "@/src/lib/platform/table-pagination";

const panel = "rounded-xl border border-slate-200 bg-white p-4 sm:p-5";
const link = "inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 [&[aria-current]]:border-green-700 [&[aria-current]]:bg-green-50 [&[aria-current]]:text-green-900";
type Query = { [key: string]: string | string[] | undefined };

function ActionForm(props: ComponentProps<typeof PlatformActionForm>) {
  return <PlatformActionForm {...props} preserveOnError />;
}

export function ManagementTabs({ view, section }: { view: string; section: string }) {
  return <nav aria-label="Management sections" className="mb-5 flex flex-wrap gap-2">
    {(view === "settings" ? [["accounts", "All accounts"], ["guests", "Guests"]] : [["directory", "Directory"], ["recruitment", "Recruitment"]]).map(([value, label]) => <Link key={value} aria-current={section === value ? "page" : undefined} className={`${link} ${section === value ? "border-green-700 bg-green-50 text-green-900" : ""}`} href={`/dashboard/admin?view=${view}&section=${value}`}>{label}</Link>)}
  </nav>;
}

function Table({ headers, children, caption, count, page, size, query }: { headers: string[]; children: ReactNode; caption: string; count: number; page: number; size: number; query: Query }) {
  const hasRows = Children.count(children) > 0;
  const params = new URLSearchParams();
  for (const key of ["view", "section", "tab", "status", "q"]) if (typeof query[key] === "string") params.set(key, query[key]);
  const href = `/dashboard/admin?${params}`;
  const pagination = tablePage(count, page, size);
  if (pagination.page !== page) redirect(tablePageHref(href, pagination.page, size));
  return <div className="min-w-0">
    <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto rounded-xl border border-slate-200 focus-visible:outline-2 focus-visible:outline-green-700">
      <table className="w-full min-w-[700px] text-left text-sm"><caption className="sr-only">{caption}</caption><thead className="bg-slate-50 text-slate-600"><tr>{headers.map(header => <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white">{hasRows ? children : <tr><td colSpan={headers.length} className="p-6 text-center text-slate-500">No matching records on this page.</td></tr>}</tbody></table>
    </div>
    <TablePagination label={`${caption} pagination`} total={count} page={page} pageSize={size} href={href} />
  </div>;
}

function QuestionEditor({ role, question }: { role: RecruitmentRole; question?: RecruitmentQuestion }) {
  return <ActionForm key={question?.id ?? "new"} action={saveQuestion} submitLabel={question ? "Save question" : "Add question"} className={panel}>
    <h3 className="font-semibold">{question ? "Edit question" : "Add a question"}</h3>
    <input type="hidden" name="role" value={role} />
    <input type="hidden" name="id" value={question?.id ?? ""} />
    <Field compact label="Question" name="label" defaultValue={question?.label} maxLength={300} required />
    <Field compact label="Help text (optional)" name="help_text" defaultValue={question?.help_text} maxLength={500} />
    <div className="grid gap-4 sm:grid-cols-2">
      <Select compact label="Answer type" name="field_type" defaultValue={question?.field_type ?? "long_text"} required>{Object.entries({ short_text: "Short text", long_text: "Long text", select: "Dropdown", boolean: "Yes / No", number: "Whole number", url: "HTTPS link" }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
      <Field compact label="Display order (0-1000)" name="position" type="number" min={0} max={1000} defaultValue={question?.position ?? 10} required />
    </div>
    <TextArea label="Dropdown options (one per line; only used for Dropdown)" name="options" rows={3} maxLength={4020} defaultValue={question?.options.join("\n")} />
    <div className="flex flex-wrap gap-5 text-sm"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="required" defaultChecked={question?.required ?? true} />Required answer</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="active" defaultChecked={question?.active ?? true} />Include in application form</label></div>
    <p className="text-xs leading-5 text-slate-500">Uncheck &quot;Include in application form&quot; to remove a question. Submitted applications retain their original questions and answers.</p>
  </ActionForm>;
}

export default async function AdminRecruitment({ role, query }: { role: RecruitmentRole; query: Query }) {
  const { supabase, profile, requestTime } = await requireMember("admin");
  const availability = await supabase.rpc("recruitment_workflow_version");
  if (availability.error && ["42883", "PGRST202"].includes(availability.error.code))
    return <section className={panel}><h2 className="text-xl font-semibold">Enable recruitment</h2><p role="alert" className="mt-3 leading-7">Run 202610220013_recruitment.sql, then 202610220014_recruitment_workflow.sql once in Supabase SQL Editor after the earlier migrations, then refresh. If 013 is already applied, run only 014. This adds the recruitment forms, private document bucket and interview workflow without replacing existing accounts or lessons.</p><Link href="/apply" className={`${link} mt-4`}>View applicant page</Link></section>;
  if (availability.error) { console.error("Recruitment availability check failed:", availability.error.code); throw new Error("Recruitment could not be loaded. Please try again."); }
  const view = role === "teacher" ? "teachers" : "students";
  const tab = query.tab === "questions" || query.tab === "interviews" ? query.tab : "applications";
  const base = `/dashboard/admin?view=${view}&section=recruitment`;
  const size = [10, 25, 50, 100].find(value => String(value) === query.size) ?? 10;
  const page = typeof query.page === "string" && /^\d{1,6}$/.test(query.page) ? Math.max(1, Number(query.page)) : 1;
  const tableProps = { page, size, query: { ...query, view, section: "recruitment", tab } };
  const listHref = `${base}&${new URLSearchParams({ tab, status: typeof query.status === "string" ? query.status : "", q: typeof query.q === "string" ? query.q : "" })}`;
  const outOfRange = (lastPage: number) => redirect(tablePageHref(listHref, lastPage, size));
  const check = (error: { code?: string } | null) => {
    if (error) { console.error("Admin recruitment load failed:", error.code); throw new Error("Recruitment could not be loaded. Check recruitment migrations 013 and 014, then refresh or contact support."); }
  };
  const id = typeof query.application === "string" && /^[0-9a-f-]{36}$/i.test(query.application) ? query.application : null;
  let body: ReactNode;
  if (id) {
    const applicationResponse = await supabase.from("recruitment_applications").select("*").eq("id", id).eq("role", role).maybeSingle();
    check(applicationResponse.error);
    const application = applicationResponse.data;
    if (!application) notFound();
    const [feedback, slots] = await Promise.all([
      supabase.from("recruitment_feedback").select("*").eq("application_id", id).order("created_at", { ascending: false }),
      supabase.from("interview_slots").select("*").eq("application_id", id).eq("status", "booked").maybeSingle(),
    ]);
    check(feedback.error); check(slots.error);
    const photo = application.photo_path ? await supabase.storage.from("avatars").createSignedUrl(application.photo_path, 600) : null;
    const cv = application.cv_path ? await supabase.storage.from("recruitment-documents").createSignedUrl(application.cv_path, 600, { download: true }) : null;
    if (photo?.error) console.error("Recruitment photo signing failed:", photo.error.name);
    if (cv?.error) console.error("Recruitment document signing failed:", cv.error.name);
    const interviewEnded = slots.data && Date.parse(slots.data.ends_at) <= requestTime;
    body = <div className="space-y-5">
      <Link className={link} href={base}>Back to applications</Link>
      <section className={panel}>
        <div className="flex flex-wrap items-start gap-5">{photo?.data?.signedUrl ? <Image unoptimized src={photo.data.signedUrl} alt={`${application.full_name}'s application photo`} width={96} height={96} className="size-24 rounded-xl object-cover" /> : null}<div><h2 className="text-xl font-semibold">{application.full_name}</h2><p className="mt-1 break-all text-sm text-slate-500">{application.email} · {application.phone}</p><span className="mt-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-900">{recruitmentStatusLabels[application.status]}</span></div></div>
        <dl className="my-5 grid gap-4 text-sm sm:grid-cols-2">{Object.entries({ Country: application.country, "Time zone": application.time_zone, "Date of birth": application.date_of_birth ?? "Not provided", "Hours per week": application.weekly_hours, Submitted: formatLessonTime(application.created_at, profile.time_zone) }).map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
        <p className="whitespace-pre-wrap text-sm leading-7">{application.intro}</p>
        <div className="mt-4 flex flex-wrap gap-3">{cv?.data?.signedUrl ? <a className={link} href={cv.data.signedUrl}>Download private document (10-minute link)</a> : null}{application.intro_video_url ? <a className={link} href={application.intro_video_url} target="_blank" rel="noopener noreferrer">Introduction video</a> : null}</div>
        {cv?.error || photo?.error ? <p role="alert" className="mt-3 text-sm text-red-800">An attachment could not be opened. Refresh to retry; do not make a decision until the evidence is available.</p> : null}
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">{application.answers.map(answer => <div key={answer.question_id}><h3 className="text-sm font-semibold">{answer.label}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{answer.answer || "Not provided"}</p></div>)}</div>
      </section>
      {application.status === "submitted" ? <ActionForm action={reviewApplication} submitLabel="Save application review" className={panel}><h3 className="font-semibold">Application review</h3><input type="hidden" name="application_id" value={id} /><Select compact label="Decision" name="decision" required defaultValue=""><option value="">Choose a decision</option><option value="invite">Accept application / invite to interview</option><option value="reject">Reject application</option></Select><TextArea label="Internal review note (not shared with applicant)" name="note" rows={3} maxLength={4000} /></ActionForm> : null}
      {application.status === "interview_booked" ? <ActionForm action={recordInterviewResult} submitLabel="Save final decision" className={panel} disabled={!interviewEnded}><h3 className="font-semibold">Interview feedback & final decision</h3><input type="hidden" name="application_id" value={id} />{slots.data ? <p className="text-sm leading-6">Interview: {formatLessonTime(slots.data.starts_at, profile.time_zone)} · {profile.time_zone} <a href={slots.data.meeting_url} target="_blank" rel="noopener noreferrer" className="ml-2 font-semibold text-green-800 underline">Join interview</a></p> : null}<p className="text-sm leading-6 text-slate-500">{interviewEnded ? "Accepting creates an approved, active programme account and synchronizes the reviewed profile." : "Final decisions open after the interview slot has ended."} Interview feedback is admin-only and is never shown to applicants.</p><TextArea label="Internal interview feedback" name="feedback" rows={4} maxLength={4000} required /><Select compact label="Final decision" name="decision" required defaultValue=""><option value="">Choose a decision</option><option value="accept">Accept and activate account</option><option value="reject">Reject after interview</option></Select></ActionForm> : null}
      {["review_rejected", "interview_rejected"].includes(application.status) ? <div className={panel}>{application.reapply_allowed ? <p className="text-sm">Reapplication is enabled. The original submission and decision are retained.</p> : <ActionForm action={reopenApplication} submitLabel="Allow a new application"><input type="hidden" name="application_id" value={id} /><p className="text-sm leading-6">This application is closed. Allowing reapplication lets the applicant submit a new form; it does not change the original decision.</p></ActionForm>}</div> : null}
      <section className={panel}><h3 className="mb-4 font-semibold">Internal decision history (admins only)</h3><PaginatedTable caption="Internal decision history" columns={4} tableClassName="min-w-[700px]" emptyMessage="No decisions recorded yet." headers={<tr>{["Date / reviewer", "Stage", "Decision", "Internal feedback"].map(label => <th scope="col" className="p-3" key={label}>{label}</th>)}</tr>}>{feedback.data?.map(note => <tr key={note.id}><td className="p-3">{formatLessonTime(note.created_at, profile.time_zone)}<span className="mt-1 block text-xs text-slate-500">{note.admin_id}</span></td><td className="p-3">{note.stage}</td><td className="p-3">{note.decision}</td><td className="whitespace-pre-wrap p-3">{note.note || "No note"}</td></tr>)}</PaginatedTable></section>
    </div>;
  } else if (tab === "questions") {
    const request = supabase.from("recruitment_questions").select("*", { count: "exact" }).eq("role", role).order("position").order("id");
    const response = await loadTablePage((from, to) => request.range(from, to), page, size, outOfRange);
    check(response.error);
    const selectedId = typeof query.question === "string" && /^[0-9a-f-]{36}$/i.test(query.question) ? query.question : null;
    const selected = selectedId ? await supabase.from("recruitment_questions").select("*").eq("id", selectedId).eq("role", role).maybeSingle() : null;
    check(selected?.error ?? null);
    if (selected && !selected.data) notFound();
    body = <div className="space-y-5">
      <p className="text-sm leading-6 text-slate-500">Manage the {role} form. Core identity and attachment fields are fixed; add, edit, reorder or remove supplemental questions below.</p>
      <Table {...tableProps} count={response.count ?? 0} caption="Application questions" headers={["Question", "Type", "Required", "Order", "Visibility", "Actions"]}>{response.data?.map(question => <tr key={question.id}><th scope="row" className="max-w-sm px-4 py-3 font-medium">{question.label}</th><td className="px-4 py-3">{question.field_type.replaceAll("_", " ")}</td><td className="px-4 py-3">{question.required ? "Yes" : "No"}</td><td className="px-4 py-3">{question.position}</td><td className="px-4 py-3">{question.active ? "In form" : "Removed"}</td><td className="px-4 py-3"><Link className={link} href={`${base}&tab=questions&question=${question.id}`}>Edit / remove</Link></td></tr>)}</Table>
      <QuestionEditor role={role} question={selected?.data ?? undefined} />{selected ? <Link className={link} href={`${base}&tab=questions`}>Cancel editing / add another</Link> : null}
    </div>;
  } else if (tab === "interviews") {
    const request = supabase.from("interview_slots").select("*", { count: "exact" }).order("starts_at", { ascending: false }).order("id");
    const response = await loadTablePage((from, to) => request.range(from, to), page, size, outOfRange);
    check(response.error);
    const ids = response.data?.flatMap(slot => slot.application_id ? [slot.application_id] : []) ?? [];
    const names = ids.length ? await supabase.from("recruitment_applications").select("id, full_name, role").in("id", ids) : { data: [], error: null };
    check(names.error);
    body = <div className="space-y-5"><p className="text-sm leading-6 text-slate-500">Interview availability is shared between teacher and student recruitment. Times shown in {profile.time_zone}. Cancelling a booked slot invites the applicant to choose a new time.</p>
      <Table {...tableProps} count={response.count ?? 0} caption="Interview slots" headers={["Start", "End", "Status", "Applicant", "Actions"]}>{response.data?.map(slot => {
        const applicant = names.data?.find(name => name.id === slot.application_id);
        return <tr key={slot.id}><td className="px-4 py-3">{formatLessonTime(slot.starts_at, profile.time_zone)}</td><td className="px-4 py-3">{formatLessonTime(slot.ends_at, profile.time_zone)}</td><td className="px-4 py-3 capitalize">{slot.status}</td><td className="px-4 py-3">{applicant ? <Link className="font-semibold text-green-800 underline" href={`/dashboard/admin?view=${applicant.role === "teacher" ? "teachers" : "students"}&section=recruitment&application=${applicant.id}`}>{applicant.full_name}</Link> : "Not booked"}</td><td className="px-4 py-3">{slot.status !== "cancelled" && Date.parse(slot.ends_at) > requestTime ? <ActionForm action={cancelInterviewSlot} submitLabel="Cancel slot"><input type="hidden" name="slot_id" value={slot.id} /></ActionForm> : null}</td></tr>;
      })}</Table>
      <ActionForm action={createInterviewSlot} submitLabel="Create interview slot" className={panel}><h3 className="font-semibold">Add interview availability</h3><div className="grid gap-4 sm:grid-cols-3"><Field compact label="Start date & time" name="starts_at" type="datetime-local" required /><Select compact label="Duration" name="duration" defaultValue="30">{[30, 45, 60].map(value => <option key={value} value={value}>{value} minutes</option>)}</Select><Field compact label="IANA time zone" name="time_zone" defaultValue={profile.time_zone} required maxLength={100} /></div><Field compact label="Meeting URL (Meet, Zoom, Teams or Skype)" name="meeting_url" type="url" required maxLength={2000} /><p className="text-xs leading-5 text-slate-500">Create the meeting with your video provider first. Overlapping interview slots are blocked. Existing lessons are not modified.</p></ActionForm>
    </div>;
  } else {
    const status = recruitmentStatuses.find(status => status === query.status);
    const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
    let request = supabase.from("recruitment_applications").select("*", { count: "exact" }).eq("role", role).order("created_at", { ascending: false }).order("id");
    if (status) request = request.eq("status", status);
    if (q) request = request.ilike("full_name", `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
    const response = await loadTablePage((from, to) => request.range(from, to), page, size, outOfRange);
    check(response.error);
    body = <div className="space-y-5">
      <form action="/dashboard/admin" className={`${panel} flex flex-wrap items-end gap-3`}>
        <input type="hidden" name="view" value={view} /><input type="hidden" name="section" value="recruitment" /><input type="hidden" name="size" value={size} />
        <Field compact label="Search applicant name" name="q" defaultValue={q} maxLength={100} /><Select compact label="Stage" name="status" defaultValue={status ?? ""}><option value="">All stages</option>{Object.entries(recruitmentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><button className={link}>Filter</button><Link className={link} href={`${base}&size=${size}`}>Clear</Link>
      </form>
      <Table {...tableProps} count={response.count ?? 0} caption={`${role} applications`} headers={["Applicant", "Country / hours", "Submitted", "Current stage", "Actions"]}>{response.data?.map(application => <tr key={application.id}><th scope="row" className="px-4 py-3 font-medium">{application.full_name}<span className="mt-1 block break-all text-xs font-normal text-slate-500">{application.email}</span></th><td className="px-4 py-3">{application.country}<span className="mt-1 block text-xs text-slate-500">{application.weekly_hours} h/week</span></td><td className="px-4 py-3">{formatLessonTime(application.created_at, profile.time_zone)}</td><td className="px-4 py-3"><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{recruitmentStatusLabels[application.status]}</span></td><td className="px-4 py-3"><Link className={link} href={`${base}&application=${application.id}`}>Review details</Link></td></tr>)}</Table>
    </div>;
  }
  return <div><ManagementTabs view={view} section="recruitment" /><nav aria-label="Recruitment sections" className="mb-5 flex flex-wrap gap-2">{[["applications", "Applications"], ["questions", "Form questions"], ["interviews", "Interview slots"]].map(([value, label]) => <Link key={value} className={`${link} ${value === tab ? "border-green-700 bg-green-50 text-green-900" : ""}`} href={`${base}&tab=${value}`} aria-current={value === tab && !id ? "page" : undefined}>{label}</Link>)}<Link className={`${link} ml-auto`} href={role === "teacher" ? "/apply" : "/student-apply"}>View applicant page</Link></nav>{body}</div>;
}

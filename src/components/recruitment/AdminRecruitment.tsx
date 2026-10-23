import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ComponentProps, type ReactNode } from "react";
import { requireMember } from "@/src/lib/platform/auth";
import type { RecruitmentRole, RecruitmentQuestion } from "@/src/lib/platform/types";
import { recruitmentStatusLabels } from "@/src/lib/platform/recruitment";
import { formatLessonTime } from "@/src/lib/platform/scheduling";
import { recordInterviewResult, reopenApplication, reviewApplication, saveQuestion, manageQuestion } from "@/src/app/recruitment/actions";
import { applicationFieldDefinitions, defaultApplicationFields, protectedApplicationField, type ApplicationField } from "@/src/lib/platform/application-fields";
import { loadCollection } from "@/src/lib/platform/load-collection";
import EditorDialog from "../platform/EditorDialog";
import InterviewCalendar from "./InterviewCalendar";
import PlatformActionForm from "../platform/ActionForm";
import { Field, Select, TextArea } from "../platform/Fields";
import PaginatedTable from "../platform/PaginatedTable";
import ApplicationsTable from "./ApplicationsTable";
import ActionIcon from "../platform/ActionIcon";
import WorkspaceTabBar from "../platform/WorkspaceTabBar";

const panel = "rounded-xl border border-slate-200 bg-white p-4 sm:p-5";
const link = "inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 [&[aria-current]]:border-green-700 [&[aria-current]]:bg-green-50 [&[aria-current]]:text-green-900";
type Query = { [key: string]: string | string[] | undefined };

function ActionForm(props: ComponentProps<typeof PlatformActionForm>) {
  return <PlatformActionForm {...props} preserveOnError />;
}

function QuestionEditor({ role, question, field }: { role: RecruitmentRole; question?: RecruitmentQuestion; field?: ApplicationField }) {
  const item = field ?? question;
  const protectedField = field && protectedApplicationField(field);
  return <ActionForm key={question?.id ?? field?.field_key ?? "new"} action={saveQuestion} submitLabel={item ? "Save question" : "Add question"} className="space-y-4">
    <h3 className="font-semibold">{item ? "Edit question" : "Add a question"}</h3>
    <input type="hidden" name="role" value={role} />
    <input type="hidden" name="id" value={field?.field_key ?? question?.id ?? ""} />
    <input type="hidden" name="builtin" value={String(!!field)} />
    <Field compact label="Question" name="label" defaultValue={item?.label} maxLength={300} required />
    <Field compact label="Help text (optional)" name="help_text" defaultValue={item?.help_text} maxLength={500} />
    <div className="grid gap-4 sm:grid-cols-2">
      {!field ? <Select compact label="Answer type" name="field_type" defaultValue={question?.field_type ?? "long_text"} required>{Object.entries({ short_text: "Short text", long_text: "Long text", select: "Dropdown", boolean: "Yes / No", number: "Whole number", url: "HTTPS link" }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select> : <p className="text-sm text-slate-500">Linked application field: {field.field_key.replaceAll("_", " ")}</p>}
      <Field compact label="Display order (0-1000)" name="position" type="number" min={0} max={1000} defaultValue={item?.position ?? 10} required />
    </div>
    {!field ? <TextArea label="Dropdown options (one per line; only used for Dropdown)" name="options" rows={3} maxLength={4020} defaultValue={question?.options.join("\n")} /> : null}
    {protectedField ? <><input type="hidden" name="required" value="on" /><input type="hidden" name="active" value="on" /><p className="text-sm text-slate-500">Required identity field. Its label, help text and order can be edited; it cannot be hidden or deleted.</p></> : <div className="flex flex-wrap gap-5 text-sm"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="required" defaultChecked={item?.required ?? true} />Required answer</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} />Include in application form</label></div>}
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
  let interviewMeetingUrl = "";
  let interviewPreferencesMissing = false;
  if (tab === "interviews") {
    const settings = await supabase.from("admin_preferences").select("interview_meeting_url").eq("admin_id", profile.id).maybeSingle();
    if (settings.error && !["42P01", "PGRST205"].includes(settings.error.code)) {
      console.error("Interview preferences load failed:", settings.error.code);
      throw new Error("Your interview meeting link could not be loaded.");
    }
    if (settings.error) interviewPreferencesMissing = true;
    interviewMeetingUrl = settings.data?.interview_meeting_url ?? "";
  }
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
      {application.status === "interview_booked" ? <ActionForm action={recordInterviewResult} submitLabel="Save final decision" className={panel} disabled={!interviewEnded}><h3 className="font-semibold">Interview feedback & final decision</h3><input type="hidden" name="application_id" value={id} />{slots.data ? <p className="text-sm leading-6">Interview: {formatLessonTime(slots.data.starts_at, profile.time_zone)} · {profile.time_zone} <a href={slots.data.meeting_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-green-800 px-3 py-2 font-semibold text-white hover:bg-green-900"><ActionIcon name="video" />Join interview<ActionIcon name="external" /></a></p> : null}<p className="text-sm leading-6 text-slate-500">{interviewEnded ? "Accepting creates an approved, active programme account and synchronizes the reviewed profile." : "Final decisions open after the interview slot has ended."} Interview feedback is admin-only and is never shown to applicants.</p><TextArea label="Internal interview feedback" name="feedback" rows={4} maxLength={4000} required /><Select compact label="Final decision" name="decision" required defaultValue=""><option value="">Choose a decision</option><option value="accept">Accept and activate account</option><option value="reject">Reject after interview</option></Select></ActionForm> : null}
      {["review_rejected", "interview_rejected"].includes(application.status) ? <div className={panel}>{application.reapply_allowed ? <p className="text-sm">Reapplication is enabled. The original submission and decision are retained.</p> : <ActionForm action={reopenApplication} submitLabel="Allow a new application"><input type="hidden" name="application_id" value={id} /><p className="text-sm leading-6">This application is closed. Allowing reapplication lets the applicant submit a new form; it does not change the original decision.</p></ActionForm>}</div> : null}
      <section className={panel}><h3 className="mb-4 font-semibold">Internal decision history (admins only)</h3><PaginatedTable caption="Internal decision history" columns={4} tableClassName="min-w-[700px]" emptyMessage="No decisions recorded yet." headers={<tr>{["Date / reviewer", "Stage", "Decision", "Internal feedback"].map(label => <th scope="col" className="p-3" key={label}>{label}</th>)}</tr>}>{feedback.data?.map(note => <tr key={note.id}><td className="p-3">{formatLessonTime(note.created_at, profile.time_zone)}<span className="mt-1 block text-xs text-slate-500">{note.admin_id}</span></td><td className="p-3">{note.stage}</td><td className="p-3">{note.decision}</td><td className="whitespace-pre-wrap p-3">{note.note || "No note"}</td></tr>)}</PaginatedTable></section>
    </div>;
  } else if (tab === "questions") {
    const [questions, fields] = await Promise.all([
      loadCollection((from, to) => supabase.from("recruitment_questions").select("*").eq("role", role).order("position").order("id").range(from, to), "Application questions"),
      supabase.from("recruitment_form_fields").select("*").eq("role", role).order("position"),
    ]);
    const missing = fields.error && ["42P01", "PGRST205"].includes(fields.error.code);
    if (fields.error && !missing) check(fields.error);
    const coreFields = fields.data ?? defaultApplicationFields(role);
    const rows = [
      ...coreFields.filter(field => !field.deleted).map(field => ({ id: field.field_key, label: field.label, field_type: applicationFieldDefinitions.find(def => def.key === field.field_key)!.type, required: field.required, position: field.position, active: field.active, field, question: undefined })),
      ...questions.map(question => ({ ...question, field: undefined, question })),
    ].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
    body = <div className="workspace-stack">
      <div className="flex shrink-0 justify-end"><EditorDialog title="Add question" icon="plus"><QuestionEditor role={role} /></EditorDialog></div>
      {missing ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Apply migration 202610220017_recruitment_form_fields.sql to edit personal fields and enable hide/delete actions. Existing application fields are shown below.</p> : null}
      <PaginatedTable caption="Application questions" columns={6} initialSort={{ index: 3, descending: false }} headers={<tr>{["Question", "Type", "Required", "Order", "Visibility", "Actions"].map(label => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr>}>
        {rows.map(row => <tr key={row.id}><th scope="row" className="font-medium">{row.label}{row.field ? <span className="mt-1 block text-xs font-normal text-slate-500">{protectedApplicationField(row.field) ? "Required identity" : "Profile field"}</span> : null}</th><td>{row.field_type.replaceAll("_", " ")}</td><td>{row.required ? "Yes" : "No"}</td><td>{row.position}</td><td>{row.active ? "Visible" : "Hidden"}</td><td><div className="flex flex-wrap gap-1">
          {!row.field || !missing ? <EditorDialog title="Edit question" label={`Edit ${row.label}`}><QuestionEditor role={role} field={row.field} question={row.question} /></EditorDialog> : null}
          {!missing && (!row.field || !protectedApplicationField(row.field)) ? <>
            <ActionForm action={manageQuestion} icon="eye" submitLabel={`${row.active ? "Hide" : "Unhide"} ${row.label}`}><input type="hidden" name="role" value={role} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="builtin" value={String(!!row.field)} /><input type="hidden" name="operation" value={row.active ? "hide" : "unhide"} /></ActionForm>
            <EditorDialog title="Delete question" label={`Delete ${row.label}`} icon="trash"><ActionForm action={manageQuestion} submitLabel="Delete question"><input type="hidden" name="role" value={role} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="builtin" value={String(!!row.field)} /><input type="hidden" name="operation" value="delete" /><p className="text-sm">Delete &quot;{row.label}&quot; from future forms? Previously submitted applications retain their answers.</p></ActionForm></EditorDialog>
          </> : null}
        </div></td></tr>)}
      </PaginatedTable>
    </div>;
  } else if (tab === "interviews") {
    const [slots, applications, admins, version] = await Promise.all([
      loadCollection((from, to) => supabase.from("interview_slots").select("*").order("starts_at").order("id").range(from, to), "Interview slots"),
      loadCollection((from, to) => supabase.from("recruitment_applications").select("id,applicant_id,full_name,email,role,status,time_zone,photo_path").in("status", ["interview_invited","interview_booked","accepted","interview_rejected"]).order("id").range(from, to), "Interview applicants"),
      loadCollection((from, to) => supabase.from("profiles").select("id,full_name,email,time_zone,avatar_path").eq("role", "admin").order("id").range(from, to), "Interview admins"),
      supabase.rpc("interview_details_version"),
    ]);
    const missing = version.error && ["42883","PGRST202"].includes(version.error.code);
    if (version.error && !missing) check(version.error);
    const assessments = missing ? [] : await loadCollection((from,to) => supabase.from("interview_assessments").select("*").order("created_at", { ascending: false }).order("id").range(from,to), "Internal interview assessments");
    const paths = [...new Set([...applications.map(app=>app.photo_path),...admins.map(admin=>admin.avatar_path)].filter((path): path is string => !!path))];
    const signed = paths.length ? await supabase.storage.from("avatars").createSignedUrls(paths,600) : null;
    if (signed?.error) { console.error("Interview photo signing failed:",signed.error.name); throw new Error("Interview participant pictures could not be loaded. Refresh to retry."); }
    if (signed?.data?.some(item=>item.error)) { console.error("An interview photo could not be signed."); throw new Error("An interview participant picture is unavailable. Refresh to retry."); }
    const photos = new Map(signed?.data?.map(item=>[item.path,item.signedUrl]));
    const candidateIds = applications.filter(app=>app.status==="interview_invited").map(app=>app.applicant_id);
    const eligible: { id: string }[] = [];
    for (let from=0;from<candidateIds.length;from+=100) {
      const response = await supabase.from("profiles").select("id").in("id",candidateIds.slice(from,from+100)).is("role",null).neq("status","suspended");
      check(response.error); eligible.push(...response.data ?? []);
    }
    body = <InterviewCalendar admin slots={slots.map(slot => {
      const applicant = applications.find(item => item.id === (slot.application_id ?? (slot.status==="cancelled" ? slot.last_application_id : null)));
      const host = admins.find(item=>item.id===slot.created_by);
      const href = applicant ? `/dashboard/admin?view=${applicant.role === "teacher" ? "teachers" : "students"}&section=recruitment&application=${applicant.id}` : undefined;
      return { ...slot, applicant_name: applicant?.full_name, applicant_email: applicant?.email, applicant_href: href,
        interviewer: host ? { name:host.full_name,email:host.email,time_zone:host.time_zone,photo:photos.get(host.avatar_path ?? "") ?? null } : undefined,
        interviewee: applicant ? { name:applicant.full_name,email:applicant.email,time_zone:applicant.time_zone,photo:photos.get(applicant.photo_path ?? "") ?? null,href } : undefined };
    })} candidates={applications.filter(app=>app.status==="interview_invited" && eligible.some(item=>item.id===app.applicant_id)).map(app=>({id:app.id,full_name:app.full_name,email:app.email,role:app.role}))}
      assessments={assessments.map(note=>({...note,author_name:admins.find(admin=>admin.id===note.admin_id)?.full_name ?? "Admin"}))}
      recruitmentRole={role} detailsMissing={!!missing} timeZone={profile.time_zone} now={requestTime} meetingUrl={interviewMeetingUrl} preferencesMissing={interviewPreferencesMissing} />;
  } else {
    const applications = await loadCollection((from, to) => supabase.from("recruitment_applications").select("id,full_name,email,country,weekly_hours,created_at,status").eq("role", role).order("id").range(from, to), "Applications");
    body = <ApplicationsTable key={role} applications={applications} role={role} timeZone={profile.time_zone} />;
  }
  return <div className="workspace-stack"><WorkspaceTabBar label="Recruitment sections" tabs={[["applications", "Applications"], ["questions", "Form questions"], ["interviews", "Interview slots"]].map(([value, label]) => ({ id: value, label, href: `${base}&tab=${value}`, active: value === tab && !id }))}><Link className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={role === "teacher" ? "/apply" : "/student-apply"}>View applicant page</Link></WorkspaceTabBar>{id ? <div className="workspace-panel-scroll">{body}</div> : body}</div>;
}

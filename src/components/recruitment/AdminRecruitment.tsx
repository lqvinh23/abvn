import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ComponentProps, type ReactNode } from "react";
import { requireMember } from "@/src/lib/platform/auth";
import type { RecruitmentRole, RecruitmentQuestion, StudentApplicationReview, StudentRecruitmentCampaign } from "@/src/lib/platform/types";
import { applicationBirthDateLabel, campaignTimeZone, recruitmentStatusLabels } from "@/src/lib/platform/recruitment";
import { formatLessonTime } from "@/src/lib/platform/scheduling";
import { recordInterviewResult, reopenApplication, saveApplicationReview, saveQuestion, manageQuestion } from "@/src/app/recruitment/actions";
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
import Campaigns, { CampaignToolbar } from "./Campaigns";

const panel = "rounded-xl border border-slate-200 bg-white p-4 sm:p-5";
const link = "inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 [&[aria-current]]:border-green-700 [&[aria-current]]:bg-green-50 [&[aria-current]]:text-green-900";
type Query = { [key: string]: string | string[] | undefined };

function ActionForm(props: ComponentProps<typeof PlatformActionForm>) {
  return <PlatformActionForm {...props} preserveOnError />;
}

function QuestionEditor({ role, question, field }: { role: RecruitmentRole; question?: RecruitmentQuestion; field?: ApplicationField }) {
  const item = field ?? question;
  const protectedField = field && protectedApplicationField(field);
  return <ActionForm key={question?.id ?? field?.field_key ?? "new"} action={saveQuestion} submitLabel={item ? "Save question" : "Add question"} toastNotice className="space-y-4">
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
  const tab = query.tab === "questions" || query.tab === "interviews" || (role === "student" && query.tab === "campaigns") ? query.tab : "applications";
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
  let campaignToolbar: ReactNode;
  let campaigns: StudentRecruitmentCampaign[] = [];
  let campaignsMissing = false;
  if (role === "student" && (id || tab === "campaigns" || tab === "applications")) {
    const response = await supabase.from("student_recruitment_campaigns").select("id,due_on").limit(1);
    campaignsMissing = !!response.error && ["42P01", "42703", "PGRST204", "PGRST205"].includes(response.error.code);
    if (response.error && !campaignsMissing) check(response.error);
    if (!campaignsMissing) campaigns = await loadCollection((from, to) =>
      supabase.from("student_recruitment_campaigns").select("*").order("form_opens_on", { ascending: false }).order("id").range(from, to), "Student recruitment campaigns");
  }
  if (id) {
    const applicationResponse = await supabase.from("recruitment_applications").select("*").eq("id", id).eq("role", role).maybeSingle();
    check(applicationResponse.error);
    const application = applicationResponse.data;
    if (!application) notFound();
    const [fieldResponse, formQuestions] = await Promise.all([
      supabase.from("recruitment_form_fields").select("*").eq("role", role).order("position").order("field_key"),
      loadCollection((from, to) => supabase.from("recruitment_questions").select("*").eq("role", role).order("position").order("created_at").order("id").range(from, to), "Application questions"),
    ]);
    const formFieldsMissing = !!fieldResponse.error && ["42P01", "PGRST204", "PGRST205"].includes(fieldResponse.error.code);
    if (fieldResponse.error && !formFieldsMissing) check(fieldResponse.error);
    const fieldSettings = new Map((fieldResponse.data ?? []).map(field => [field.field_key, field]));
    const formFields = defaultApplicationFields(role).map(field => ({ ...field, ...fieldSettings.get(field.field_key) }))
      .sort((a, b) => a.position - b.position || a.field_key.localeCompare(b.field_key));
    const slots = await supabase.from("interview_slots").select("*").eq("application_id", id).eq("status", "booked").maybeSingle();
    check(slots.error);
    const campaignReviewsEnabled = availability.data !== null && availability.data >= 36;
    let savedReviews: StudentApplicationReview[] = [];
    const reviewAuthors = new Map<string, string>();
    let teacherInterviewNote: { note: string; admin_id: string; created_at: string } | null = null;
    if (role === "student" && campaignReviewsEnabled) {
      const response = await supabase.from("student_application_reviews").select("*").eq("application_id", id);
      check(response.error);
      savedReviews = response.data ?? [];
      const adminIds = [...new Set(savedReviews.map(review => review.admin_id))];
      if (adminIds.length) {
        const authors = await supabase.from("profiles").select("id,full_name").in("id", adminIds);
        check(authors.error);
        for (const author of authors.data ?? []) reviewAuthors.set(author.id, author.full_name);
      }
    } else if (role === "teacher" && availability.data !== null && availability.data >= 35) {
      const response = await supabase.from("recruitment_feedback").select("note,admin_id,created_at")
        .eq("application_id", id).eq("stage", "interview").eq("decision", "note")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      check(response.error);
      teacherInterviewNote = response.data;
      if (teacherInterviewNote) {
        const author = await supabase.from("profiles").select("full_name").eq("id", teacherInterviewNote.admin_id).maybeSingle();
        check(author.error);
        reviewAuthors.set(teacherInterviewNote.admin_id, author.data?.full_name ?? "Admin account unavailable");
      }
    }
    let latestInterviewAssessment: { note: string; admin_id: string; created_at: string } | null = null;
    if (availability.data !== null && availability.data >= 35) {
      const response = await supabase.from("interview_assessments").select("note,admin_id,created_at")
        .eq("application_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
      check(response.error);
      latestInterviewAssessment = response.data;
      if (latestInterviewAssessment && !reviewAuthors.has(latestInterviewAssessment.admin_id)) {
        const author = await supabase.from("profiles").select("full_name").eq("id", latestInterviewAssessment.admin_id).maybeSingle();
        check(author.error);
        reviewAuthors.set(latestInterviewAssessment.admin_id, author.data?.full_name ?? "Admin account unavailable");
      }
      if (role === "teacher" && latestInterviewAssessment
        && (!teacherInterviewNote || Date.parse(latestInterviewAssessment.created_at) >= Date.parse(teacherInterviewNote.created_at))) {
        teacherInterviewNote = latestInterviewAssessment;
      }
    }
    const reviewRound = query.review_round === "application" || query.review_round === "interview" ? query.review_round
      : ["interview_invited", "interview_booked", "interview_rejected", "accepted"].includes(application.status) ? "interview" : "application";
    const savedReview = savedReviews.find(review => review.round === reviewRound);
    const displayedReviewNote = reviewRound === "interview" && latestInterviewAssessment
      && (!savedReview || Date.parse(latestInterviewAssessment.created_at) >= Date.parse(savedReview.updated_at))
      ? latestInterviewAssessment.note
      : savedReview?.note ?? "";
    const photo = application.photo_path ? await supabase.storage.from("avatars").createSignedUrl(application.photo_path, 600) : null;
    const cv = application.cv_path ? await supabase.storage.from("recruitment-documents").createSignedUrl(application.cv_path, 600, { download: true }) : null;
    if (photo?.error) console.error("Recruitment photo signing failed:", photo.error.name);
    if (cv?.error) console.error("Recruitment document signing failed:", cv.error.name);
    const fieldValues: Record<ApplicationField["field_key"], ReactNode> = {
      full_name: application.full_name,
      email: application.email,
      phone: application.phone,
      country: application.country,
      time_zone: application.time_zone,
      date_of_birth: role === "student" ? applicationBirthDateLabel(application.date_of_birth, requestTime) : application.date_of_birth,
      weekly_hours: application.weekly_hours === null ? null : `${application.weekly_hours} hours per week`,
      intro: application.intro,
      photo: null,
      cv: cv?.data?.signedUrl ? <a className="text-green-900 underline" href={cv.data.signedUrl}>Download supporting document</a> : application.cv_path ? "Unavailable" : null,
      intro_video_url: application.intro_video_url ? <a className="break-all text-green-900 underline" href={application.intro_video_url} target="_blank" rel="noopener noreferrer">{application.intro_video_url}</a> : null,
      city: application.city ?? null,
      address: application.address ?? null,
      occupation: application.occupation ?? null,
      organization: application.organization ?? null,
      proficiency: application.proficiency ?? null,
      goals: application.goals ?? null,
      hobbies: application.hobbies ?? null,
      national_id_last8: application.national_id_last8 ?? "Not recorded (legacy application)",
    };
    const answersById = new Map(application.answers.map(answer => [answer.question_id, answer]));
    const questionIds = new Set(formQuestions.map(question => question.id));
    const orderedAnswers = [
      ...formQuestions.map(question => answersById.get(question.id)).filter((answer): answer is typeof application.answers[number] => !!answer),
      ...application.answers.filter(answer => !questionIds.has(answer.question_id)),
    ];
    const detailFields = formFields.filter(field => !["full_name", "email", "photo"].includes(field.field_key));
    const moveFieldAfter = (fieldKey: ApplicationField["field_key"], anchorKey: ApplicationField["field_key"]) => {
      const fieldIndex = detailFields.findIndex(field => field.field_key === fieldKey);
      if (fieldIndex < 0) return;
      const [field] = detailFields.splice(fieldIndex, 1);
      const anchorIndex = detailFields.findIndex(item => item.field_key === anchorKey);
      if (anchorIndex >= 0) detailFields.splice(anchorIndex + 1, 0, field);
      else detailFields.splice(fieldIndex, 0, field);
    };
    moveFieldAfter("time_zone", "country");
    moveFieldAfter("city", "address");
    moveFieldAfter("intro_video_url", "cv");
    moveFieldAfter("occupation", "city");
    moveFieldAfter("organization", "occupation");
    moveFieldAfter("proficiency", "organization");
    const interviewEnded = slots.data && Date.parse(slots.data.ends_at) <= requestTime;
    const reviewTimeZone = role === "student" ? campaignTimeZone : profile.time_zone;
    const assessmentsEnabled = availability.data !== null && availability.data >= 35;
    const backParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key !== "application" && key !== "review_round" && typeof value === "string") backParams.set(key, value);
    }
    backParams.set("view", view); backParams.set("section", "recruitment"); backParams.set("tab", "applications");
    const roundOptions = (["application", "interview"] as const).map(round => {
      const params = new URLSearchParams(backParams);
      params.set("application", id);
      params.set("review_round", round);
      return { round, href: `/dashboard/admin?${params}`, active: round === reviewRound, label: round === "application" ? "Application round" : "Interview round" };
    });
    campaignToolbar = <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
      <Link className={`${link} gap-2`} href={`/dashboard/admin?${backParams}`}><ActionIcon name="left" />Back to applications</Link>
      {(role === "student" ? campaignReviewsEnabled : application.status === "submitted" || assessmentsEnabled)
        ? <button type="submit" form="application-review-form" className="button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
          <ActionIcon name="save" />Save application review
        </button>
        : null}
    </div>;
    body = <div className="applicant-details-panels">
      <section aria-label="Submitted application" tabIndex={0} className={`${panel} applicant-details-application`}>
        <div className="flex flex-wrap items-start gap-5">{photo?.data?.signedUrl ? <Image unoptimized src={photo.data.signedUrl} alt={`${application.full_name}'s application photo`} width={96} height={96} className="size-24 rounded-xl object-cover" /> : null}<div className="min-w-0 space-y-1"><h2 className="text-xl font-semibold">{application.full_name}</h2><p className="break-all text-sm font-medium text-slate-700">{application.email}</p><p className="text-sm font-medium text-slate-700">Submitted: {formatLessonTime(application.created_at, reviewTimeZone, false)}</p><div className="flex min-w-0 items-center gap-2">{role === "student" ? <span className="min-w-0 truncate text-sm font-medium text-slate-700">{application.campaign_id ? campaigns.find(campaign => campaign.id === application.campaign_id)?.name ?? "Campaign unavailable" : "Unassigned"}</span> : null}<span className="inline-flex shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">{recruitmentStatusLabels[application.status]}</span></div></div></div>
        <dl className="my-5 grid grid-cols-1 gap-x-4 gap-y-4 text-sm min-[480px]:grid-cols-2">
          {role === "student" ? <div><dt className="text-slate-500">Gender</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{application.gender ? { male: "Male", female: "Female", other: "Other" }[application.gender] : "Not provided"}</dd></div> : null}
          {detailFields.map(field => {
            const value = fieldValues[field.field_key];
            const wide = ["intro", "goals", "hobbies"].includes(field.field_key);
            return <div key={field.field_key} className={`min-w-0 ${wide ? "min-[480px]:col-span-2" : ""}`}><dt className="text-slate-500">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{value === null || value === undefined || value === "" ? "Not provided" : value}</dd></div>;
          })}
          {orderedAnswers.map(answer => <div key={answer.question_id} className={`min-w-0 ${formQuestions.find(question => question.id === answer.question_id)?.field_type === "long_text" ? "min-[480px]:col-span-2" : ""}`}><dt className="text-slate-500">{answer.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-700">{answer.answer || "Not provided"}</dd></div>)}
        </dl>
        {cv?.error || photo?.error ? <p role="alert" className="mt-3 text-sm text-red-800">An attachment could not be opened. Refresh to retry; do not make a decision until the evidence is available.</p> : null}
      </section>
      <div aria-label="ABVN review panel" role="region" tabIndex={0} className="applicant-details-review space-y-5">
        <section className={panel}>
          <h3 className="font-semibold">ABVN review</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{role === "student" ? "Save your note and decision privately without changing the application stage. Publish application or interview decisions from Campaigns when the round is ready." : "Save an internal review note, and choose whether to invite the applicant to interview or reject the application."}</p>
          {role === "student" ? <>
            <div className="review-round-switcher mt-4">
              <nav aria-label="Review round" className="review-round-switcher-links inline-flex max-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">{roundOptions.map(({ round, href, active, label }) => <Link key={round} className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${active ? "bg-white text-green-900 shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"}`} aria-current={active ? "page" : undefined} href={href}><ActionIcon name={round === "application" ? "document" : "video"} />{label}</Link>)}</nav>
              <details className="review-round-switcher-dropdown relative">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                  <span className="inline-flex items-center gap-2"><ActionIcon name={reviewRound === "application" ? "document" : "video"} />{reviewRound === "application" ? "Application round" : "Interview round"}</span>
                  <ActionIcon name="chevronDown" className="text-slate-500" />
                </summary>
                <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">{roundOptions.map(({ round, href, active, label }) => <Link key={round} className={`flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-green-50 text-green-900" : "text-slate-700 hover:bg-slate-50"}`} aria-current={active ? "page" : undefined} href={href}><ActionIcon name={round === "application" ? "document" : "video"} />{label}</Link>)}</div>
              </details>
            </div>
            {campaignReviewsEnabled ? <p aria-label="Current round reviewer" className="mt-3 text-sm text-slate-600">{savedReview ? <>Reviewed by <span className="font-semibold text-slate-800">{reviewAuthors.get(savedReview.admin_id) ?? "Admin account unavailable"}</span> · {savedReview.decision === "pass" ? "Pass" : savedReview.decision === "fail" ? "Fail" : "Not decided"}</> : "Not reviewed yet"}</p> : null}
            {campaignReviewsEnabled ? <ActionForm key={`${id}-${reviewRound}-${savedReview?.revision ?? 0}-${latestInterviewAssessment?.created_at ?? ""}`} id="application-review-form" hideSubmitButton action={saveApplicationReview} submitLabel="Save application review" className="mt-4">
              <input type="hidden" name="role" value="student" />
              <input type="hidden" name="application_id" value={id} />
              <input type="hidden" name="round" value={reviewRound} />
              <input type="hidden" name="revision" value={savedReview?.revision ?? 0} />
              {savedReview?.published_at ? <input type="hidden" name="decision" value={savedReview.decision ?? ""} /> : null}
              <Select compact label="Decision" name="decision" defaultValue={savedReview?.decision ?? ""} disabled={!!savedReview?.published_at}>
                <option value="">Not decided</option><option value="pass">Pass</option><option value="fail">Fail</option>
              </Select>
              <TextArea compact label="ABVN review note" name="note" rows={10} maxLength={4000} defaultValue={displayedReviewNote} required />
              {savedReview?.published_at ? <p className="text-sm text-slate-500">This decision has been published. You may update its note, but not change the published decision.</p> : null}
              {!application.campaign_id ? <p role="alert" className="text-sm text-amber-900">This legacy application is not assigned to a campaign. Its review can be saved, but it cannot be published through a campaign.</p> : null}
            </ActionForm> : <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">Apply 202610250036_campaign_round_decisions.sql after migration 035, then refresh to save review decisions without changing application stages.</p>}
          </> : assessmentsEnabled || application.status === "submitted"
            ? <ActionForm id="application-review-form" hideSubmitButton action={saveApplicationReview} submitLabel="Save application review" className="mt-4">
              <input type="hidden" name="application_id" value={id} />
              {role === "teacher" && slots.data && ["interview_booked", "accepted", "interview_rejected"].includes(application.status)
                ? <input type="hidden" name="slot_id" value={slots.data.id} />
                : null}
              {application.status === "submitted" ? <Select compact label="Decision (optional)" name="decision" defaultValue=""><option value="">Save note only</option><option value="invite">Invite to interview</option><option value="reject">Reject application</option></Select> : null}
              <TextArea label="ABVN review note" name="note" rows={7} maxLength={4000} required />
            </ActionForm>
            : <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">Apply 202610250035_student_application_assessments.sql after the earlier migrations to save ABVN review notes without a decision.</p>}
        </section>
        {role === "teacher" && teacherInterviewNote ? <section className={panel}>
          <h3 className="font-semibold">Interview ABVN review note</h3>
          <p className="mt-1 text-sm text-slate-500">Reviewed by {reviewAuthors.get(teacherInterviewNote.admin_id) ?? "Admin account unavailable"} · {formatLessonTime(teacherInterviewNote.created_at, reviewTimeZone, false)}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{teacherInterviewNote.note}</p>
        </section> : null}
        {role === "teacher" && application.status === "interview_booked" ? <ActionForm action={recordInterviewResult} submitLabel="Save final decision" icon="save" iconAndText className={panel} disabled={!interviewEnded}><h3 className="font-semibold">Interview feedback & final decision</h3><input type="hidden" name="application_id" value={id} />{slots.data ? <p className="text-sm leading-6">Interview: {formatLessonTime(slots.data.starts_at, profile.time_zone)} · {profile.time_zone} <a href={slots.data.meeting_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-green-800 px-3 py-2 font-semibold text-white hover:bg-green-900"><ActionIcon name="video" />Join interview<ActionIcon name="external" /></a></p> : null}<p className="text-sm leading-6 text-slate-500">{interviewEnded ? "Accepting creates an approved, active programme account and synchronizes the reviewed profile." : "Final decisions open after the interview slot has ended."} Interview feedback is admin-only and is never shown to applicants.</p><TextArea label="Internal interview feedback" name="feedback" rows={4} maxLength={4000} required /><Select compact label="Final decision" name="decision" required defaultValue=""><option value="">Choose a decision</option><option value="accept">Accept and activate account</option><option value="reject">Reject after interview</option></Select></ActionForm> : null}
        {["review_rejected", "interview_rejected"].includes(application.status) ? <div className={panel}>{application.reapply_allowed ? <p className="text-sm">Reapplication is enabled. The original submission and decision are retained.</p> : <ActionForm action={reopenApplication} submitLabel="Allow a new application" icon="undo" iconAndText><input type="hidden" name="application_id" value={id} /><p className="text-sm leading-6">This application is closed. Allowing reapplication lets the applicant submit a new form; it does not change the original decision.</p></ActionForm>}</div> : null}
      </div>
    </div>;
  } else if (tab === "campaigns") {
    if (campaignsMissing) {
      body = <section className={panel}><h2 className="font-semibold">Enable student recruitment campaigns</h2><p role="alert" className="mt-3 text-sm leading-6">Apply campaign migrations 031, 032 and 202610250033_student_campaign_due_dates.sql in order after the earlier migrations, then refresh. Run only migrations not yet applied. Existing applications are retained.</p></section>;
    } else {
      const selected = typeof query.campaign_report === "string" ? campaigns.find(campaign => campaign.id === query.campaign_report) : undefined;
      if (query.campaign_report && !selected) notFound();
      const response = selected ? await supabase.rpc("admin_student_campaign_report", { p_campaign_id: selected.id }) : null;
      if (response?.error) check(response.error);
      campaignToolbar = <CampaignToolbar selected={selected} now={requestTime} />;
      body = <Campaigns campaigns={campaigns} now={requestTime} selected={selected} report={response?.data ?? undefined} />;
    }
  } else if (tab === "questions") {
    const [questions, fields] = await Promise.all([
      loadCollection((from, to) => supabase.from("recruitment_questions").select("*").eq("role", role).order("position").order("id").range(from, to), "Application questions"),
      supabase.from("recruitment_form_fields").select("*").eq("role", role).order("position"),
    ]);
    const missing = fields.error && ["42P01", "PGRST205"].includes(fields.error.code);
    if (fields.error && !missing) check(fields.error);
    const coreFields = fields.data ?? defaultApplicationFields(role);
    const rows = [
      ...coreFields.filter(field => !field.deleted).map(field => ({ id: field.field_key, label: field.label, help_text: field.help_text, field_type: applicationFieldDefinitions.find(def => def.key === field.field_key)!.type, required: field.required, position: field.position, active: field.active, field, question: undefined })),
      ...questions.map(question => ({ ...question, help_text: question.help_text, field: undefined, question })),
    ].sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));
    campaignToolbar = <EditorDialog title="Add question" icon="plus" showLabel><QuestionEditor role={role} /></EditorDialog>;
    body = <div className="workspace-stack">
      {missing ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Apply migration 202610220017_recruitment_form_fields.sql to edit personal fields and enable hide/delete actions. Existing application fields are shown below.</p> : null}
      <PaginatedTable caption="Application questions" columns={6} initialSort={{ index: 3, descending: false }} tableClassName="application-questions-table" headers={<tr>{["Question", "Type", "Required", "Order", "Visibility", "Actions"].map((label, index) => <th key={label} scope="col" className="px-3 py-2" style={index === 0 ? { width: "40%" } : index === 5 ? { width: "18%" } : undefined}>{label}</th>)}</tr>}>
        {rows.map(row => <tr key={row.id}><th scope="row" className="font-medium">{row.label}{row.help_text ? <span className="mt-1 block text-sm font-normal text-slate-500">{row.help_text}</span> : null}{row.field ? <span className="mt-1 block text-xs font-normal text-slate-500">{protectedApplicationField(row.field) ? "Required identity" : "Profile field"}</span> : null}</th><td>{row.field_type.replaceAll("_", " ")}</td><td>{row.required ? "Yes" : "No"}</td><td>{row.position}</td><td>{row.active ? "Visible" : "Hidden"}</td><td className="whitespace-nowrap"><div className="flex flex-nowrap gap-1">
          {!row.field || !missing ? <EditorDialog title="Edit question" label={`Edit ${row.label}`}><QuestionEditor role={role} field={row.field} question={row.question} /></EditorDialog> : null}
          {!missing && (!row.field || !protectedApplicationField(row.field)) ? <>
            <ActionForm action={manageQuestion} icon={row.active ? "eye" : "eyeOff"} submitLabel={`${row.active ? "Hide" : "Unhide"} ${row.label}`} toastNotice><input type="hidden" name="role" value={role} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="builtin" value={String(!!row.field)} /><input type="hidden" name="operation" value={row.active ? "hide" : "unhide"} /></ActionForm>
            <EditorDialog title="Delete question" label={`Delete ${row.label}`} icon="trash"><ActionForm action={manageQuestion} submitLabel="Delete question" toastNotice><input type="hidden" name="role" value={role} /><input type="hidden" name="id" value={row.id} /><input type="hidden" name="builtin" value={String(!!row.field)} /><input type="hidden" name="operation" value="delete" /><p className="text-sm">Delete &quot;{row.label}&quot; from future forms? Previously submitted applications retain their answers.</p></ActionForm></EditorDialog>
          </> : null}
        </div></td></tr>)}
      </PaginatedTable>
    </div>;
  } else if (tab === "interviews") {
    const [slots, applications, admins, version] = await Promise.all([
      loadCollection((from, to) => supabase.from("interview_slots").select("*").order("starts_at").order("id").range(from, to), "Interview slots"),
      loadCollection((from, to) => supabase.from("recruitment_applications").select("id,applicant_id,full_name,email,role,status,time_zone,photo_path").in("status", ["interview_invited","interview_booked","accepted","interview_rejected"]).order("id").range(from, to), "Interview applicants"),
      loadCollection((from, to) => supabase.from("profiles").select("id,full_name,email,time_zone,avatar_path").or("role.eq.admin,admin_access.eq.true").order("id").range(from, to), "Interview admins"),
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
      const href = applicant ? `/dashboard/admin?view=${applicant.role === "teacher" ? "teachers" : "students"}&section=recruitment&application=${applicant.id}&review_round=interview` : undefined;
      return { ...slot, applicant_name: applicant?.full_name, applicant_email: applicant?.email, applicant_href: href,
        interviewer: host ? { name:host.full_name,email:host.email,time_zone:host.time_zone,photo:photos.get(host.avatar_path ?? "") ?? null } : undefined,
        interviewee: applicant ? { name:applicant.full_name,email:applicant.email,time_zone:applicant.time_zone,photo:photos.get(applicant.photo_path ?? "") ?? null,href } : undefined };
    })} candidates={applications.filter(app=>app.status==="interview_invited" && eligible.some(item=>item.id===app.applicant_id)).map(app=>({id:app.id,full_name:app.full_name,email:app.email,role:app.role}))}
      assessments={assessments.map(note=>({...note,author_name:admins.find(admin=>admin.id===note.admin_id)?.full_name ?? "Admin"}))}
      recruitmentRole={role} detailsMissing={!!missing} timeZone={profile.time_zone} now={requestTime} meetingUrl={interviewMeetingUrl} preferencesMissing={interviewPreferencesMissing} />;
  } else {
    const applications = await loadCollection((from, to) => supabase.from("recruitment_applications").select("*").eq("role", role).order("id").range(from, to), "Applications");
    const reviewsAvailable = role === "student" && availability.data !== null && availability.data >= 36;
    const studentReviews = reviewsAvailable
      ? await loadCollection((from, to) => supabase.from("student_application_reviews").select("application_id,round,decision").order("application_id").range(from, to), "Student application decisions")
      : [];
    body = <ApplicationsTable key={role} applications={applications.map(({ id, full_name, email, city, country, date_of_birth, weekly_hours, created_at, status, campaign_id }) => ({ id, full_name, email, city, country, date_of_birth, weekly_hours, created_at, status, campaign_id }))} campaigns={campaigns} campaignsMissing={campaignsMissing} now={requestTime} role={role} timeZone={profile.time_zone} studentReviews={studentReviews} reviewsAvailable={reviewsAvailable} />;
  }
  const applicantLink = <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={role === "teacher" ? "/apply" : "/student-apply"}><ActionIcon name="external" />View applicant page</Link>;
  return <div className="workspace-stack">{id
    ? <div aria-label="Application detail toolbar" role="toolbar" className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">{campaignToolbar}{applicantLink}</div>
    : <WorkspaceTabBar label="Recruitment sections" tabs={[["applications", "Applications"], ...(role === "student" ? [["campaigns", "Campaigns"]] : []), ["questions", "Form questions"], ["interviews", "Interview slots"]].map(([value, label]) => ({ id: value, label, href: `${base}&tab=${value}`, active: value === tab }))}>{campaignToolbar}{applicantLink}</WorkspaceTabBar>}{body}</div>;
}

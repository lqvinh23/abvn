import Link from "next/link";
import { Suspense } from "react";
import { getCurrentMember } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import { recruitmentStep, recruitmentSteps, recruitmentStatusLabels } from "@/src/lib/platform/recruitment";
import type { RecruitmentRole } from "@/src/lib/platform/types";
import { cancelInterview } from "@/src/app/recruitment/actions";
import { formatLessonTime } from "@/src/lib/platform/scheduling";
import ActionForm from "../platform/ActionForm";
import SetupNotice from "../platform/SetupNotice";
import ApplicationForm from "./ApplicationForm";
import InterviewCalendar from "./InterviewCalendar";
import { defaultApplicationFields } from "@/src/lib/platform/application-fields";
import { loadCollection } from "@/src/lib/platform/load-collection";
import ScheduleChangeInbox from "../platform/ScheduleChangeInbox";
import ActionIcon from "../platform/ActionIcon";

const card = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-7";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-(--primary) px-5 py-3 text-sm font-semibold text-white hover:bg-(--accent)";

function Roadmap({ step, accepted = false }: { step: number; accepted?: boolean }) {
  return <aside className={`${card} self-start lg:sticky lg:top-6`}>
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your journey</p>
    <p className="mt-2 hidden text-sm text-slate-600 lg:block">Two rounds. One meaningful connection.</p>
    <ol aria-label="Recruitment progress" className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-1 lg:gap-5">
      {recruitmentSteps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className="flex gap-3">
        <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${index <= step ? "border-green-700 bg-green-700 text-white" : "border-slate-200 bg-slate-50 text-slate-400"}`}>{index < step || accepted ? "\u2713" : index + 1}</span>
        <div><p className={`text-sm font-semibold ${index === step ? "text-green-800" : "text-slate-700"}`}>{label}</p><p className="mt-1 hidden text-xs leading-5 text-slate-500 lg:block">{["Tell us about yourself", "ABVN reviews your application", "Choose a time and meet the team", "Your decision and next steps"][index]}</p></div>
      </li>)}
    </ol>
    <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Need help? <a className="font-semibold text-green-800 underline" href="mailto:abettervnproject@gmail.com">Contact ABVN</a></p>
  </aside>;
}

export default function RecruitmentPage({ role }: { role: RecruitmentRole }) {
  return <main className="flex-1 bg-[#f5f7f5] px-4 py-8 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--primary)">Join A Better Vietnam</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{role === "teacher" ? "Share your English. Make a difference." : "Start your English learning journey."}</h1>
      <p className="mb-8 mt-3 max-w-3xl leading-7 text-slate-600">{role === "teacher" ? "Volunteer online, set your availability, and connect with learners in Vietnam. Apply below and meet our team." : "Free online English lessons for motivated Vietnamese learners aged 16-25. Tell us your goals, then meet our team."}</p>
      <Suspense fallback={<div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap step={0} /><p className={card} role="status">Loading your application...</p></div>}>
        <ApplicationContent role={role} />
      </Suspense>
    </div>
  </main>;
}

async function ApplicationContent({ role }: { role: RecruitmentRole }) {
  if (!getSupabaseConfig()) return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap step={0} /><SetupNotice /></div>;
  const member = await getCurrentMember();
  if (!member) return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap step={0} /><section className={card}>
    <h2 className="text-xl font-semibold">Let&apos;s get to know you</h2>
    <p className="my-4 leading-7 text-slate-600">Sign in to start an application, save your submission securely, and track each step. {role === "teacher" ? "Have your photo and CV ready. An introduction video is optional." : "Prepare your learning goals and availability. Supporting documents are optional."}</p>
    <Link className={button} href="/login">Sign in to apply</Link>
    <p className="mt-4 text-sm text-slate-500">After signing in, choose your application from the guest dashboard.</p>
  </section></div>;
  const { supabase, profile, requestTime } = member;
  if (profile.status === "suspended") return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap step={0} /><section className={card}><h2 className="text-xl font-semibold">Your account is suspended</h2><p className="mt-4 leading-7 text-slate-600">Recruitment is unavailable for this account. Contact ABVN for help restoring access.</p></section></div>;
  const workflow = await supabase.rpc("recruitment_workflow_version");
  if (workflow.error) {
    console.error("Recruitment workflow check failed:", workflow.error.code);
    return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap step={0} /><section className={card}><h2 className="text-xl font-semibold">Application temporarily unavailable</h2><p role="alert" className="mt-3 leading-7">ABVN needs to check the recruitment setup before you can continue. Please try again later or contact the team. Administrators: apply recruitment migrations 013 and 014 in order (only 014 if 013 is already applied).</p></section></div>;
  }
  const { data: applications, error } = await supabase.from("recruitment_applications").select("*").eq("applicant_id", profile.id).order("created_at", { ascending: false }).limit(1);
  if (error) {
    console.error("Applicant recruitment load failed:", error.code);
    return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap step={0} /><section className={card}><h2 className="text-xl font-semibold">Application unavailable</h2><p role="alert" className="mt-3 leading-7">Your application could not be loaded. Ask ABVN to check the recruitment migration, then refresh. No application has been submitted by this page.</p></section></div>;
  }
  const application = applications[0];
  if (application && application.role !== role && ["submitted", "interview_invited", "interview_booked"].includes(application.status))
    return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap step={1} /><section className={card}><h2 className="text-xl font-semibold">You already have an application in progress</h2><p className="my-4 text-slate-600">Only one teacher or student application can be open at a time.</p><Link className={button} href={application.role === "teacher" ? "/apply" : "/student-apply"}>Continue your {application.role} application</Link></section></div>;
  const closed = application && ["review_rejected", "interview_rejected"].includes(application.status);
  const canApply = !profile.role && (!application || (closed && application.reapply_allowed));
  let slot = null;
  if (application?.status === "interview_booked") {
    const response = await supabase.from("interview_slots").select("*").eq("application_id", application.id).eq("status", "booked").single();
    if (response.error) { console.error("Booked interview load failed:", response.error.code); throw new Error("Your booked interview could not be loaded. Please contact ABVN."); }
    slot = response.data;
  }
  const step = canApply ? 0 : recruitmentStep(application?.status, !!slot && Date.parse(slot.ends_at) <= requestTime);
  const { data: questions, error: questionsError } = canApply ? await supabase.from("recruitment_questions").select("*").eq("role", role).eq("active", true).order("position").order("created_at") : { data: [], error: null };
  if (questionsError) { console.error("Recruitment questions load failed:", questionsError.code); throw new Error("The application form could not be loaded. Please try again."); }
  const available = application?.status === "interview_invited" ? await loadCollection((from, to) => supabase.from("interview_slots").select("*").eq("status", "available").gt("starts_at", new Date(requestTime).toISOString()).order("starts_at").order("id").range(from, to), "Interview availability") : [];
  const notificationResponse = application
    ? await supabase.from("schedule_change_notifications").select("*").order("created_at", { ascending: false }).limit(20)
    : null;
  const notificationsUnavailable = !!notificationResponse?.error && ["42P01", "PGRST205"].includes(notificationResponse.error.code);
  if (notificationResponse?.error && !notificationsUnavailable) {
    console.error("Applicant schedule notifications could not be loaded:", notificationResponse.error.code);
    throw new Error("Your interview schedule notifications could not be loaded. Please try again.");
  }
  const fieldResult = canApply ? await supabase.from("recruitment_form_fields").select("*").eq("role", role).order("position") : { data: [], error: null };
  const fieldsMissing = fieldResult.error && ["42P01", "PGRST205"].includes(fieldResult.error.code);
  if (fieldResult.error && !fieldsMissing) { console.error("Application fields load failed:", fieldResult.error.code); throw new Error("Your application form could not be loaded."); }
  const fields = fieldResult.data ?? defaultApplicationFields(role);
  return <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
    <Roadmap step={step} accepted={application?.status === "accepted"} />
    <section className={`${card} min-w-0`}>
      {canApply ? <>
        <div className="mb-6 border-b border-slate-100 pb-5"><p className="text-xs font-semibold uppercase tracking-wider text-green-700">Round 1 / Application</p><h2 className="mt-2 text-2xl font-semibold">{role === "teacher" ? "Volunteer teacher application" : "Student application"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Required questions are marked *. Your answers are reviewed by the ABVN team.</p></div>
        {fieldsMissing ? <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">Personal-field customization is not enabled yet. The standard application fields remain available.</p> : null}<ApplicationForm role={role} profile={profile} questions={questions ?? []} fields={fields} />
      </> : !application ? <>
        <h2 className="text-xl font-semibold">You already have an ABVN account</h2><p className="my-4 text-slate-600">Contact ABVN if you need to change your role.</p><Link className={button} href="/dashboard">Open your dashboard</Link>
      </> : <>
        <ScheduleChangeInbox notifications={notificationResponse?.data ?? []} timeZone={application.time_zone} unavailable={notificationsUnavailable} />
        <p className="text-xs font-semibold uppercase tracking-wider text-green-700">{step < 2 ? "Round 1 / Application" : "Round 2 / Interview"}</p>
        <h2 className="mt-2 text-2xl font-semibold">{recruitmentStatusLabels[application.status]}</h2>
        <p className="mt-2 text-sm text-slate-500">{application.full_name} · {application.role} application · submitted {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: application.time_zone }).format(new Date(application.created_at))}</p>
        {application.status === "submitted" ? <p className="mt-5 leading-7 text-slate-600">Thank you for applying. ABVN is reviewing your submission. Check this page for an interview invitation or a decision.</p> : null}
        {closed ? <p className="mt-5 leading-7 text-slate-600">Thank you for your interest in ABVN. We are unable to move forward with this application. Contact the team for support. A new application is available only after an admin reopens it.</p> : null}
        {application.status === "accepted" ? <><p className="my-5 leading-7 text-slate-600">Welcome to ABVN! Your {application.role} account is ready.{application.role === "teacher" ? " Your approved profile now appears in Our volunteer teachers." : ""}</p><Link className={button} href="/dashboard">Open your dashboard</Link></> : null}
        {application.status === "interview_invited" ? <div className="mt-6">
          <h3 className="font-semibold">Choose an available interview time</h3><p className="mb-4 mt-2 text-sm text-slate-500">All times in {application.time_zone}. Slots are confirmed only when your booking succeeds.</p>
          <div className="interview-booking-calendar"><InterviewCalendar slots={available} timeZone={application.time_zone} now={requestTime} /></div>
          {!available.length ? <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm leading-6">There are no open interview times yet. Check back or contact ABVN to request more availability.</p> : null}
        </div> : null}
        {slot ? <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/50 p-5">
          <h3 className="font-semibold">{slot.title ?? "Your interview"}</h3>{slot.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{slot.description}</p> : null}<p className="mt-2 leading-7">{formatLessonTime(slot.starts_at, application.time_zone)}</p><p className="text-sm text-slate-500">{application.time_zone} · {Math.round((Date.parse(slot.ends_at) - Date.parse(slot.starts_at)) / 60000)} minutes</p>
          {Date.parse(slot.ends_at) > requestTime ? <a className={`${button} my-4`} href={slot.meeting_url} target="_blank" rel="noopener noreferrer"><ActionIcon name="video" />Join interview<ActionIcon name="external" /></a> : <p className="my-4 text-sm leading-6 text-slate-600">Your interview time has ended. ABVN is completing the final review. Your decision will appear here.</p>}
          {Date.parse(slot.starts_at) > requestTime ? <ActionForm action={cancelInterview} submitLabel="Cancel booking and choose another time" /> : null}
        </div> : null}
        <details className="mt-6 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Your submitted application</summary><div className="mt-4 space-y-4 text-sm leading-6"><p className="whitespace-pre-wrap">{application.intro}</p><p>{application.weekly_hours} hours/week · {application.country}</p>{application.answers.map(answer => <div key={answer.question_id}><p className="font-semibold">{answer.label}</p><p className="whitespace-pre-wrap text-slate-600">{answer.answer || "Not provided"}</p></div>)}</div></details>
      </>}
    </section>
  </div>;
}

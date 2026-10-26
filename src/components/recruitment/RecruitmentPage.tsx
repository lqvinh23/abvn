import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { io } from "next/cache";
import { getCurrentMember, getRequestTime } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import { applicationBirthDateLabel, campaignStatus, campaignWindowOpen, recruitmentStep, recruitmentSteps, recruitmentStatusLabels, studentRecruitmentSteps } from "@/src/lib/platform/recruitment";
import type { RecruitmentRole, StudentRecruitmentCampaign } from "@/src/lib/platform/types";
import { cancelInterview } from "@/src/app/recruitment/actions";
import { formatLessonTime } from "@/src/lib/platform/scheduling";
import { formatUtcOffset } from "@/src/lib/platform/calendar";
import ActionForm from "../platform/ActionForm";
import SetupNotice from "../platform/SetupNotice";
import ApplicationForm from "./ApplicationForm";
import InterviewCalendar from "./InterviewCalendar";
import { defaultApplicationFields, type ApplicationField } from "@/src/lib/platform/application-fields";
import { loadCollection } from "@/src/lib/platform/load-collection";
import ActionIcon from "../platform/ActionIcon";
import { createSupabaseServerClient } from "@/src/lib/platform/server";

const card = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-7";
const button = "button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold";
const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/abettervn" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/a-better-vietnam" },
  { label: "Instagram", href: "https://www.instagram.com/a_better_vietnam/" },
  { label: "YouTube", href: "https://www.youtube.com/channel/UCd1MvLDKJhK2odFskFqF4MA" },
];

function ApplicationNotes({ role }: { role: RecruitmentRole }) {
  return <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-green-950">
    <li>Complete all answers in English.</li>
    <li>Write your own answers. Do not use AI tools to generate or rewrite your responses.</li>
    {role === "student" ? <li>Applicants must be aged 16-25 when submitting an application.</li> : null}
    <li>Upload a clear, appropriate profile photo. If accepted, this photo will be used for your ABVN profile.</li>
  </ul>;
}

function CampaignNotice({ campaigns, now }: { campaigns: StudentRecruitmentCampaign[]; now: number }) {
  const current = campaigns.find(campaign => campaignWindowOpen(campaign, "form", now));
  const next = campaigns.filter(campaign => campaignStatus(campaign, now) === "upcoming").toSorted((a, b) => a.form_opens_on.localeCompare(b.form_opens_on))[0];
  const date = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return current ? <div role="status" className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-green-800">Applications open</p><p className="mt-1 text-lg font-semibold text-green-950">{current.name} student intake</p></div>
      <div className="sm:border-l sm:border-green-200 sm:pl-5"><p className="text-sm font-medium text-green-800">Apply by</p><p className="mt-1 text-lg font-semibold text-green-950">{date(current.form_closes_on < current.due_on ? current.form_closes_on : current.due_on)} <span className="whitespace-nowrap text-sm font-normal text-green-800">(Vietnam time)</span></p></div>
    </div>
    <div className="mt-4 border-t border-green-200 pt-4"><ApplicationNotes role="student" /></div>
  </div> : <div role="status" className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 sm:p-5">
    <p className="font-semibold text-green-950">Student applications are currently closed.</p>
    <p className="mt-1 text-sm leading-6 text-green-900">
      {next ? `${next.name} applications open ${date(next.form_opens_on)}. Apply by ${date(next.form_closes_on < next.due_on ? next.form_closes_on : next.due_on)} (Vietnam time).` : "The next application dates have not been announced yet."}
    </p>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-green-200 pt-3">
      <p className="text-sm text-green-950">Follow ABVN for updates:</p>
      <nav aria-label="ABVN social media">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          {socialLinks.map(({ label, href }) => <li key={label}><a href={href} target="_blank" rel="noreferrer" className="text-green-800 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">{label}</a></li>)}
        </ul>
      </nav>
    </div>
  </div>;
}

function Roadmap({ step, role, accepted = false }: { step: number; role: RecruitmentRole; accepted?: boolean }) {
  const steps = role === "student" ? studentRecruitmentSteps : recruitmentSteps;
  return <aside className={`${card} self-start lg:sticky lg:top-6`}>
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your journey</p>
    <p className="mt-2 hidden text-sm text-slate-600 lg:block">Two rounds. One meaningful connection.</p>
    <ol aria-label="Recruitment progress" className={`mt-5 grid grid-cols-2 gap-4 ${role === "student" ? "sm:grid-cols-3" : "sm:grid-cols-4"} lg:grid-cols-1 lg:gap-5`}>
      {steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className="flex gap-3">
        <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${index <= step ? "border-green-700 bg-green-700 text-white" : "border-slate-200 bg-slate-50 text-slate-400"}`}>{index < step || (accepted && index === step) ? "\u2713" : index + 1}</span>
        <div className="min-w-0"><p className={`text-sm font-semibold ${index === step ? "text-green-800" : "text-slate-700"}`}>{label}</p><p className="mt-1 hidden text-xs leading-5 text-slate-500 lg:block">{["Tell us about yourself", "ABVN reviews your application", "Choose a time and meet the team", "ABVN reviews your interview and makes the final decision", "Your student account is ready. Welcome to ABVN!"][index]}</p></div>
      </li>)}
    </ol>
    <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Need help? <a className="font-semibold text-green-800 underline" href="mailto:abettervnproject@gmail.com">Contact ABVN</a></p>
  </aside>;
}

export default function RecruitmentPage({ role }: { role: RecruitmentRole }) {
  return <main className="flex-1 bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--primary)">Join A Better Vietnam</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{role === "teacher" ? "Share your English. Make a difference." : "Start your English learning journey."}</h1>
      <p className="mb-8 mt-3 text-pretty leading-7 text-slate-600">{role === "teacher" ? "Volunteer online, set your availability, and connect with learners in Vietnam. Apply below and meet our team." : "Free online English lessons for Vietnamese learners aged 16-25. Share your goals and meet the ABVN team."}</p>
      <Suspense fallback={<div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap role={role} step={0} /><p className={card} role="status">Loading your application...</p></div>}>
        <ApplicationContent role={role} />
      </Suspense>
    </div>
  </main>;
}

async function ApplicationContent({ role }: { role: RecruitmentRole }) {
  if (!getSupabaseConfig()) return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap role={role} step={0} /><SetupNotice /></div>;
  await io();
  const member = await getCurrentMember();
  let campaigns: StudentRecruitmentCampaign[] = [];
  if (role === "student") {
    const client = member?.supabase ?? await createSupabaseServerClient();
    const response = await client.from("student_recruitment_campaigns").select("*,due_on").order("form_opens_on", { ascending: false }).order("id");
    if (response.error) {
      console.error("Student recruitment campaigns load failed:", response.error.code);
      return <section className={card}><h2 className="text-xl font-semibold">Student recruitment temporarily unavailable</h2><p role="alert" className="mt-3 text-sm leading-6">The campaign schedule could not be loaded. Please try again later or contact ABVN. Administrators: ensure campaign migrations through 202610250033_student_campaign_due_dates.sql have been applied.</p></section>;
    }
    campaigns = response.data;
  }
  const publicRequestTime = getRequestTime();
  const studentApplicationsOpen = role === "student" && campaigns.some(campaign => campaignWindowOpen(campaign, "form", publicRequestTime));
  if (!member) return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap role={role} step={0} /><section className={card}>
    {role === "student" ? <CampaignNotice campaigns={campaigns} now={publicRequestTime} /> : null}
    {role !== "student" || studentApplicationsOpen ? <>
      <h2 className="text-xl font-semibold">Let&apos;s get to know you</h2>
      <p className="my-4 leading-7 text-slate-600">Sign in to start an application, save your submission securely, and track each step. {role === "teacher" ? "Have your photo and CV ready. An introduction video is optional." : "Prepare your learning goals and availability. Supporting documents are optional."}</p>
      <Link className={button} href="/login">Sign in to apply</Link>
      <p className="mt-4 text-sm text-slate-500">After signing in, choose your application from the guest dashboard.</p>
    </> : null}
  </section></div>;
  const { supabase, profile, requestTime } = member;
  if (profile.status === "suspended") return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap role={role} step={recruitmentStep(undefined, false, role === "student" ? profile.role : undefined)} /><section className={card}><h2 className="text-xl font-semibold">Your account is suspended</h2><p className="mt-4 leading-7 text-slate-600">Recruitment is unavailable for this account. Contact ABVN for help restoring access.</p></section></div>;
  const workflow = await supabase.rpc("recruitment_workflow_version");
  if (workflow.error) {
    console.error("Recruitment workflow check failed:", workflow.error.code);
    return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap role={role} step={recruitmentStep(undefined, false, role === "student" ? profile.role : undefined)} /><section className={card}><h2 className="text-xl font-semibold">Application temporarily unavailable</h2><p role="alert" className="mt-3 leading-7">ABVN needs to check the recruitment setup before you can continue. Please try again later or contact the team. Administrators: apply recruitment migrations 013 and 014 in order (only 014 if 013 is already applied).</p></section></div>;
  }
  const { data: applications, error } = await supabase.from("recruitment_applications").select("*").eq("applicant_id", profile.id).order("created_at", { ascending: false }).limit(1);
  if (error) {
    console.error("Applicant recruitment load failed:", error.code);
    return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap role={role} step={recruitmentStep(undefined, false, role === "student" ? profile.role : undefined)} /><section className={card}><h2 className="text-xl font-semibold">Application unavailable</h2><p role="alert" className="mt-3 leading-7">Your application could not be loaded. Ask ABVN to check the recruitment migration, then refresh. No application has been submitted by this page.</p></section></div>;
  }
  const application = applications[0];
  if (application && application.role !== role && ["submitted", "interview_invited", "interview_booked"].includes(application.status))
    return <div className="grid gap-6 lg:grid-cols-[260px_1fr]"><Roadmap role={role} step={recruitmentStep("submitted", false, role === "student" ? profile.role : undefined)} /><section className={card}><h2 className="text-xl font-semibold">You already have an application in progress</h2><p className="my-4 text-slate-600">Only one teacher or student application can be open at a time.</p><Link className={button} href={application.role === "teacher" ? "/apply" : "/student-apply"}>Continue your {application.role} application</Link></section></div>;
  const closed = application && ["review_rejected", "interview_rejected"].includes(application.status);
  const canApply = !profile.role && (!application || (closed && application.reapply_allowed));
  const formCampaign = campaigns.find(campaign => campaignWindowOpen(campaign, "form", requestTime));
  const canSubmit = canApply && (role === "teacher" || !!formCampaign);
  const interviewCampaign = campaigns.find(campaign => campaign.id === application?.campaign_id);
  const canBookInterview = application?.role === "teacher" || (!!interviewCampaign && campaignWindowOpen(interviewCampaign, "interview", requestTime));
  let slot = null;
  let interviewSupport: { contact_name: string; contact_email: string; cancel_cutoff_hours: number } | null = null;
  if (application?.status === "interview_booked") {
    const response = await supabase.from("interview_slots").select("*").eq("application_id", application.id).eq("status", "booked").single();
    if (response.error) { console.error("Booked interview load failed:", response.error.code); throw new Error("Your booked interview could not be loaded. Please contact ABVN."); }
    slot = response.data;
    const support = await supabase.rpc("my_interview_booking_support");
    if (support.error) {
      console.error("Interview support details load failed:", support.error.code);
      if (["42883", "PGRST202"].includes(support.error.code))
        throw new Error("Interview contact and cancellation details are being updated. Please try again later or contact ABVN.");
      throw new Error("Your interviewer contact and cancellation details could not be loaded. Please contact ABVN.");
    }
    if (!support.data?.[0]) throw new Error("Your interviewer contact details are unavailable. Please contact ABVN.");
    interviewSupport = support.data[0];
  }
  const step = recruitmentStep(canApply ? undefined : application?.status, !!slot && Date.parse(slot.ends_at) <= requestTime, role === "student" ? profile.role : undefined);
  const { data: questions, error: questionsError } = canSubmit || application ? await supabase.from("recruitment_questions").select("*").eq("role", role).order("position").order("created_at") : { data: [], error: null };
  if (questionsError) { console.error("Recruitment questions load failed:", questionsError.code); throw new Error("The application form could not be loaded. Please try again."); }
  const availableSlots = application?.status === "interview_invited" && canBookInterview ? await loadCollection((from, to) => supabase.from("interview_slots").select("*").eq("status", "available").gt("starts_at", new Date(requestTime).toISOString()).order("starts_at").order("id").range(from, to), "Interview availability") : [];
  const availableContactResult = availableSlots.length ? await supabase.rpc("my_interview_available_contacts") : null;
  if (availableContactResult?.error) {
    console.error("Available interviewer details load failed:", availableContactResult.error.code);
    throw new Error("Interview contact details could not be loaded. Please try again or contact ABVN.");
  }
  const availableContacts = new Map((availableContactResult?.data ?? []).map(contact => [contact.slot_id, contact]));
  const available = availableSlots.map(slot => {
    const contact = availableContacts.get(slot.id);
    if (!contact) {
      console.error("Available interview slot has no interviewer details:", slot.id);
      throw new Error("Interview contact details could not be loaded. Please try again or contact ABVN.");
    }
    return {
      ...slot,
      interviewer: {
        name: contact.contact_name,
        email: contact.contact_email,
        time_zone: contact.contact_time_zone,
        photo: null,
      },
    };
  });
  const fieldResult = canSubmit || application ? await supabase.from("recruitment_form_fields").select("*").eq("role", role).order("position") : { data: [], error: null };
  const fieldsMissing = fieldResult.error && ["42P01", "PGRST205"].includes(fieldResult.error.code);
  if (fieldResult.error && !fieldsMissing) { console.error("Application fields load failed:", fieldResult.error.code); throw new Error("Your application form could not be loaded."); }
  const fields = defaultApplicationFields(role).map(field => ({ ...field, ...fieldResult.data?.find(savedField => savedField.field_key === field.field_key) }))
    .sort((a, b) => a.position - b.position || a.field_key.localeCompare(b.field_key));
  const identityMissing = role === "student" && canSubmit && !fields.some(field => field.field_key === "national_id_last8" && field.active && field.required && !field.deleted);
  const formFields = fields;
  const formQuestions = questions ?? [];
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
  const answersById = new Map((application?.answers ?? []).map(answer => [answer.question_id, answer]));
  const questionIds = new Set(formQuestions.map(question => question.id));
  const orderedAnswers = application ? [
    ...formQuestions.map(question => answersById.get(question.id)).filter((answer): answer is typeof application.answers[number] => !!answer),
    ...application.answers.filter(answer => !questionIds.has(answer.question_id)),
  ] : [];
  const photo = application?.photo_path ? await supabase.storage.from("avatars").createSignedUrl(application.photo_path, 600) : null;
  const cv = application?.cv_path ? await supabase.storage.from("recruitment-documents").createSignedUrl(application.cv_path, 600, { download: true }) : null;
  if (photo?.error) console.error("Applicant photo signing failed:", photo.error.name);
  if (cv?.error) console.error("Applicant document signing failed:", cv.error.name);
  const fieldValues: Record<ApplicationField["field_key"], ReactNode> | null = application ? {
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
  } : null;
  return <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
    <Roadmap role={role} step={step} accepted={profile.role === role || application?.status === "accepted"} />
    <section className={`${card} min-w-0`}>
      {canApply ? <>
        {role === "student" ? <CampaignNotice campaigns={campaigns} now={requestTime} /> : null}
        {canSubmit ? <>
        {role === "teacher" ? <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 sm:p-5"><ApplicationNotes role={role} /></div> : null}
        <div className="mb-6 border-b border-slate-100 pb-5"><p className="text-xs font-semibold uppercase tracking-wider text-green-700">Round 1 / Application</p><h2 className="mt-2 text-2xl font-semibold">{role === "teacher" ? "Volunteer teacher application" : "Student application"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Required questions are marked *.</p></div>
        {fieldsMissing ? <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">Personal-field customization is not enabled yet. The standard application fields remain available.</p> : null}
        {identityMissing ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">The student application form is being updated. Please try again later. Administrators: apply 202610250034_student_national_identity.sql after the earlier migrations, then refresh.</p> : <ApplicationForm role={role} profile={profile} questions={formQuestions.filter(question => question.active)} fields={fields} />}
        </> : null}
      </> : !application ? <>
        <h2 className="text-xl font-semibold">You already have an ABVN account</h2><p className="my-4 text-slate-600">Contact ABVN if you need to change your role.</p><Link className={button} href="/dashboard">Open your dashboard</Link>
      </> : <>
        <div className="flex flex-wrap items-start gap-5">
          {photo?.data?.signedUrl ? <Image unoptimized src={photo.data.signedUrl} alt={`${application.full_name}'s application photo`} width={112} height={112} className="size-24 rounded-xl object-cover sm:size-28" /> : null}
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700">{step < 2 ? "Round 1 / Application" : "Round 2 / Interview"}</p>
            <h2 className="text-2xl font-semibold tracking-tight">{application.full_name}</h2>
            <p className="break-all text-sm font-medium text-slate-700">{application.email}</p>
            <p className="text-sm font-medium text-slate-700">Submitted: {formatLessonTime(application.created_at, application.time_zone, false)}</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {role === "student" ? <span className="min-w-0 truncate text-sm font-medium text-slate-700">{application.campaign_id ? interviewCampaign?.name ?? "Campaign unavailable" : "Unassigned"}</span> : null}
              <span className="inline-flex shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">{recruitmentStatusLabels[application.status]}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
        {application.status === "submitted" ? <p className="mt-5 leading-7 text-slate-600">Thank you for applying. ABVN is reviewing your submission. Check this page for an interview invitation or a decision.</p> : null}
        {closed ? <p className="mt-5 leading-7 text-slate-600">Thank you for your interest in ABVN. We are unable to move forward with this application. Contact the team for support. A new application is available only after an admin reopens it.</p> : null}
        {application.status === "accepted" ? <><p className="my-5 leading-7 text-slate-600">Welcome to ABVN! Your {application.role} account is ready.{application.role === "teacher" ? " Your approved profile now appears in Our volunteer teachers." : ""}</p><Link className={button} href="/dashboard">Open your dashboard</Link></> : null}
        {application.status === "interview_invited" && !canBookInterview ? <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6">Interview booking is closed for this campaign.{interviewCampaign ? ` Booking dates: ${interviewCampaign.interview_opens_on} to ${interviewCampaign.interview_closes_on}, inclusive in Vietnam time.` : " Contact ABVN about your Unassigned application."}</p> : null}
        {application.status === "interview_invited" && canBookInterview ? <div className="mt-6">
          <h3 className="font-semibold">Choose an available interview time</h3><p className="mb-4 mt-2 text-sm text-slate-500">All times in {application.time_zone}. Slots are confirmed only when your booking succeeds.</p>
          <div className="interview-booking-calendar"><InterviewCalendar slots={available} timeZone={application.time_zone} now={requestTime} /></div>
          {!available.length ? <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm leading-6">There are no open interview times yet. Check back or contact ABVN to request more availability.</p> : null}
        </div> : null}
        {slot ? <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/50 p-5">
          <h3 className="text-base font-semibold leading-6 text-slate-900">{slot.title ?? "Your interview"}</h3>
          {slot.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{slot.description}</p> : null}
          <p className="mt-2 text-base font-medium leading-6 text-slate-900">{formatLessonTime(slot.starts_at, application.time_zone, false)}</p>
          <p className="text-sm leading-6 text-slate-500">{application.time_zone} · {formatUtcOffset(application.time_zone, Date.parse(slot.starts_at))} · {Math.round((Date.parse(slot.ends_at) - Date.parse(slot.starts_at)) / 60000)} minutes</p>
          {interviewSupport ? <p className="mt-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-900">Interviewer:</span> {interviewSupport.contact_name} · <a className="font-medium text-green-800 underline" href={`mailto:${interviewSupport.contact_email}`}>{interviewSupport.contact_email}</a> <span className="text-slate-500">(contact for urgent help)</span></p> : null}
          {Date.parse(slot.ends_at) > requestTime ? <a className={`${button} my-4`} href={slot.meeting_url} target="_blank" rel="noopener noreferrer"><ActionIcon name="video" />Join interview<ActionIcon name="external" /></a> : <p className="my-4 text-sm leading-6 text-slate-600">Your interview time has ended. The ABVN team is reviewing your interview and will make the final decision. ABVN&apos;s decision will appear here.</p>}
          {Date.parse(slot.starts_at) > requestTime && interviewSupport && Date.parse(slot.starts_at) > requestTime + interviewSupport.cancel_cutoff_hours * 60 * 60 * 1000
            ? <ActionForm action={cancelInterview} submitLabel="Cancel booking and choose another time" />
            : Date.parse(slot.starts_at) > requestTime && interviewSupport
              ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">You cannot cancel this interview within {interviewSupport.cancel_cutoff_hours} hours of its start. Contact your interviewer using the details above if you need urgent help.</p>
              : null}
        </div> : null}
        </div>
        <details className="group mt-6 border-t border-slate-100 pt-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-lg font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
            Your submitted application
            <ActionIcon name="chevronDown" className="text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 text-sm min-[480px]:grid-cols-2">
            {role === "student" ? <div><dt className="text-slate-500">Gender</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-700">{application.gender ? { male: "Male", female: "Female", other: "Other" }[application.gender] : "Not provided"}</dd></div> : null}
            {detailFields.map(field => {
              const value = fieldValues?.[field.field_key];
              const wide = ["intro", "goals", "hobbies"].includes(field.field_key);
              return <div key={field.field_key} className={`min-w-0 ${wide ? "min-[480px]:col-span-2" : ""}`}><dt className="text-slate-500">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-700">{value === null || value === undefined || value === "" ? "Not provided" : value}</dd></div>;
            })}
            {orderedAnswers.map(answer => <div key={answer.question_id} className={`min-w-0 ${formQuestions.find(question => question.id === answer.question_id)?.field_type === "long_text" ? "min-[480px]:col-span-2" : ""}`}><dt className="text-slate-500">{answer.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-700">{answer.answer || "Not provided"}</dd></div>)}
          </dl>
          {photo?.error || cv?.error ? <p role="alert" className="mt-4 text-sm text-red-800">An attachment could not be opened. Refresh to retry.</p> : null}
        </details>
      </>}
    </section>
  </div>;
}

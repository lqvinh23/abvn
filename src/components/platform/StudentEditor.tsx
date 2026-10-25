"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import { DateTime } from "luxon";
import { saveStudentProfile } from "@/src/app/dashboard/actions";
import type { ParticipationStatus, StudentProfileReport } from "@/src/lib/platform/types";
import { studentStatuses, studyPeriod } from "@/src/lib/platform/student-directory";
import ActionIcon from "./ActionIcon";
import Image from "next/image";
import { Field, Select, TextArea } from "./Fields";
import TimeZoneSelect from "./TimeZoneSelect";
import StudentTopBar from "./StudentTopBar";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const statusNotes: Record<string, string> = {
  active: "Full access: Schedule, booking, classroom and feedback.",
  inactive: "Read-only lesson history. Schedule and booking are removed until an admin restores Active.",
  suspended: "Read-only lesson history. Restricted until an admin restores Active; a reason is recorded.",
  banned: "Read-only lesson history. Restricted until an admin restores Active; a reason is recorded.",
};

function Section({ title, single = false, className = "", children }: { title: string; single?: boolean; className?: string; children: ReactNode }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-3 ${className}`}>
    <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
    <div className={`mt-2 grid gap-x-3 gap-y-2 ${single ? "" : "sm:grid-cols-2"}`}>{children}</div>
  </section>;
}

export default function StudentEditor({ report, now, photoUrl, cvUrl, extensionMonths = 6 }: { report: StudentProfileReport; now: number; photoUrl: string | null; cvUrl: string | null; extensionMonths?: number }) {
  const { profile, details } = report;
  const [state, formAction, pending] = useActionState(saveStudentProfile, { ok: false, message: "" });
  const [status, setStatus] = useState<ParticipationStatus>(profile.participation_status);
  const [expires, setExpires] = useState(profile.study_expires_on ?? "");
  const period = studyPeriod({ created_at: profile.created_at, student_joined_at: profile.student_joined_at, study_expires_on: expires || null }, now, profile.time_zone);
  const reactivationBlocked = profile.participation_status !== "active" && period.state === "expired";
  const reasonRequired = (status === "banned" || status === "suspended") && status !== profile.participation_status;
  const saved = JSON.stringify([profile, details]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }
  function extendStudyPeriod() {
    const start = DateTime.fromISO(expires || DateTime.fromMillis(now, { zone: profile.time_zone }).toISODate()!);
    setExpires(start.plus({ months: extensionMonths }).toISODate()!);
  }

  return <form onSubmit={submit} className="workspace-stack" aria-label={`Edit ${profile.full_name}`}>
    <StudentTopBar role="admin" name={profile.full_name} number={profile.member_number} code={profile.member_code} current="Edit">
      <Link href={`/dashboard/admin/students/${profile.member_code}`} className="button-secondary inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-4 text-sm font-semibold"><ActionIcon name="close" />Cancel</Link>
      <button type="submit" disabled={pending} className="button-primary inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"><ActionIcon name="save" />{pending ? "Saving..." : "Save changes"}</button>
    </StudentTopBar>
    {state.message ? <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-rose-50 text-rose-900"}`}>{state.message}</p> : null}
    <div className="workspace-panel-scroll">
      <fieldset key={saved} disabled={pending} className="grid min-w-0 gap-3 pb-1 xl:grid-cols-3">
        <input type="hidden" name="user_id" value={profile.id} />
        <input type="hidden" name="current_avatar" value={profile.avatar_path ?? ""} />
        <input type="hidden" name="current_cv" value={profile.cv_path ?? ""} />
        <div className="grid min-w-0 gap-3 xl:col-span-2">
          <Section title="Personal & contact">
            <Field compact label="Full name" name="name" defaultValue={profile.full_name} maxLength={100} required />
            <Field compact label="Email (read-only)" value={profile.email ?? ""} readOnly />
            <Field compact label="Phone" name="phone" type="tel" defaultValue={details?.phone ?? ""} maxLength={30} />
            <Field compact label="Date of birth" name="date_of_birth" type="date" defaultValue={details?.date_of_birth ?? ""} max={DateTime.fromMillis(now).toISODate() ?? undefined} />
            <Field compact label="National / Citizen ID number (last 8 digits)" helpText="Private to the student and ABVN admins. Existing students may leave this blank if no ID is recorded yet." name="national_id_last8" defaultValue={details?.national_id_last8 ?? ""} type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{8}" minLength={8} maxLength={8} required={!!details?.national_id_last8} />
            <Field compact label="City / Province" name="city" defaultValue={profile.city} maxLength={100} />
            <Field compact label="Country" name="country" defaultValue={profile.country} maxLength={100} />
            <div className="sm:col-span-2"><Field compact label="Detailed address" name="address" defaultValue={profile.address} maxLength={300} /></div>
            <TimeZoneSelect defaultValue={profile.time_zone} now={now} />
            <Field compact label="Facebook link" name="facebook_url" type="url" placeholder="https://www.facebook.com/..." defaultValue={profile.facebook_url} maxLength={300} />
          </Section>
          <Section title="Work & learning profile">
            <Field compact label="Occupation" name="occupation" defaultValue={profile.occupation} maxLength={100} />
            <Field compact label="Organization" name="organization" defaultValue={profile.organization} maxLength={150} />
            <Select compact label="English level" name="proficiency" defaultValue={profile.proficiency}><option value="">Not specified</option>{levels.map(level => <option key={level}>{level}</option>)}</Select>
            <Field compact label="Introduction video link" name="intro_video_url" type="url" placeholder="YouTube, Vimeo or Google Drive link" defaultValue={details?.intro_video_url ?? ""} maxLength={500} />
            <div className="sm:col-span-2"><Field compact label="Learning goals" name="goals" defaultValue={profile.goals} maxLength={500} /></div>
            <div className="sm:col-span-2"><Field compact label="Hobbies and interests" name="hobbies" defaultValue={profile.hobbies} maxLength={500} /></div>
            <div className="sm:col-span-2"><TextArea compact label="Biography" name="bio" defaultValue={profile.bio} maxLength={4000} rows={4} /></div>
          </Section>
        </div>
        <div className="grid min-w-0 content-start gap-3">
          <Section title="Study access" single>
            <div><Select compact label="Student status" name="participation_status" value={status} onValueChange={value => setStatus(value as ParticipationStatus)}>{studentStatuses.map(value => <option key={value} value={value} disabled={value === "active" && reactivationBlocked}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select><p className="mt-1 text-xs leading-5 text-slate-500">{statusNotes[status]}</p></div>
            <div><TextArea compact label={reasonRequired ? "Reason (required)" : "Reason for status change"} name="reason" rows={2} maxLength={1000} required={reasonRequired} placeholder="Recorded in the student's status history" /></div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <Field compact label="Study expires on" name="study_expires_on" type="date" value={expires} onChange={event => setExpires(event.target.value)} required />
              <button type="button" onClick={extendStudyPeriod} className="button-secondary mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold"><ActionIcon name="plus" />{extensionMonths} months</button>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Joined {period.joined?.toFormat("dd/MM/yyyy") ?? "-"}.{" "}
              {period.state === "expired" ? <strong className="text-rose-800">This study period has ended. Extend the expiry date before restoring Active status.</strong> : period.daysLeft !== null ? <strong className={period.state === "soon" ? "text-amber-800" : "font-medium text-slate-700"}>{period.daysLeft} day{period.daysLeft === 1 ? "" : "s"} remaining.</strong> : null}{" "}
              The default period is six months from joining; extend it for scholarship, paid or admin-approved students.
            </p>
          </Section>
          <Section title="Photo & CV" single>
            <div className="flex items-center gap-3">
              {photoUrl ? <Image src={photoUrl} alt="Current profile image" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-full border border-green-100 object-cover" /> : <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-semibold text-green-900">{profile.full_name.slice(0, 1).toUpperCase()}</span>}
              <div className="min-w-0 flex-1"><Field compact label="Profile image" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" /></div>
            </div>
            <p className="-mt-1 text-xs text-slate-500">JPEG, PNG or WebP, up to 2 MB. Leave empty to keep the current image.</p>
            <div><Field compact label="CV / supporting document" name="cv" type="file" accept=".pdf,.doc,.docx" /><p className="mt-1 text-xs text-slate-500">PDF, DOC or DOCX, up to 5 MB. Private to admins. {cvUrl ? <a href={cvUrl} className="font-semibold text-green-900 underline">Download current CV</a> : "No CV on file."}</p></div>
          </Section>
        </div>
      </fieldset>
    </div>
  </form>;
}

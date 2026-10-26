"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DateTime } from "luxon";
import { bookLesson } from "@/src/app/dashboard/actions";
import { lessonLocalTime } from "@/src/lib/platform/calendar";
import type { CalendarLesson, Role } from "@/src/lib/platform/types";
import ActionForm from "./ActionForm";
import LessonList from "./LessonList";

export function Participant({ name, number, code, photo, role, zone, startsAt, endsAt, onNavigate, email, href }: {
  name: string; number: number | null; code: string | null; photo: string | null; role: "Teacher" | "Student" | "Admin" | "Interviewer" | "Interviewee";
  zone: string | null; startsAt: string; endsAt: string; onNavigate: () => void;
  email?: string; href?: string;
}) {
  const [failed, setFailed] = useState(false);
  const local = zone ? lessonLocalTime(startsAt, endsAt, zone) : null;
  return <section aria-label={`${role} details`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
    <div className={`flex ${role === "Admin" || role === "Interviewer" || role === "Interviewee" ? "h-24" : "h-16"} min-w-0 items-center gap-3`}>
    {photo && !failed ? <Image src={photo} alt={`${name}'s profile photo`} width={56} height={56} unoptimized onError={() => setFailed(true)} className="size-14 shrink-0 rounded-full object-cover" /> : <span aria-label="No profile photo available" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-green-50 text-lg font-semibold text-green-900">{name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("")}</span>}
    <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{role}{number !== null ? ` ID ${number}` : ""}</p>{code || href ? <Link onClick={onNavigate} href={href ?? `/members/${code}`} className="mt-1 block overflow-hidden break-words text-base font-semibold leading-5 text-green-900 hover:underline" title={name}>{name}</Link> : <p className="mt-1 overflow-hidden break-words text-base font-semibold leading-5 text-slate-900" title={name}>{name}</p>}{email ? <p className="mt-1 break-all text-sm font-medium text-slate-700">{email}</p> : null}</div>
    </div>
    <div aria-label={`${role} time`} className="mt-4 border-t border-slate-200 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-green-800">{role} time</h3>
      {local ? <><p className="mt-2 text-sm font-medium text-slate-900">{local.date}</p><p className="mt-1 text-lg font-semibold tabular-nums text-green-950">{local.time}</p><p className="mt-1 break-words text-sm text-slate-600">{local.zone}</p></> : <p role="status" className="mt-2 text-sm text-red-800">Time zone unavailable. Refresh to retry.</p>}
      {failed ? <p role="status" className="mt-2 text-xs text-red-800">Photo unavailable. Refresh to retry.</p> : null}
    </div>
  </section>;
}

export default function LessonDetails({ lesson, role, timeZone, now, onNavigate, hideCancelAction = false }: {
  lesson: CalendarLesson; role: Role; timeZone: string; now: number; onNavigate: () => void; hideCancelAction?: boolean;
}) {
  const start = DateTime.fromISO(lesson.starts_at, { zone: timeZone });
  const end = DateTime.fromISO(lesson.ends_at, { zone: timeZone });
  const viewerLocal = lessonLocalTime(lesson.starts_at, lesson.ends_at, timeZone);
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2">
      <Participant key={lesson.teacher_avatar_url ?? lesson.teacher_code} role="Teacher" name={lesson.teacher_name} number={lesson.teacher_number} code={lesson.teacher_code} photo={lesson.teacher_avatar_url} zone={lesson.teacher_time_zone} startsAt={lesson.starts_at} endsAt={lesson.ends_at} onNavigate={onNavigate} />
      {lesson.student_name ? <Participant key={lesson.student_avatar_url ?? lesson.student_name} role="Student" name={lesson.student_name} number={lesson.student_number} code={lesson.student_code} photo={lesson.student_avatar_url} zone={lesson.student_time_zone} startsAt={lesson.starts_at} endsAt={lesson.ends_at} onNavigate={onNavigate} /> : <section aria-label="Student details" className="min-w-0 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><div className="flex h-16 min-w-0 items-center gap-3"><span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-7"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.6 3.1-5.5 7-5.5s6.5 1.9 7 5.5" /></svg></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student</p><p className="mt-1 line-clamp-2 h-11 overflow-hidden break-words text-base font-semibold leading-5 text-slate-700">No student booked</p></div></div><div aria-label="Your local time" className="mt-4 border-t border-slate-200 pt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-green-800">Your local time</h3><p className="mt-2 text-sm font-medium text-slate-900">{viewerLocal.date}</p><p className="mt-1 text-lg font-semibold tabular-nums text-green-950">{viewerLocal.time}</p><p className="mt-1 break-words text-sm text-slate-600">{viewerLocal.zone}</p></div></section>}
    </div>
    <p className="text-base font-medium text-slate-700">Duration: {end.diff(start, "minutes").minutes} minutes</p>
    <section><h3 className="text-base font-semibold text-slate-900">About this lesson</h3><p className="mt-2 whitespace-pre-wrap text-base leading-7 text-slate-600">{lesson.description || "No description has been added for this lesson."}</p></section>
    {lesson.can_book ? <ActionForm action={bookLesson} submitLabel="Book this lesson"><input type="hidden" name="slot_id" value={lesson.slot_id} /><p className="text-sm leading-6 text-slate-600">Book to receive the classroom link. Cancellation closes 12 hours before the lesson.</p></ActionForm> : lesson.is_my_class !== false ? <LessonList lessons={[lesson]} role={role} timeZone={timeZone} now={now} compact hideOverview hideCancelAction={hideCancelAction} /> : null}
  </div>;
}

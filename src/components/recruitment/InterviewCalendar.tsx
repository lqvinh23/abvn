"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import type { CalendarLesson, RecruitmentRole } from "@/src/lib/platform/types";
import { matchesInterview, type InterviewCalendarSlot, type InterviewCandidate, type AssessmentEntry } from "@/src/lib/platform/interviews";
import { calendarDisplayRange, calendarRange, formatTimeZone, initialCalendarMinute, type CalendarMode } from "@/src/lib/platform/calendar";
import { addInterviewAssessment, bookInterview, cancelInterviewSlot, createInterviewSlot, editInterviewSlot } from "@/src/app/recruitment/actions";
import CalendarGrid from "../platform/CalendarGrid";
import CalendarMonth from "../platform/CalendarMonth";
import ActionForm from "../platform/ActionForm";
import ActionIcon from "../platform/ActionIcon";
import { Field, Select, TextArea } from "../platform/Fields";
import DurationField from "../platform/DurationField";
import { Participant } from "../platform/LessonDetails";
import { lessonLocalTime } from "@/src/lib/platform/calendar";
import ScheduleSlotEditForm from "../platform/ScheduleSlotEditForm";
import TimeZoneSelect from "../platform/TimeZoneSelect";
import "../platform/workspace.css";
import "../platform/filters.css";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50";
const joinButton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800";
const statuses = {
  available: { label: "Available", color: "border-green-700 bg-green-50 text-green-950" },
  booked: { label: "Booked", color: "border-violet-400 bg-violet-100 text-violet-950" },
  cancelled: { label: "Cancelled", color: "border-rose-400 bg-rose-100 text-rose-950" },
};

export default function InterviewCalendar({ slots, timeZone, now: requestTime, admin = false, meetingUrl = "", preferencesMissing = false, recruitmentRole = "teacher", candidates = [], assessments = [], detailsMissing = false }: {
  slots: InterviewCalendarSlot[];
  timeZone: string; now: number; admin?: boolean; meetingUrl?: string; preferencesMissing?: boolean;
  recruitmentRole?: RecruitmentRole; candidates?: InterviewCandidate[]; assessments?: AssessmentEntry[]; detailsMissing?: boolean;
}) {
  const [date, setDate] = useState(DateTime.fromMillis(requestTime, { zone: timeZone }).toISODate()!);
  const [mode, setMode] = useState<CalendarMode>("week");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialStart, setInitialStart] = useState("");
  const [version, setVersion] = useState(0);
  const details = useRef<HTMLDialogElement>(null);
  const edit = useRef<HTMLDialogElement>(null);
  const create = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(requestTime);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const range = calendarRange(date, timeZone, now, mode);
  const display = calendarDisplayRange(date, timeZone, now, mode);
  const days = Array.from({ length: Math.round(display.end.diff(display.start, "days").days) }, (_, index) => display.start.plus({ days: index }));
  const filtered = slots.filter(slot => (!status || slot.status === status) && matchesInterview(slot,search));
  const visible = filtered.filter(slot => Date.parse(slot.starts_at) < display.end.toMillis() && Date.parse(slot.ends_at) > display.start.toMillis());
  const selected = slots.find(slot => slot.id === selectedId);
  const hasInterviewHistory = !!selected && (
    selected.status === "booked" || !!selected.application_id || !!selected.last_application_id ||
    assessments.some(assessment => assessment.slot_id === selected.id)
  );
  const canCancelSelected = admin && !!selected && selected.status !== "cancelled" && Date.parse(selected.ends_at) > now;
  const cancellationRemovesSlot = !!selected && !hasInterviewHistory;
  const events: CalendarLesson[] = visible.map(slot => ({
    slot_id: slot.id, booking_id: null, teacher_id: "", student_id: null, teacher_name: "Interview", student_name: slot.applicant_name ?? null,
    starts_at: slot.starts_at, ends_at: slot.ends_at, slot_status: slot.status, booking_status: null,
    meeting_url: null, attendance: null, teacher_comment: null, student_comment: null, student_rating: null,
    teacher_code: "", student_code: null, title: "Interview", description: "", can_book: false,
    teacher_number: null, student_number: null, teacher_avatar_url: null, student_avatar_url: null,
    teacher_time_zone: timeZone, student_time_zone: null,
  }));
  function presentation(event: CalendarLesson) {
    const slot = visible.find(slot => slot.id === event.slot_id)!;
    return { label: `${slot.title ?? "Interview"}${slot.applicant_name ? ` - ${slot.applicant_name}` : ""}`, status: statuses[slot.status].label, color: statuses[slot.status].color };
  }
  function openSlot(id: string) { setSelectedId(id); details.current?.showModal(); }
  function openCreate(start = "") { setInitialStart(start); setVersion(value => value + 1); create.current?.showModal(); }
  const step = mode === "month" ? { months: 1 } : mode === "day" ? { days: 1 } : { weeks: 1 };
  const period = mode === "month" ? "month" : mode === "day" ? "day" : "week";
  return <section aria-label="Interview calendar" className="workspace-stack interview-calendar">
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <button type="button" className={button} onClick={() => setDate(DateTime.fromMillis(now, { zone: timeZone }).toISODate()!)}>Today</button>
      <button type="button" className={button} title={`Previous ${period}`} aria-label={`Previous ${period}`} onClick={() => setDate(range.start.minus(step).toISODate()!)}><ActionIcon name="left" /></button>
      <button type="button" className={button} title={`Next ${period}`} aria-label={`Next ${period}`} onClick={() => setDate(range.start.plus(step).toISODate()!)}><ActionIcon name="right" /></button>
      <input type="date" aria-label="Choose interview date" value={date} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) setDate(event.target.value); }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
      <nav aria-label="Interview calendar view" className="flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">{(["day", "week", "month", "agenda"] as const).map(value => <button type="button" key={value} aria-pressed={value === mode} onClick={() => setMode(value)} className={`min-h-11 rounded-lg px-3 text-sm font-semibold capitalize ${value === mode ? "bg-slate-100 text-slate-950" : "text-slate-500"}`}>{value}</button>)}</nav>
      <div className="ml-auto flex flex-wrap gap-2"><button type="button" className={button} aria-expanded={filtersOpen} aria-controls="interview-filters" onClick={()=>setFiltersOpen(value=>!value)}><ActionIcon name="search" />Filters{search || status ? <span className="rounded-full bg-green-100 px-2 text-xs">{Number(!!search)+Number(!!status)}</span> : null}</button>
      {admin ? <button type="button" className={button} onClick={() => openCreate()}><ActionIcon name="plus" />Add interview slot</button> : null}</div>
    </div>
    {admin && detailsMissing ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Apply migration 202610220018_interview_slot_details.sql to enable interview titles, applicant assignment and internal assessments. Slot creation is disabled until this update is applied.</p> : null}
    {filtersOpen ? <div id="interview-filters" className="workspace-filter-bar">
      <Field compact type="search" label="Search interviews" placeholder="Admin or interviewee name / email" value={search} onChange={event => setSearch(event.target.value)} />
      {admin ? <Select compact label="Interview status" value={status} onValueChange={setStatus}><option value="">All statuses</option>{Object.entries(statuses).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}</Select> : null}
      <button type="button" className="workspace-filter-clear" title="Clear filters" aria-label="Clear filters" onClick={() => { setStatus(""); setSearch(""); }}><ActionIcon name="close" /></button>
    </div> : null}
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 px-4 py-3 text-sm">
        <h2 className="font-semibold">{range.start.toFormat("LLLL yyyy")}</h2>
        <span>{visible.filter(slot => slot.status === "available").length} available</span>
        {admin ? <span>{visible.filter(slot => slot.status === "booked").length} booked</span> : null}
        <span className="ml-auto text-slate-600">{formatTimeZone(timeZone, now)}</span>
      </div>
      {mode === "month" ? <div className="min-h-0 flex-1 overflow-auto"><CalendarMonth days={days} month={range.start.month} lessons={events} role={admin ? "teacher" : "student"} now={now} onLesson={event => openSlot(event.slot_id)} onCreate={openCreate} presentation={presentation} createLabel="interview" /></div> : mode !== "agenda" ? <CalendarGrid days={days} lessons={events} role={admin ? "teacher" : "student"} now={now} initialMinute={initialCalendarMinute(events, timeZone)} onLesson={event => openSlot(event.slot_id)} onCreate={openCreate} presentation={presentation} createLabel="interview" /> : null}
      <div className={mode === "month" ? "hidden" : mode === "agenda" ? "min-h-0 flex-1 overflow-auto p-4" : "min-h-0 flex-1 overflow-auto p-4 md:hidden"}>
        <div className="grid gap-3">{visible.map(slot => <button type="button" key={slot.id} onClick={() => openSlot(slot.id)} className={`min-h-11 rounded-xl border p-3 text-left text-sm ${statuses[slot.status].color}`}><span className="block font-semibold">{slot.title ?? "Interview"}{slot.applicant_name ? ` - ${slot.applicant_name}` : ""}</span>{DateTime.fromISO(slot.starts_at, { zone: timeZone }).toFormat("ccc d LLL, HH:mm")} - {DateTime.fromISO(slot.ends_at, { zone: timeZone }).toFormat("HH:mm")}</button>)}</div>
        {!visible.length ? <p role="status" className="p-4 text-center text-sm text-slate-500">No interviews in this period. Choose another date or clear filters.</p> : null}
      </div>
      <div aria-label="Interview calendar legend" className="flex shrink-0 flex-wrap gap-4 border-t border-slate-200 px-4 py-3">{Object.entries(statuses).filter(([key]) => admin || key === "available").map(([key, value]) => <span key={key} className="inline-flex items-center gap-2 text-xs"><span aria-hidden="true" className={`size-3 rounded border ${value.color}`} />{value.label}</span>)}</div>
    </div>
    <dialog ref={details} aria-label="Interview details" className="fixed inset-0 m-auto max-h-[90dvh] w-[min(760px,95vw)] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl backdrop:bg-slate-950/50">
      <header className="sticky top-0 z-20 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div><h2 className="text-xl font-semibold sm:text-2xl">{selected?.title ?? "Interview details"}</h2>{selected ? <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statuses[selected.status].color}`}>{statuses[selected.status].label}</span> : null}</div><div className="flex flex-wrap justify-end gap-2">{canCancelSelected && selected ? <ActionForm action={cancelInterviewSlot} className="shrink-0" preserveOnError submitLabel={cancellationRemovesSlot ? "Remove slot" : "Cancel interview"} icon={cancellationRemovesSlot ? "trash" : "close"} iconAndText submitButtonClassName="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700" beforeSubmit={() => window.confirm(cancellationRemovesSlot ? "Permanently remove this interview slot? It has no applicant or assessment history." : "Cancel this interview? Its applicant and assessment history will be retained.")}><input type="hidden" name="slot_id" value={selected.id} /></ActionForm> : null}{admin && selected && ["available", "booked"].includes(selected.status) && Date.parse(selected.starts_at) > now ? <button type="button" className={button} title="Edit interview" aria-label="Edit interview" onClick={() => { details.current?.close(); edit.current?.showModal(); }}><ActionIcon name="edit" />Edit</button> : null}<button type="button" className={button} onClick={() => details.current?.close()}><ActionIcon name="close" />Close</button></div></header>
      <div className="space-y-6 p-5 sm:p-8">{selected ? <>
        <div className="grid gap-3 sm:grid-cols-2">
          <Participant key={`${selected.id}:admin`} role="Admin" name={selected.interviewer?.name ?? "ABVN admin"} email={selected.interviewer?.email} number={null} code={null} photo={selected.interviewer?.photo ?? null} zone={selected.interviewer?.time_zone ?? null} startsAt={selected.starts_at} endsAt={selected.ends_at} onNavigate={()=>details.current?.close()} />
          {selected.interviewee ? <Participant key={`${selected.id}:applicant`} role="Interviewee" name={selected.interviewee.name} email={selected.interviewee.email} number={null} code={null} href={selected.interviewee.href} photo={selected.interviewee.photo} zone={selected.interviewee.time_zone} startsAt={selected.starts_at} endsAt={selected.ends_at} onNavigate={()=>details.current?.close()} /> :
            <section aria-label="Interviewee details" className="min-w-0 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">            <div className="flex h-24 items-center gap-3"><span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600"><ActionIcon name="eye" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interviewee</p><p className="mt-1 font-semibold">{selected.applicant_name ?? "No interviewee booked"}</p></div></div><div className="mt-4 border-t border-slate-200 pt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-green-800">Your local time</h3><p className="mt-2 text-sm font-medium">{lessonLocalTime(selected.starts_at,selected.ends_at,timeZone).date}</p><p className="mt-1 text-lg font-semibold text-green-950">{lessonLocalTime(selected.starts_at,selected.ends_at,timeZone).time}</p><p className="mt-1 text-sm text-slate-600">{formatTimeZone(timeZone,Date.parse(selected.starts_at))}</p></div></section>}
        </div>
        <p className="font-medium text-slate-700">Duration: {(Date.parse(selected.ends_at)-Date.parse(selected.starts_at))/60000} minutes</p>
        <section><h3 className="font-semibold">About this interview</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">{selected.description || "No description has been added for this interview."}</p></section>
        {selected.applicant_href ? <Link href={selected.applicant_href} onClick={()=>details.current?.close()} className="inline-block font-semibold text-green-800 underline">Review application</Link> : null}
        {admin ? <>
          {selected.status !== "cancelled" ? <a href={selected.meeting_url} target="_blank" rel="noopener noreferrer" className={joinButton}><ActionIcon name="video" />Join interview<ActionIcon name="external" /></a> : null}
          {!detailsMissing ? <section className="space-y-4 border-t border-slate-200 pt-5"><h3 className="font-semibold">Internal assessment</h3>
            {assessments.filter(note=>note.slot_id===selected.id).map(note=><article key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">{note.author_name} · {DateTime.fromISO(note.created_at,{zone:timeZone}).toFormat("d LLL yyyy HH:mm")}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{note.note}</p></article>)}
            {selected.application_id && selected.status==="booked" ? <ActionForm key={`${selected.id}:${selected.application_id}`} action={addInterviewAssessment} preserveOnError submitLabel="Save internal assessment"><input type="hidden" name="slot_id" value={selected.id} /><input type="hidden" name="application_id" value={selected.application_id} /><TextArea compact label="Assessment note (admins only)" name="note" maxLength={4000} rows={3} required /><p className="text-xs text-slate-500">For internal monitoring only. Not visible to the applicant and does not change the final decision.</p></ActionForm> : <p className="text-sm text-slate-500">Assessment notes can be added when an applicant is booked.</p>}
          </section> : null}
        </> : selected.status === "available" && Date.parse(selected.starts_at) > now ? <ActionForm action={bookInterview} submitLabel="Book this interview" preserveOnError><input type="hidden" name="slot_id" value={selected.id} /></ActionForm> : <p role="status">This time is no longer available.</p>}
      </> : <p role="status">This slot has changed. Close this window to see the updated calendar.</p>}</div>
    </dialog>
    {admin && selected && ["available", "booked"].includes(selected.status) && Date.parse(selected.starts_at) > now ? <dialog ref={edit} aria-label="Edit interview" className="fixed inset-0 m-auto max-h-[90dvh] w-[min(600px,95vw)] overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-slate-950/50">
      <header className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Edit interview</h2><button type="button" className={button} onClick={() => edit.current?.close()}><ActionIcon name="close" />Close</button></header>
      <ScheduleSlotEditForm key={`${selected.id}:${selected.starts_at}:${selected.ends_at}`} action={editInterviewSlot} slotId={selected.id} slotType="interview" title={selected.title ?? "Interview"} description={selected.description ?? ""} startsAt={selected.starts_at} endsAt={selected.ends_at} meetingUrl={selected.meeting_url} timeZone={timeZone} booked={selected.status === "booked"} />
    </dialog> : null}
    {admin ? <dialog ref={create} aria-label="Add interview availability" className="fixed inset-0 m-auto max-h-[90dvh] w-[min(600px,95vw)] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-950/50">
      <header className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">Add interview availability</h2><button type="button" className={button} onClick={() => create.current?.close()}><ActionIcon name="close" />Close</button></header>
      <ActionForm key={version} action={createInterviewSlot} submitLabel="Create interview slot" preserveOnError disabled={detailsMissing}>
        {preferencesMissing ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Apply migration 016 to prefill your private meeting link. You can enter it manually below.</p> : null}
        {detailsMissing ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">Apply migration 018 before creating an interview slot.</p> : null}
        <Field compact label="Interview title" name="title" defaultValue={recruitmentRole==="teacher" ? "Teacher interview" : "Student interview"} required maxLength={120} />
        <TextArea compact label="Description (optional)" name="description" rows={3} maxLength={2000} />
        <Select compact label="Interviewee (optional)" name="application_id" defaultValue=""><option value="">Leave available for booking</option>{candidates.toSorted((a,b)=>Number(b.role===recruitmentRole)-Number(a.role===recruitmentRole)||a.full_name.localeCompare(b.full_name)).map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.full_name} - {candidate.email} ({candidate.role})</option>)}</Select>
        <Field compact label="Start date & time" name="starts_at" type="datetime-local" defaultValue={initialStart} required />
        <DurationField compact />
        <TimeZoneSelect defaultValue={timeZone} now={now} />
        <Field compact label="Interview meeting link" name="meeting_url" type="url" defaultValue={meetingUrl} required maxLength={2000} />
      </ActionForm>
    </dialog> : null}
  </section>;
}

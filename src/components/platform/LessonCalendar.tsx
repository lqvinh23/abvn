"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { calendarDisplayRange, calendarLessonLabel, calendarRange, daySegments, formatTimeZone, initialCalendarMinute, lessonKey, type CalendarMode } from "@/src/lib/platform/calendar";
import { calendarSummary, getLessonDisplayStatus, lessonStatuses } from "@/src/lib/platform/dashboard";
import type { CalendarLesson, Role } from "@/src/lib/platform/types";
import AvailabilityForm from "./AvailabilityForm";
import { Field, Select } from "./Fields";
import CalendarGrid from "./CalendarGrid";
import CalendarMonth from "./CalendarMonth";
import LessonDetails from "./LessonDetails";
import { cancelLesson, editCalendarSlot } from "@/src/app/dashboard/actions";
import ActionIcon from "./ActionIcon";
import ScheduleSlotEditForm from "./ScheduleSlotEditForm";
import ActionForm from "./ActionForm";

const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700";

export default function LessonCalendar({ lessons, role, timeZone, now: requestTime, date, mode, view }: {
  lessons: CalendarLesson[]; role: Role; timeZone: string; now: number;
  date: string; mode: CalendarMode; view: string;
}) {
  const [clock, setClock] = useState(requestTime);
  const now = Math.max(requestTime, clock);
  useEffect(() => {
    const nextEnd = Math.min(...lessons.filter(lesson => lesson.is_my_class === false && Date.parse(lesson.ends_at) > now).map(lesson => Date.parse(lesson.ends_at)));
    if (!Number.isFinite(nextEnd)) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.min(Math.max(0, nextEnd - Date.now()), 2147483647));
    return () => clearTimeout(timer);
  }, [lessons, now]);
  const [status, setStatus] = useState("");
  const [person, setPerson] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createStart, setCreateStart] = useState("");
  const [createVersion, setCreateVersion] = useState(0);
  const detail = useRef<HTMLDialogElement>(null);
  const edit = useRef<HTMLDialogElement>(null);
  const create = useRef<HTMLDialogElement>(null);
  const datePicker = useRef<HTMLDetailsElement>(null);
  const range = calendarRange(date, timeZone, now, mode);
  const displayRange = calendarDisplayRange(date, timeZone, now, mode);
  const days = Array.from({ length: Math.round(displayRange.end.diff(displayRange.start, "days").days) }, (_, index) => displayRange.start.plus({ days: index }));
  const visible = lessons.filter(lesson => (!status || getLessonDisplayStatus(lesson, now) === status) && (!person || `${lesson.teacher_name} ${lesson.teacher_number ?? ""} ${lesson.student_name ?? ""} ${lesson.student_number ?? ""}`.toLowerCase().includes(person.toLowerCase())));
  const inRange = visible.filter(lesson => Date.parse(lesson.starts_at) >= range.start.toMillis() && Date.parse(lesson.starts_at) < range.end.toMillis());
  const totals = calendarSummary(inRange, now);
  const step = mode === "month" ? { months: 1 } : mode === "day" ? { days: 1 } : { weeks: 1 };
  const period = mode === "month" ? "month" : mode === "day" ? "day" : "week";
  const selected = lessons.find(lesson => lessonKey(lesson) === selectedKey);
  const selectedDisplayStatus = selected ? getLessonDisplayStatus(selected, now) : null;
  const selectedStatus = selectedDisplayStatus && selectedDisplayStatus !== "other" ? lessonStatuses[selectedDisplayStatus] : null;
  const canEditSelected = (role === "admin" || (role === "teacher" && selected?.is_my_class !== false)) &&
    (selected?.slot_status === "available" || selected?.slot_status === "booked") &&
    !!selected && Date.parse(selected.starts_at) > now;
  const selectedCancelled = selected?.slot_status === "cancelled" || selected?.booking_status === "cancelled";
  const canCancelSelected = !!selected && !selectedCancelled &&
    Date.parse(selected.starts_at) > now &&
    (role !== "student" || Date.parse(selected.starts_at) - now > 12 * 60 * 60 * 1000);
  function href(nextDate: string, nextMode = mode) {
    return `/dashboard/${role}?${new URLSearchParams({ view, date: nextDate, mode: nextMode })}`;
  }
  function openLesson(lesson: CalendarLesson) {
    setSelectedKey(lessonKey(lesson));
    detail.current?.showModal();
  }
  function openCreate(start = "") {
    setCreateStart(start);
    setCreateVersion(version => version + 1);
    create.current?.showModal();
  }
  function time(iso: string) { return DateTime.fromISO(iso, { zone: timeZone }).toFormat("HH:mm ZZZZ"); }
  function summary(lesson: CalendarLesson) {
    return <span className="block font-semibold">{calendarLessonLabel(lesson)}</span>;
  }
  return <section aria-label="Lesson calendar" className="workspace-calendar flex min-h-0 flex-col gap-3">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link scroll={false} href={href(DateTime.fromMillis(now, { zone: timeZone }).toISODate()!)} className={buttonClass}>Today</Link>
        <div className="flex rounded-xl border border-slate-200 bg-white">
          <Link scroll={false} href={href(range.start.minus(step).toISODate()!)} className="flex size-11 items-center justify-center rounded-l-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-green-700" title={`Previous ${period}`} aria-label={`Previous ${period}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5"><path d="m14 6-6 6 6 6" /></svg></Link>
          <Link scroll={false} href={href(range.start.plus(step).toISODate()!)} className="flex size-11 items-center justify-center rounded-r-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-green-700" title={`Next ${period}`} aria-label={`Next ${period}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5"><path d="m10 6 6 6-6 6" /></svg></Link>
        </div>
        <details ref={datePicker} className="relative" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
          <summary className={`${buttonClass} cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden`} aria-label="Choose calendar date">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4"><path d="M8 3v4m8-4v4M4 10h16M4 5h16v16H4Z" /></svg>
            {mode === "month" ? range.start.toFormat("LLLL yyyy") : mode === "day" ? range.start.toFormat("d LLL yyyy") : `${range.start.toFormat("d LLL")} – ${range.end.minus({ days: 1 }).toFormat("d LLL yyyy")}`}
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4 shrink-0 text-slate-500"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <form action={`/dashboard/${role}`} onSubmit={() => { if (datePicker.current) datePicker.current.open = false; }} className="absolute left-0 top-full z-50 mt-2 w-64 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
            <input type="hidden" name="view" value={view} /><input type="hidden" name="mode" value={mode} />
            <Field key={date} type="date" name="date" label="Go to date" defaultValue={date} required /><button className={`${buttonClass} w-full`}>Show date</button>
          </form>
        </details>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Calendar view" className="flex rounded-xl border border-slate-200 bg-white p-1">
          {(["day", "week", "month", "agenda"] as const).map(value => <Link key={value} scroll={false} href={href(date, value)} aria-current={value === mode ? "page" : undefined} className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-green-700 ${value === mode ? "bg-slate-100 text-slate-950" : "text-slate-500 hover:text-slate-900"}`}>{value[0].toUpperCase() + value.slice(1)}</Link>)}
        </nav>
        <button className={`${buttonClass} gap-2`} aria-expanded={filtersOpen} aria-controls="calendar-filters" onClick={() => setFiltersOpen(value => !value)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4"><path d="M4 7h16M4 17h16M8 4v6m8 4v6" /></svg>Filters{person || status ? <span className="flex size-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-900">{Number(!!person) + Number(!!status)}</span> : null}
        </button>
        {role === "teacher" ? <button onClick={() => openCreate()} className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#d7f58b] px-4 text-sm font-semibold text-[#253716] hover:bg-[#c9ed74] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">Create a lesson <span aria-hidden="true" className="text-xl font-normal">+</span></button> : null}
      </div>
    </div>
    <div id="calendar-filters" hidden={!filtersOpen} className="shrink-0">
      <div role="group" aria-label="Calendar filters" className="workspace-filter-bar">
        <Field compact label={role === "student" ? "Teacher name or ID" : "Teacher or student name / ID"} type="search" placeholder="Search by name or ID" value={person} onChange={event => setPerson(event.target.value)} />
        <Select compact label="Lesson status" value={status} onValueChange={setStatus}>
          <option value="">All statuses</option>{Object.entries(lessonStatuses).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </Select>
        <button type="button" title="Clear filters" aria-label="Clear filters" className="workspace-filter-clear" onClick={() => { setPerson(""); setStatus(""); }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
      </div>
      <p className="sr-only">Summaries count classes starting in the selected period and matching filters. Hours include cancelled durations; completed requires attendance and both sides’ written feedback. Only your authorized lessons and profiles are shown. Attendance never automatically bans a student.</p>
    </div>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-100 px-5 py-3">
        <h2 className="text-base font-semibold text-slate-900">{mode === "month" ? range.start.toFormat("LLLL yyyy") : mode === "day" ? range.start.toFormat("cccc") : range.start.hasSame(DateTime.fromMillis(now, { zone: timeZone }), "week") ? "This week" : range.start.toFormat("LLLL yyyy")}</h2>
        <dl aria-label="Schedule summary" aria-describedby="calendar-summary-scope" className="grid w-full grid-cols-2 gap-x-5 gap-y-2 text-sm sm:flex sm:w-auto sm:flex-1 sm:flex-wrap">{[
          { label: "Total classes", value: totals.total },
          { label: "Total hours", value: Number(totals.hours.toFixed(2)) },
          { label: "Available classes", value: totals.available },
          { label: role === "admin" ? "Completed classes" : "Your completed classes", value: totals.completed },
        ].map(metric => <div key={metric.label} className="flex items-baseline gap-2 whitespace-nowrap"><dt className="text-slate-500">{metric.label}</dt><dd className="font-semibold tabular-nums text-slate-900">{metric.value}</dd></div>)}</dl>
        <p id="calendar-summary-scope" role="status" className="sr-only">For classes starting in this {period}{status || person ? ", matching your filters" : ""}.</p>
        <p aria-label="Calendar time zone" className="text-sm font-medium text-slate-600">{formatTimeZone(timeZone, now)}</p>
      </div>
      {mode === "month" ? <CalendarMonth days={days} month={range.start.month} lessons={visible} role={role} now={now} onLesson={openLesson} onCreate={openCreate} /> : mode !== "agenda" ? <CalendarGrid days={days} lessons={visible} role={role} now={now} initialMinute={initialCalendarMinute(lessons, timeZone)} onLesson={openLesson} onCreate={openCreate} /> : null}
    <div className={mode === "month" ? "hidden" : mode === "agenda" ? "space-y-5 p-5" : "space-y-5 p-5 md:hidden"}>
      {days.map(day => {
        const entries = daySegments(visible, day);
        if (!entries.length) return null;
        return <section key={day.toISODate()}><h3 className="mb-3 text-lg font-semibold">{day.toFormat("cccc, d LLLL")}</h3><div className="grid gap-3 xl:grid-cols-2">{entries.map(({ lesson }) => <button key={lessonKey(lesson)} onClick={() => openLesson(lesson)} aria-label={`${calendarLessonLabel(lesson)}, ${time(lesson.starts_at)}, ${lessonStatuses[getLessonDisplayStatus(lesson, now)].label}`} className={`min-h-12 rounded-xl border p-4 text-left text-base leading-7 ${lessonStatuses[getLessonDisplayStatus(lesson, now)].color}`}>{summary(lesson)}</button>)}</div></section>;
      })}
    </div>
      {!visible.length ? <div className="p-6 text-center"><h3 className="text-lg font-semibold">No lessons to display</h3><p className="mt-2 text-slate-600">{person || status ? "Try clearing your filters or choosing another date." : role === "teacher" ? "Create your first lesson time using the button above." : "Try another week to find lessons."}</p></div> : null}
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 px-5 py-3" aria-label="Calendar legend">{Object.entries(lessonStatuses).map(([key, value]) => <span key={key} className="inline-flex items-center gap-2 text-xs text-slate-700"><span aria-hidden="true" className={`size-3 rounded border ${value.color}`} />{value.label}</span>)}</div>
    </div>
    <dialog ref={detail} aria-labelledby="lesson-dialog-title" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); detail.current?.close(); } }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(760px,95vw)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-950/50">
      <div className="sticky top-0 z-20 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="min-w-0"><h2 id="lesson-dialog-title" className="break-words text-xl font-semibold sm:text-2xl">{selected?.title ?? "Lesson updated"}</h2>{selectedStatus ? <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${selectedStatus.color}`}>{selectedStatus.label}</span> : null}</div><div className="flex flex-wrap justify-end gap-2">{canCancelSelected && selected ? <ActionForm action={cancelLesson} className="shrink-0" submitLabel={selected.booking_id ? "Cancel class" : "Remove available time"} icon={selected.booking_id ? "close" : "trash"} iconAndText submitButtonClassName="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700" beforeSubmit={() => window.confirm(selected.booking_id ? "Cancel this booked class? Contact the other participant about rescheduling." : "Remove this available time? If it has booking history, that history will be retained.")}><input type="hidden" name="slot_id" value={selected.slot_id} /></ActionForm> : null}{canEditSelected ? <button type="button" title="Edit lesson" aria-label="Edit lesson" onClick={() => { detail.current?.close(); edit.current?.showModal(); }} className={buttonClass}><ActionIcon name="edit" />Edit</button> : null}<button autoFocus onClick={() => detail.current?.close()} className={buttonClass}><ActionIcon name="close" />Close</button></div></div>
      <div className="p-5 sm:p-8">{selected ? <LessonDetails lesson={selected} role={role} timeZone={timeZone} now={now} onNavigate={() => detail.current?.close()} hideCancelAction /> : <p role="status">This lesson has changed. Close this window to see the updated calendar.</p>}</div>
    </dialog>
    {canEditSelected && selected ? <dialog ref={edit} aria-label="Edit lesson" className="fixed inset-0 m-auto max-h-[90dvh] w-[min(700px,95vw)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-slate-950/50 sm:p-8">
      <header className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Edit lesson</h2><button type="button" className={buttonClass} onClick={() => edit.current?.close()}><ActionIcon name="close" />Close</button></header>
      <ScheduleSlotEditForm key={`${selected.slot_id}:${selected.starts_at}:${selected.ends_at}`} action={editCalendarSlot} slotId={selected.slot_id} slotType="lesson" title={selected.title} description={selected.description} startsAt={selected.starts_at} endsAt={selected.ends_at} meetingUrl={selected.meeting_url ?? ""} timeZone={timeZone} booked={selected.booking_status === "booked"} />
    </dialog> : null}
    {role === "teacher" ? <dialog ref={create} aria-labelledby="create-dialog-title" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); create.current?.close(); } }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(700px,95vw)] overflow-y-auto rounded-2xl border-0 bg-white p-5 shadow-xl backdrop:bg-slate-950/50 sm:p-8"><div className="mb-5 flex items-start justify-between gap-4"><h2 id="create-dialog-title" className="text-2xl font-semibold">Create a lesson</h2><button autoFocus onClick={() => create.current?.close()} className={buttonClass}><ActionIcon name="close" />Close</button></div><p className="mb-5 leading-7 text-slate-600">Publish one time for a student to book. All fields below use your selected time zone.</p><AvailabilityForm key={createVersion} timeZone={timeZone} initialStart={createStart} /></dialog> : null}
  </section>;
}

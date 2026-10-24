"use client";

import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { calendarLessonLabel, currentTimePosition, daySegments, lessonKey } from "@/src/lib/platform/calendar";
import { getLessonDisplayStatus, lessonStatuses } from "@/src/lib/platform/dashboard";
import type { CalendarLesson, Role } from "@/src/lib/platform/types";

const hourHeight = 80;

export default function CalendarGrid({ days, lessons, role, now, initialMinute, onLesson, onCreate, presentation, createLabel = "lesson" }: {
  days: DateTime[]; lessons: CalendarLesson[]; role: Role; now: number;
  initialMinute: number;
  onLesson: (lesson: CalendarLesson) => void; onCreate: (start: string) => void;
  presentation?: (lesson: CalendarLesson) => { label: string; status: string; color: string };
  createLabel?: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(now);
  const firstDate = days[0].toISODate();
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = initialMinute / 60 * hourHeight;
  }, [firstDate, days.length, initialMinute]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const hours = Math.ceil(Math.max(...days.map(day => day.plus({ days: 1 }).diff(day, "hours").hours)));
  const columns = `64px repeat(${days.length}, minmax(0, 1fr))`;
  const timePosition = currentTimePosition(days, clock);
  return <div ref={scroll} tabIndex={0} aria-label={`${createLabel === "lesson" ? "Lesson" : "Interview"} timetable. Scroll for other times, or choose agenda for a list.`} className="relative hidden min-h-0 flex-1 overflow-auto rounded-b-2xl bg-white focus-visible:outline-2 focus-visible:outline-green-700 md:block">
    <div className={days.length === 7 ? "min-w-[940px]" : "min-w-[360px]"}>
      <div className="sticky top-0 z-30 grid h-20 border-b border-slate-200 bg-white" style={{ gridTemplateColumns: columns }}>
        <div className="sticky left-0 z-40 flex items-end justify-center bg-white pb-4 text-xs font-medium text-slate-500">Time</div>
        {days.map(day => {
          const today = day.hasSame(DateTime.fromMillis(clock, { zone: day.zone }), "day");
          return <div key={day.toISODate()} className="flex items-center justify-center border-l border-slate-100 px-1">
            <div className={`min-w-16 rounded-xl px-3 py-2 text-center ${today ? "bg-green-50 text-green-950" : "text-slate-500"}`}>
              <p className="text-xs font-medium uppercase tracking-wider">{day.toFormat("ccc")}</p>
              <p className={`mt-1 text-xl font-semibold ${today ? "text-green-950" : "text-slate-900"}`}>{day.toFormat("d")}</p>
              {day.offset !== day.plus({ days: 1 }).offset ? <span className="block text-[10px]" title="Clocks change today; local hour labels appear in this column">Clock change</span> : null}
            </div>
          </div>;
        })}
      </div>
      <div className="relative grid" style={{ gridTemplateColumns: columns }}>
        <div className="sticky left-0 z-20 bg-white" style={{ height: hours * hourHeight }}>
          {Array.from({ length: hours }, (_, hour) => <span key={hour} className="absolute right-3 text-xs tabular-nums text-slate-500" style={{ top: hour * hourHeight + 8 }}>{`${String(hour).padStart(2, "0")}:00`}</span>)}
        </div>
        {days.map(day => {
          const minutes = day.plus({ days: 1 }).diff(day, "minutes").minutes;
          const segments = daySegments(lessons, day);
          const localNow = DateTime.fromMillis(clock, { zone: day.zone });
          const isToday = day.hasSame(localNow, "day");
          const changedClock = day.offset !== day.plus({ days: 1 }).offset;
          return <div key={day.toISODate()} className={`relative border-l border-slate-100 ${isToday ? "bg-slate-50" : ""}`} style={{ height: hours * hourHeight }}>
            {Array.from({ length: Math.ceil(minutes / 30) }, (_, halfHour) => {
              const local = day.plus({ minutes: halfHour * 30 });
              const canCreate = role === "teacher" && local.toMillis() > clock;
              return <div key={halfHour} className={`absolute w-full border-t border-slate-100 ${halfHour % 2 ? "border-dashed" : ""}`} style={{ top: halfHour * hourHeight / 2, height: Math.min(30, minutes - halfHour * 30) / 60 * hourHeight }}>
                {canCreate ? <button type="button" onClick={() => onCreate(local.toFormat("yyyy-MM-dd'T'HH:mm"))} className="group relative flex h-full w-full items-center justify-center text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-2 focus-visible:outline-green-700" aria-label={`Create ${createLabel === "lesson" ? "a" : "an"} ${createLabel} ${local.toFormat("cccc d LLLL HH:mm ZZZZ")}`}><span aria-hidden="true" className="invisible rounded-full bg-white p-2 text-sm shadow-sm group-hover:visible group-focus-visible:visible">+ Add {createLabel}</span></button> : null}
                {changedClock ? <span className="pointer-events-none absolute left-1 top-1 text-[10px] text-slate-500">{local.toFormat("HH:mm ZZZZ")}</span> : null}
              </div>;
            })}
            {segments.map(({ lesson, top, duration, lane, lanes }) => {
              const display = presentation?.(lesson);
              const status = { ...lessonStatuses[getLessonDisplayStatus(lesson, clock)], ...(display ? { label: display.status, color: display.color } : {}) };
              const label = `${display?.label ?? calendarLessonLabel(lesson)}, ${DateTime.fromISO(lesson.starts_at, { zone: day.zone }).toFormat("HH:mm ZZZZ")} to ${DateTime.fromISO(lesson.ends_at, { zone: day.zone }).toFormat("HH:mm ZZZZ")}, ${status.label}`;
              return <button key={lessonKey(lesson)} onClick={() => onLesson(lesson)} aria-label={label} title={label} style={{ top: top / 60 * hourHeight + 2, height: Math.max(28, duration / 60 * hourHeight - 4), left: `calc(${lane * 100 / lanes}% + 4px)`, width: `calc(${100 / lanes}% - 8px)` }} className={`absolute z-10 flex flex-col overflow-hidden rounded-xl border px-2.5 py-1 text-left shadow-xs transition-[box-shadow,filter] hover:brightness-95 hover:shadow-md focus-visible:z-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800 ${status.color}`}>
                <span className={`line-clamp-2 w-full font-semibold ${duration <= 30 ? "text-xs leading-[14px]" : "text-sm leading-5"}`}>{display?.label ?? calendarLessonLabel(lesson)}</span>
              </button>;
            })}
          </div>;
        })}
        {timePosition !== null ? <div aria-label={`Current time ${DateTime.fromMillis(clock, { zone: days[0].zone }).toFormat("HH:mm")}`} className="pointer-events-none absolute left-16 right-0 z-20 border-t-2 border-rose-400" style={{ top: timePosition / 60 * hourHeight }}><span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-rose-400" /></div> : null}
      </div>
    </div>
  </div>;
}

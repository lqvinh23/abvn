"use client";

import { DateTime } from "luxon";
import { useState } from "react";
import { calendarLessonLabel, daySegments, lessonKey } from "@/src/lib/platform/calendar";
import { getLessonDisplayStatus, lessonStatuses } from "@/src/lib/platform/dashboard";
import type { CalendarLesson, Role } from "@/src/lib/platform/types";

export default function CalendarMonth({ days, month, lessons, role, now, onLesson, onCreate, presentation, createLabel = "lesson" }: {
  days: DateTime[]; month: number; lessons: CalendarLesson[]; role: Role; now: number;
  onLesson: (lesson: CalendarLesson) => void; onCreate: (start: string) => void;
  presentation?: (lesson: CalendarLesson) => { label: string; status: string; color: string };
  createLabel?: string;
}) {
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  return <div aria-label="Month calendar" className="overflow-x-auto">
    <div className="min-w-[700px]">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/60">{days.slice(0, 7).map(day => <div key={day.weekday} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">{day.toFormat("ccc")}</div>)}</div>
      <div className="grid grid-cols-7">{days.map(day => {
        const key = day.toISODate()!;
        const entries = daySegments(lessons, day);
        const expanded = expandedDays.includes(key);
        const today = day.hasSame(DateTime.fromMillis(now, { zone: day.zone }), "day");
        return <section key={key} aria-label={day.toFormat("cccc d LLLL yyyy")} className={`min-h-36 min-w-0 border-b border-r border-slate-100 p-2 ${day.month !== month ? "bg-slate-50 text-slate-400" : "bg-white text-slate-700"}`}>
          <div className="mb-2 flex items-center justify-between gap-1"><h3 className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${today ? "bg-green-800 text-white" : ""}`}>{day.day}</h3>{role === "teacher" && day.endOf("day").toMillis() > now ? <button onClick={() => onCreate(day.toFormat("yyyy-MM-dd") + "T09:00")} aria-label={`Create ${createLabel === "lesson" ? "a" : "an"} ${createLabel} ${day.toFormat("d LLLL yyyy")}`} className="flex size-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-green-700">+</button> : null}</div>
          <div className="space-y-1.5">{(expanded ? entries : entries.slice(0, 3)).map(({ lesson }) => {
            const display = presentation?.(lesson);
            const status = { ...lessonStatuses[getLessonDisplayStatus(lesson, now)], ...(display ? { label: display.status, color: display.color } : {}) };
            const label = display?.label ?? calendarLessonLabel(lesson);
            return <button key={lessonKey(lesson)} onClick={() => onLesson(lesson)} title={`${label} · ${DateTime.fromISO(lesson.starts_at, { zone: day.zone }).toFormat("HH:mm")} · ${status.label}`} aria-label={`${label}, ${DateTime.fromISO(lesson.starts_at, { zone: day.zone }).toFormat("HH:mm ZZZZ")}, ${status.label}`} className={`min-h-11 w-full rounded-lg border px-2 py-1.5 text-left text-xs font-medium leading-4 focus-visible:outline-2 focus-visible:outline-green-700 ${status.color}`}><span className="line-clamp-2">{label}</span></button>;
          })}</div>
          {entries.length > 3 ? <button onClick={() => setExpandedDays(values => expanded ? values.filter(value => value !== key) : [...values, key])} aria-expanded={expanded} className="mt-1 min-h-11 w-full rounded-lg text-left text-xs font-semibold text-slate-700 hover:bg-slate-100">{expanded ? "Show fewer" : `+ ${entries.length - 3} more lesson${entries.length === 4 ? "" : "s"}`}</button> : null}
        </section>;
      })}</div>
    </div>
  </div>;
}

import { DateTime } from "luxon";
import type { CalendarLesson } from "./types.ts";

export type CalendarMode = "week" | "day" | "month" | "agenda";

export function calendarRange(date: string | undefined, zone: string, now: number, mode: CalendarMode | "month") {
  const today = DateTime.fromMillis(now, { zone });
  const requested = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? DateTime.fromISO(date, { zone }) : today;
  const valid = requested.isValid ? requested : today;
  const start = valid.startOf(mode === "month" ? "month" : mode === "day" ? "day" : "week");
  const end = start.plus(mode === "month" ? { months: 1 } : mode === "day" ? { days: 1 } : { weeks: 1 });
  return { start, end, date: valid.toISODate()!, from: start.toUTC().toISO()!, to: end.toUTC().toISO()! };
}

export function calendarDisplayRange(date: string | undefined, zone: string, now: number, mode: CalendarMode) {
  const range = calendarRange(date, zone, now, mode);
  if (mode !== "month") return range;
  const start = range.start.startOf("week");
  const end = range.end.minus({ days: 1 }).startOf("week").plus({ weeks: 1 });
  return { ...range, start, end, from: start.toUTC().toISO()!, to: end.toUTC().toISO()! };
}

export function calendarLessonLabel(lesson: Pick<CalendarLesson, "teacher_name" | "student_name" | "student_number" | "is_my_class" | "can_book" | "slot_status">) {
  if (lesson.is_my_class === false && lesson.slot_status !== "available" && !lesson.can_book && !lesson.student_name) {
    return `${lesson.teacher_name} - Class`;
  }
  return `${lesson.teacher_name} - ${lesson.student_name ? `${lesson.student_name}${lesson.student_number === null ? "" : ` (${lesson.student_number})`}` : "Available"}`;
}

export function formatUtcOffset(zone: string, timestamp: number) {
  const offset = DateTime.fromMillis(timestamp, { zone }).offset;
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `UTC${offset < 0 ? "-" : "+"}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export function formatTimeZone(zone: string, timestamp: number) {
  return `${zone.replaceAll("_", " ")} (${formatUtcOffset(zone, timestamp)})`;
}

export function lessonLocalTime(startsAt: string, endsAt: string, zone: string) {
  const start = DateTime.fromISO(startsAt, { zone });
  const end = DateTime.fromISO(endsAt, { zone });
  return {
    date: start.toFormat("cccc, d LLLL yyyy"),
    time: `${start.toFormat("HH:mm")} – ${end.hasSame(start, "day") ? end.toFormat("HH:mm") : end.toFormat("d LLL yyyy, HH:mm")}`,
    zone: `${formatTimeZone(zone, start.toMillis())}${start.offset !== end.offset ? ` → ${formatTimeZone(zone, end.toMillis())}` : ""}`,
  };
}

export function currentTimePosition(days: DateTime[], now: number) {
  const local = DateTime.fromMillis(now, { zone: days[0].zone });
  if (!days.some(day => day.hasSame(local, "day"))) return null;
  return local.diff(local.startOf("day"), "minutes").minutes;
}

export function lessonKey(lesson: CalendarLesson) {
  return `${lesson.slot_id}:${lesson.booking_id ?? "available"}`;
}

export function initialCalendarMinute(lessons: Pick<CalendarLesson, "starts_at">[], zone: string) {
  if (!lessons.length) return 8 * 60;
  const earliest = Math.min(...lessons.map(lesson => {
    const time = DateTime.fromISO(lesson.starts_at, { zone });
    return time.hour * 60 + time.minute;
  }));
  return Math.max(0, earliest - 60);
}

export function daySegments(lessons: CalendarLesson[], day: DateTime) {
  const start = day.startOf("day");
  const end = start.plus({ days: 1 });
  const items = lessons.flatMap(lesson => {
    const from = Math.max(Date.parse(lesson.starts_at), start.toMillis());
    const to = Math.min(Date.parse(lesson.ends_at), end.toMillis());
    return to > from ? [{ lesson, top: (from - start.toMillis()) / 60000, duration: (to - from) / 60000, lane: 0, lanes: 1 }] : [];
  }).sort((a, b) => a.top - b.top || b.duration - a.duration);
  let group: typeof items = [];
  let groupEnd = -1;
  function finish() {
    const count = Math.max(1, ...group.map(item => item.lane + 1));
    group.forEach(item => { item.lanes = count; });
    group = [];
  }
  for (const item of items) {
    if (item.top >= groupEnd) finish();
    const occupied = new Set(group.filter(other => other.top + other.duration > item.top).map(other => other.lane));
    while (occupied.has(item.lane)) item.lane++;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.top + item.duration);
  }
  finish();
  return items;
}

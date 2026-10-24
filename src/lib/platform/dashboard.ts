import type { Role, Lesson } from "./types";

export const workspaceViews = {
  teacher: ["schedule", "feedback", "history", "students", "notifications", "settings"],
  student: ["schedule", "feedback", "history", "notifications", "settings"],
  admin: ["schedule", "statistics", "teachers", "students", "content", "settings"],
} as const;

export const viewLabels: Record<string, string> = {
  schedule: "Schedule", feedback: "Feedback", history: "History",
  notifications: "Notifications", settings: "Systems", statistics: "Statistics",
  teachers: "Teacher management", students: "Student management", content: "Web content",
};

export function getDashboardView(role: Role, value: string | string[] | undefined) {
  if (role === "admin" && value === "academic") return "schedule";
  const views: readonly string[] = workspaceViews[role];
  return typeof value === "string" && views.includes(value) ? value : views[0];
}

export type StatisticsPeriod = "week" | "month" | "quarter" | "year";

export function isValidStatisticsAnchor(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function statisticsWeeksInIsoYear(year: number) {
  const jan1 = new Date(0);
  jan1.setUTCFullYear(year, 0, 1);
  jan1.setUTCHours(0, 0, 0, 0);
  const jan1Weekday = jan1.getUTCDay();
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return jan1Weekday === 4 || (jan1Weekday === 3 && leapYear) ? 53 : 52;
}

function isoWeekStart(year: number, week: number) {
  const jan4 = new Date(0);
  jan4.setUTCFullYear(year, 0, 4);
  jan4.setUTCHours(0, 0, 0, 0);
  const weekday = jan4.getUTCDay() || 7;
  jan4.setUTCDate(jan4.getUTCDate() - weekday + 1 + (week - 1) * 7);
  return jan4;
}

export function statisticsAnchorForSelection(period: StatisticsPeriod, year: number, bucket = 1) {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(bucket)) return null;
  if (period === "week") {
    if (bucket < 1 || bucket > statisticsWeeksInIsoYear(year)) return null;
    const anchor = isoWeekStart(year, bucket).toISOString().slice(0, 10);
    return isValidStatisticsAnchor(anchor) ? anchor : null;
  }
  if (period === "month") {
    if (bucket < 1 || bucket > 12) return null;
    return `${String(year).padStart(4, "0")}-${String(bucket).padStart(2, "0")}-01`;
  }
  if (period === "quarter") {
    if (bucket < 1 || bucket > 4) return null;
    return `${String(year).padStart(4, "0")}-${String((bucket - 1) * 3 + 1).padStart(2, "0")}-01`;
  }
  if (bucket !== 1) return null;
  return `${String(year).padStart(4, "0")}-01-01`;
}

export function statisticsSelection(anchor: string, period: StatisticsPeriod) {
  if (!isValidStatisticsAnchor(anchor)) return null;
  const date = new Date(`${anchor}T00:00:00.000Z`);
  if (period === "week") {
    const weekday = date.getUTCDay() || 7;
    const thursday = new Date(date);
    thursday.setUTCDate(thursday.getUTCDate() + 4 - weekday);
    const year = thursday.getUTCFullYear();
    const week = Math.floor((date.getTime() - isoWeekStart(year, 1).getTime()) / 604_800_000) + 1;
    return { year, bucket: week };
  }
  const year = date.getUTCFullYear();
  return { year, bucket: period === "month" ? date.getUTCMonth() + 1 : period === "quarter" ? Math.floor(date.getUTCMonth() / 3) + 1 : 1 };
}

export const attendanceLabels = { present: "Yes", absent: "No", apologized: "No but Apologize", cancelled: "Cancelled" } as const;

export type DisplayStatus = "available" | "booked" | "follow-up" | "completed" | "absence" | "apologized" | "cancelled" | "expired" | "other";
export const lessonStatuses: Record<DisplayStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "border-green-700 bg-green-50 text-green-950" },
  booked: { label: "Booked", color: "border-[#7960b7] bg-[#ddd0f5] text-[#38205e]" },
  "follow-up": { label: "Follow-up needed", color: "border-[#bd7d13] bg-[#ffe096] text-[#583708]" },
  completed: { label: "Completed", color: "border-[#8794a6] bg-[#cbd5e1] text-[#1e293b]" },
  absence: { label: "Absent", color: "border-[#c83e3e] bg-[#fecaca] text-[#701b1b]" },
  apologized: { label: "Absent with apology", color: "border-[#be5890] bg-[#fbcfe8] text-[#701c4a]" },
  cancelled: { label: "Cancelled", color: "border-[#7c3fa3] bg-[#e9c6fa] text-[#4b1b67]" },
  expired: { label: "Unbooked / past", color: "border-[#b0b8c4] bg-[#f1f5f9] text-[#475569]" },
  other: { label: "Other classes", color: "border-[#64748b] bg-[#e2e8f0] text-[#1e293b]" },
};

export function getLessonDisplayStatus(lesson: Lesson, now: number): DisplayStatus {
  if (lesson.is_my_class === false) {
    if (Date.parse(lesson.ends_at) > now && (lesson.slot_status === "available" || lesson.slot_status === "booked")) return lesson.slot_status;
    return "other";
  }
  if (lesson.slot_status === "cancelled" || lesson.booking_status === "cancelled") return "cancelled";
  if (!lesson.booking_id) return Date.parse(lesson.ends_at) <= now ? "expired" : "available";
  if (lesson.attendance === "absent") return "absence";
  if (lesson.attendance === "apologized") return "apologized";
  if (Date.parse(lesson.ends_at) > now) return "booked";
  if (lesson.attendance === "present" && lesson.teacher_comment && lesson.student_comment) return "completed";
  return "follow-up";
}

export function needsMyFeedback(lesson: Lesson, role: Role, now: number) {
  if (!lesson.booking_id || Date.parse(lesson.ends_at) > now || getLessonDisplayStatus(lesson, now) === "cancelled") return false;
  return role === "teacher" ? !lesson.attendance || !lesson.teacher_comment : role === "student" ? !lesson.student_comment : false;
}

export function calendarSummary(lessons: Lesson[], now: number) {
  const unique = new Map<string, Lesson>();
  for (const lesson of lessons) {
    const previous = unique.get(lesson.slot_id);
    if (!previous || getLessonDisplayStatus(previous, now) === "cancelled") unique.set(lesson.slot_id, lesson);
  }
  const classes = [...unique.values()];
  return {
    total: classes.length,
    hours: classes.reduce((sum, lesson) => sum + (Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 3600000, 0),
    available: classes.filter(lesson => getLessonDisplayStatus(lesson, now) === "available").length,
    completed: classes.filter(lesson => getLessonDisplayStatus(lesson, now) === "completed").length,
  };
}

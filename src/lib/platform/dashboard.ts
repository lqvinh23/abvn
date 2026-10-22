import type { Role, Lesson } from "./types";

export const workspaceViews = {
  teacher: ["schedule", "feedback", "history", "students", "notifications", "settings"],
  student: ["schedule", "feedback", "history", "notifications", "settings"],
  admin: ["academic", "teachers", "students", "content", "settings"],
} as const;

export const viewLabels: Record<string, string> = {
  schedule: "Schedule", feedback: "Feedback", history: "History",
  notifications: "Notifications", settings: "Settings", academic: "Academic",
  teachers: "Teacher management", students: "Student management", content: "Web content",
};

export function getDashboardView(role: Role, value: string | string[] | undefined) {
  const views: readonly string[] = workspaceViews[role];
  return typeof value === "string" && views.includes(value) ? value : views[0];
}

export const attendanceLabels = { present: "Yes", absent: "No", apologized: "No but Apologize", cancelled: "Cancelled" } as const;

export type DisplayStatus = "available" | "booked" | "follow-up" | "completed" | "absence" | "apologized" | "cancelled" | "expired" | "other";
export const lessonStatuses: Record<DisplayStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "border-[#438629] bg-[#cdebb8] text-[#203c16]" },
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

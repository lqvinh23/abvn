export type SettingValue = string | number | boolean;
export type SettingValues = Record<string, SettingValue>;
export type SettingKind = "integer" | "boolean" | "text" | "email" | "time" | "timezone" | "choice";
export type SettingField = {
  key: string;
  label: string;
  help: string;
  kind: SettingKind;
  min?: number;
  max?: number;
  maxLength?: number;
  unit?: string;
  options?: { value: string | number; label: string }[];
  wide?: boolean;
};
export type SettingGroup = { id: string; title: string; description: string; fields: SettingField[]; twoColumns?: boolean };
export type PlatformSettingsReport = {
  values: SettingValues;
  customized: string[];
  history: { key: string; old_value: SettingValue | null; new_value: SettingValue | null; note: string; changed_by: string | null; changed_at: string }[];
};
export type MemberPolicySummary = SettingValues;

export const weekdayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((label, index) => ({ value: index + 1, label }));
const restrictionOptions = [
  { value: "none", label: "No automatic action" },
  { value: "suspended", label: "Suspend" },
  { value: "banned", label: "Ban" },
];

export const settingGroups: SettingGroup[] = [
  {
    id: "general", title: "Programme time",
    description: "Weeks run Monday to Sunday. Every weekly rule below is evaluated in this time zone on the server.",
    fields: [
      { key: "rule_time_zone", label: "Rule time zone", kind: "timezone", help: "Used for weekly quotas, the next-week opening time and rule dates." },
    ],
  },
  {
    id: "booking", title: "Booking",
    description: "Who can book which lessons, and when. A student's lesson week is the week the lesson starts in.",
    fields: [
      { key: "weekly_standard_lessons", label: "Standard lessons per week", kind: "integer", min: 1, max: 14, unit: "lessons", help: "Lessons a student can book at any time within the booking window." },
      { key: "weekly_max_lessons", label: "Maximum lessons per week", kind: "integer", min: 1, max: 14, unit: "lessons", help: "Lessons above the standard number are extra lessons, up to this maximum." },
      { key: "extra_booking_hours", label: "Extra lessons open before start", kind: "integer", min: 1, max: 168, unit: "hours", help: "Extra lessons can be booked only when they are still available this many hours before they start." },
      { key: "distinct_teachers_per_week", label: "A different teacher for every lesson in a week", kind: "boolean", help: "Students cannot book two lessons with the same teacher in one week.", wide: true },
      { key: "next_week_opens_day", label: "Next week opens for booking on", kind: "choice", options: weekdayOptions, help: "Lessons in the following week can be booked from this day of the current week." },
      { key: "next_week_opens_time", label: "Next week opens for booking at", kind: "time", help: "Local time in the rule time zone." },
      { key: "require_feedback_before_booking", label: "Feedback required before booking", kind: "boolean", help: "Students must write feedback for finished lessons they attended before booking another lesson.", wide: true },
    ],
  },
  {
    id: "cancellation", title: "Cancellation",
    description: "Students who need to cancel inside the cut-off must email their teacher and copy the Education Affairs team.",
    fields: [
      { key: "student_cancel_cutoff_hours", label: "Student cancellation cut-off", kind: "integer", min: 0, max: 720, unit: "hours", help: "Students cannot cancel within this many hours of the start. Use 0 to allow cancellation any time." },
      { key: "education_affairs_email", label: "Education Affairs (EA) team email", kind: "email", maxLength: 254, help: "Shown in the cancellation message so students know who to copy. Optional." },
    ],
  },
  {
    id: "interview-cancellation", title: "Interview cancellation",
    description: "Applicants can cancel or reschedule their booked interview until the configured cut-off.",
    fields: [
      { key: "interview_cancel_cutoff_hours", label: "Interview cancellation cut-off", kind: "integer", min: 0, max: 720, unit: "hours", help: "Applicants cannot cancel within this many hours of their interview. Use 0 to allow cancellation any time before the interview starts." },
    ],
  },
  {
    id: "restrictions", title: "Attendance and student status", twoColumns: true,
    description: "Applied automatically when a teacher records attendance, and by the periodic review. A ban or suspension is never lowered automatically.",
    fields: [
      { key: "absent_without_apology_action", label: "Absent without apology", kind: "choice", options: restrictionOptions, help: "Action when a teacher records the student as absent (No)." },
      { key: "absent_without_apology_days", label: "Restriction length after absence without apology", kind: "integer", min: 0, max: 365, unit: "days", help: "0 keeps the restriction until an admin restores access." },
      { key: "absent_with_apology_action", label: "Absent with apology", kind: "choice", options: restrictionOptions, help: "Action when a teacher records the student as absent but apologised (No but Apologize)." },
      { key: "absent_with_apology_days", label: "Restriction length after absence with apology", kind: "integer", min: 0, max: 365, unit: "days", help: "A timed suspension ends automatically; 0 keeps it until an admin restores access." },
      { key: "inactivity_weeks", label: "Make Inactive after no attendance for", kind: "integer", min: 0, max: 52, unit: "weeks", help: "Students who attend no lesson for this many consecutive weeks become Inactive. Use 0 to turn this off." },
    ],
  },
  {
    id: "study", title: "Study period and fees",
    description: "Newly approved students study free for the set period. Further study is paid by package and extended by an admin from the student's Edit page.",
    fields: [
      { key: "free_study_months", label: "Free study period", kind: "integer", min: 1, max: 36, unit: "months", help: "Applies to students approved from now on; existing expiry dates do not change." },
      { key: "enforce_study_expiry", label: "Block booking after the study period ends", kind: "boolean", help: "Students keep their history but cannot book lessons until an admin extends the expiry date.", wide: true },
      { key: "extension_months", label: "Paid extension", kind: "integer", min: 1, max: 36, unit: "months", help: "Extra study time granted by a paid package." },
      { key: "extension_price_vnd", label: "Price per lesson", kind: "integer", min: 0, max: 10000000, unit: "VND", help: "Shown to students whose study period has ended." },
      { key: "extension_min_lessons", label: "Minimum package", kind: "integer", min: 1, max: 1000, unit: "lessons", help: "Lessons that must be bought at one time." },
      { key: "extension_max_lessons", label: "Maximum package", kind: "integer", min: 1, max: 1000, unit: "lessons", help: "Most lessons that can be bought at one time." },
      { key: "payment_bank_name", label: "Bank name", kind: "text", maxLength: 100, help: "Receiving bank for fees." },
      { key: "payment_account_name", label: "Account holder", kind: "text", maxLength: 100, help: "Name on the receiving account." },
      { key: "payment_account_number", label: "Account number", kind: "text", maxLength: 40, help: "Shown only to students and admins." },
      { key: "payment_note", label: "Transfer instructions", kind: "text", maxLength: 300, help: "For example the transfer description students should use.", wide: true },
    ],
  },
  {
    id: "eligibility", title: "Student eligibility",
    description: "Applied to new student applications on the server.",
    fields: [
      { key: "student_min_age", label: "Minimum age", kind: "integer", min: 10, max: 100, unit: "years", help: "Age on the day the application is submitted." },
      { key: "student_max_age", label: "Maximum age", kind: "integer", min: 10, max: 100, unit: "years", help: "Older applicants are asked to contact ABVN." },
    ],
  },
  {
    id: "teachers", title: "Teachers",
    description: "Limits for teacher-published lessons.",
    fields: [
      { key: "teacher_publish_days_ahead", label: "Publish lessons up to", kind: "integer", min: 7, max: 365, unit: "days ahead", help: "Teachers cannot publish lessons further ahead than this." },
    ],
  },
];

export const settingFields = settingGroups.flatMap(group => group.fields);
export const settingLabels = Object.fromEntries(settingFields.map(field => [field.key, field.label]));

type FormValues = { get(key: string): FormDataEntryValue | null; getAll(key: string): FormDataEntryValue[] };

export function settingsFromForm(form: FormValues): SettingValues {
  const values: SettingValues = {};
  for (const field of settingFields) {
    if (field.kind === "boolean") { values[field.key] = form.getAll(field.key).includes("true"); continue; }
    const raw = form.get(field.key);
    if (typeof raw !== "string") throw new Error(`Enter ${field.label.toLowerCase()}.`);
    const value = raw.trim();
    if (field.kind === "integer" || (field.kind === "choice" && typeof field.options?.[0]?.value === "number")) {
      if (!/^-?\d{1,9}$/.test(value)) throw new Error(`${field.label} must be a whole number.`);
      const number = Number(value);
      const [min, max] = field.kind === "choice" ? [1, field.options!.length] : [field.min!, field.max!];
      if (number < min || number > max) throw new Error(`${field.label} must be from ${min} to ${max}.`);
      values[field.key] = number;
    } else if (field.kind === "choice") {
      if (!field.options!.some(option => option.value === value)) throw new Error(`Choose a valid option for ${field.label.toLowerCase()}.`);
      values[field.key] = value;
    } else {
      if (field.kind === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`${field.label} must be a 24-hour time such as 09:00.`);
      if (field.kind === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`${field.label} must be a valid email address or empty.`);
      if (field.kind === "timezone" && !value) throw new Error(`Choose ${field.label.toLowerCase()}.`);
      if (field.maxLength && value.length > field.maxLength) throw new Error(`${field.label} is too long (maximum ${field.maxLength} characters).`);
      values[field.key] = value;
    }
  }
  return values;
}

export function formatSettingValue(key: string, value: SettingValue | null | undefined) {
  const field = settingFields.find(item => item.key === key);
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (field?.options) return field.options.find(option => option.value === value)?.label ?? String(value);
  if (value === "") return "Empty";
  if (key === "extension_price_vnd" && typeof value === "number") return `${value.toLocaleString("en-US")} VND`;
  return field?.unit && typeof value === "number" ? `${value} ${field.unit}` : String(value);
}

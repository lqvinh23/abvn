import { weekdayOptions, type SettingValues } from "./settings.ts";

export type RuleSection = { title: string; items: string[] };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const hours = (count: number) => plural(count, "hour");
const days = (count: number) => plural(count, "day");
const num = (values: SettingValues, key: string) => Number(values[key]);
const text = (values: SettingValues, key: string) => String(values[key] ?? "");

function restriction(action: string, length: number, subject: string) {
  if (action === "none") return "no automatic action is taken";
  const label = action === "banned" ? "banned" : "suspended";
  return length > 0 ? `${subject} ${label} for ${days(length)}` : `${subject} ${label} until an admin restores access`;
}

export function memberRuleSections(values: SettingValues, role: "student" | "teacher"): RuleSection[] {
  const opens = weekdayOptions.find(option => option.value === num(values, "next_week_opens_day"))?.label ?? "Saturday";
  const cutoff = num(values, "student_cancel_cutoff_hours");
  const contact = text(values, "education_affairs_email");
  const inactivity = num(values, "inactivity_weeks");
  const subject = role === "student" ? "you are" : "the student is";
  const attendance = [
    `Absent without apology: ${restriction(text(values, "absent_without_apology_action"), num(values, "absent_without_apology_days"), subject)}.`,
    `Absent with apology: ${restriction(text(values, "absent_with_apology_action"), num(values, "absent_with_apology_days"), subject)}.`,
    ...(inactivity > 0 ? [role === "student"
      ? `If you attend no lesson for ${plural(inactivity, "week")} in a row, you become Inactive.`
      : `A student who attends no lesson for ${plural(inactivity, "week")} in a row becomes Inactive.`] : []),
  ];
  const booking = [
    `${role === "student" ? "You can book" : "Students can book"} ${plural(num(values, "weekly_standard_lessons"), "lesson")} per week. Up to ${num(values, "weekly_max_lessons")} lessons per week are allowed when the extra lessons are still available ${hours(num(values, "extra_booking_hours"))} before they start.`,
    ...(values.distinct_teachers_per_week ? ["Every lesson in a week must be with a different teacher."] : []),
    `Lessons in the next week open for booking on ${opens} at ${text(values, "next_week_opens_time")} (${text(values, "rule_time_zone")}).`,
    ...(values.require_feedback_before_booking ? [`${role === "student" ? "You" : "Students"} must write feedback for ${role === "student" ? "your" : "their"} previous lessons before booking another.`] : []),
  ];
  const cancellation = [cutoff > 0
    ? `A booked lesson cannot be cancelled within ${hours(cutoff)} of its start. To cancel inside this period, email the teacher and CC the ABVN Education Affairs (EA) team${contact ? ` (${contact})` : ""}.`
    : "A booked lesson can be cancelled at any time before it starts."];
  if (role === "teacher") {
    return [
      { title: "Publishing lessons", items: [`You can publish lessons up to ${days(num(values, "teacher_publish_days_ahead"))} ahead.`] },
      { title: "How students book", items: [...booking, ...cancellation] },
      { title: "Recording attendance", items: ["Choose the student's attendance after each lesson. The result applies automatically:", ...attendance] },
    ];
  }
  const price = `${num(values, "extension_price_vnd").toLocaleString("en-US")} VND`;
  const bank = [text(values, "payment_bank_name"), text(values, "payment_account_name"), text(values, "payment_account_number")].filter(Boolean);
  const study = [
    `New students study free for ${plural(num(values, "free_study_months"), "month")}.`,
    `To study ${plural(num(values, "extension_months"), "more month")}, buy a package of ${num(values, "extension_min_lessons")} to ${num(values, "extension_max_lessons")} lessons at one time for ${price} per lesson, then ask ABVN to extend your study period.`,
    ...(values.enforce_study_expiry ? ["You cannot book lessons after your study period ends until ABVN extends it."] : []),
    ...(bank.length ? [`Pay to: ${bank.join(" · ")}.`] : []),
    ...(text(values, "payment_note") ? [text(values, "payment_note")] : []),
  ];
  return [
    { title: "Booking", items: booking },
    { title: "Cancellation", items: cancellation },
    { title: "Attendance", items: ["Your teacher records whether you attended. The result applies automatically:", ...attendance] },
    { title: "Study period and fees", items: study },
  ];
}

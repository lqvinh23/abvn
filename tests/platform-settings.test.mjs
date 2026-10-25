import assert from "node:assert/strict";
import test from "node:test";
import { formatSettingValue, settingFields, settingsFromForm } from "../src/lib/platform/settings.ts";
import { memberRuleSections } from "../src/lib/platform/rules-text.ts";

const defaults = {
  rule_time_zone: "Asia/Ho_Chi_Minh", weekly_standard_lessons: 2, weekly_max_lessons: 4, extra_booking_hours: 5, distinct_teachers_per_week: true,
  next_week_opens_day: 6, next_week_opens_time: "09:00", require_feedback_before_booking: true, student_cancel_cutoff_hours: 24,
  education_affairs_email: "ea@abvn.test", absent_without_apology_action: "banned", absent_without_apology_days: 0,
  absent_with_apology_action: "suspended", absent_with_apology_days: 14, inactivity_weeks: 4, free_study_months: 6, enforce_study_expiry: true,
  extension_months: 6, extension_price_vnd: 30000, extension_min_lessons: 10, extension_max_lessons: 50, payment_bank_name: "ABC Bank",
  payment_account_name: "ABVN", payment_account_number: "123456", payment_note: "Use your student ID", student_min_age: 16, student_max_age: 25,
  teacher_publish_days_ahead: 180,
};
const formFor = values => {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) if (typeof value === "boolean") { if (value) form.append(key, "true"); } else form.append(key, String(value));
  return form;
};

test("every setting has an editor field and the form round-trips the defaults", () => {
  assert.deepEqual(settingFields.map(field => field.key).sort(), Object.keys(defaults).sort());
  assert.deepEqual(settingsFromForm(formFor(defaults)), defaults);
});

test("form parsing rejects invalid values with the setting's name", () => {
  const bad = overrides => () => settingsFromForm(formFor({ ...defaults, ...overrides }));
  assert.throws(bad({ weekly_standard_lessons: 0 }), /Standard lessons per week must be from 1 to 14/);
  assert.throws(bad({ weekly_standard_lessons: "x" }), /whole number/);
  assert.throws(bad({ next_week_opens_day: 9 }), /Next week opens for booking on must be from 1 to 7/);
  assert.throws(bad({ next_week_opens_time: "9am" }), /24-hour time/);
  assert.throws(bad({ education_affairs_email: "nope" }), /valid email/);
  assert.throws(bad({ absent_with_apology_action: "expel" }), /valid option/);
  assert.throws(bad({ payment_note: "x".repeat(301) }), /too long/);
  assert.equal(settingsFromForm(formFor({ ...defaults, distinct_teachers_per_week: false })).distinct_teachers_per_week, false);
  assert.equal(settingsFromForm(formFor({ ...defaults, education_affairs_email: "" })).education_affairs_email, "");
});

test("history values are shown with their units and labels", () => {
  assert.equal(formatSettingValue("extension_price_vnd", 30000), "30,000 VND");
  assert.equal(formatSettingValue("next_week_opens_day", 6), "Saturday");
  assert.equal(formatSettingValue("absent_without_apology_action", "banned"), "Ban");
  assert.equal(formatSettingValue("distinct_teachers_per_week", false), "Off");
  assert.equal(formatSettingValue("education_affairs_email", ""), "Empty");
  assert.equal(formatSettingValue("student_cancel_cutoff_hours", 24), "24 hours");
});

test("student and teacher rule summaries describe the configured rules", () => {
  const student = Object.fromEntries(memberRuleSections(defaults, "student").map(section => [section.title, section.items.join("\n")]));
  assert.match(student.Booking, /You can book 2 lessons per week\. Up to 4 lessons per week.*5 hours before they start/);
  assert.match(student.Booking, /different teacher/);
  assert.match(student.Booking, /Saturday at 09:00 \(Asia\/Ho_Chi_Minh\)/);
  assert.match(student.Cancellation, /within 24 hours.*email the teacher and CC the ABVN Education Affairs \(EA\) team \(ea@abvn\.test\)/);
  assert.match(student.Attendance, /Absent without apology: you are banned until an admin restores access/);
  assert.match(student.Attendance, /Absent with apology: you are suspended for 14 days/);
  assert.match(student.Attendance, /4 weeks in a row, you become Inactive/);
  assert.match(student["Study period and fees"], /free for 6 months/);
  assert.match(student["Study period and fees"], /10 to 50 lessons.*30,000 VND per lesson/);
  assert.match(student["Study period and fees"], /Pay to: ABC Bank · ABVN · 123456/);
  const teacher = memberRuleSections({ ...defaults, student_cancel_cutoff_hours: 0, inactivity_weeks: 0, absent_with_apology_action: "none" }, "teacher");
  assert.deepEqual(teacher.map(section => section.title), ["Publishing lessons", "How students book", "Recording attendance"]);
  assert.match(teacher[0].items[0], /180 days ahead/);
  assert.match(teacher[1].items.join(" "), /cancelled at any time/);
  assert.match(teacher[2].items.join(" "), /the student is banned until an admin restores access/);
  assert.match(teacher[2].items.join(" "), /Absent with apology: no automatic action/);
  assert.doesNotMatch(teacher[2].items.join(" "), /Inactive/);
});

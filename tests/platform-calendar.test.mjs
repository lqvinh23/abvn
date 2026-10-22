import assert from "node:assert/strict";
import test from "node:test";
import { DateTime } from "luxon";
import { calendarDisplayRange, calendarLessonLabel, calendarRange, currentTimePosition, daySegments, formatTimeZone, initialCalendarMinute, lessonLocalTime } from "../src/lib/platform/calendar.ts";
import { calendarSummary, getLessonDisplayStatus, needsMyFeedback, getDashboardView, lessonStatuses } from "../src/lib/platform/dashboard.ts";

const now = Date.parse("2026-10-20T12:00:00Z");
const lesson = {
  slot_id: "slot", booking_id: null, starts_at: "2026-10-21T10:00:00Z",
  ends_at: "2026-10-21T11:00:00Z", slot_status: "available",
  booking_status: null, attendance: null, teacher_comment: null,
  student_comment: null, student_rating: null,
};

test("month display includes complete Monday–Sunday rows without changing the summary month", () => {
  const october = calendarDisplayRange("2026-10-21", "Asia/Ho_Chi_Minh", now, "month");
  assert.equal(october.start.toISODate(), "2026-09-28");
  assert.equal(october.end.toISODate(), "2026-11-02");
  assert.equal(october.end.diff(october.start, "days").days, 35);
  const sixRows = calendarDisplayRange("2026-03-20", "America/New_York", now, "month");
  assert.equal(sixRows.end.diff(sixRows.start, "days").days, 42);
  const february = calendarDisplayRange("2027-02-20", "UTC", now, "month");
  assert.equal(february.end.diff(february.start, "days").days, 28);
  const exact = calendarRange("2026-10-21", "Asia/Ho_Chi_Minh", now, "month");
  assert.equal(exact.start.toISODate(), "2026-10-01");
  assert.equal(exact.end.toISODate(), "2026-11-01");
});

test("time-zone labels include fractional, positive, negative and daylight-saving UTC offsets", () => {
  assert.equal(formatTimeZone("Asia/Ho_Chi_Minh", now), "Asia/Ho Chi Minh (UTC+7)");
  assert.equal(formatTimeZone("Asia/Kolkata", now), "Asia/Kolkata (UTC+5:30)");
  assert.equal(formatTimeZone("America/St_Johns", Date.parse("2026-12-20T00:00Z")), "America/St Johns (UTC-3:30)");
  assert.equal(formatTimeZone("Europe/London", Date.parse("2026-12-20T00:00Z")), "Europe/London (UTC+0)");
  assert.equal(formatTimeZone("Europe/London", now), "Europe/London (UTC+1)");
});

test("current-time marker is shown only for a range containing today and follows elapsed DST minutes", () => {
  const range = calendarRange("2026-10-20", "Asia/Ho_Chi_Minh", now, "week");
  const days = Array.from({ length: 7 }, (_, index) => range.start.plus({ days: index }));
  assert.equal(currentTimePosition(days, now), 19 * 60);
  assert.equal(currentTimePosition(days, now + 8 * 86400000), null);
  const day = DateTime.fromISO("2026-11-01", { zone: "America/New_York" });
  assert.equal(currentTimePosition([day], Date.parse("2026-11-01T06:30:00Z")), 150);
});

test("participant lesson times respect different dates, zones, fractional offsets and DST transitions", () => {
  const teacher = lessonLocalTime("2026-10-21T00:30:00Z", "2026-10-21T01:30:00Z", "America/New_York");
  const student = lessonLocalTime("2026-10-21T00:30:00Z", "2026-10-21T01:30:00Z", "Asia/Ho_Chi_Minh");
  assert.equal(teacher.date, "Tuesday, 20 October 2026");
  assert.equal(teacher.time, "20:30 – 21:30");
  assert.equal(teacher.zone, "America/New York (UTC-4)");
  assert.equal(student.date, "Wednesday, 21 October 2026");
  assert.equal(student.time, "07:30 – 08:30");
  const overnight = lessonLocalTime("2026-10-20T17:00Z", "2026-10-20T19:00Z", "Asia/Kolkata");
  assert.equal(overnight.time, "22:30 – 21 Oct 2026, 00:30");
  assert.equal(overnight.zone, "Asia/Kolkata (UTC+5:30)");
  const dst = lessonLocalTime("2026-11-01T05:30Z", "2026-11-01T06:30Z", "America/New_York");
  assert.equal(dst.zone, "America/New York (UTC-4) → America/New York (UTC-5)");
});

test("status palette uses distinct fills and readable text with at least 4.5:1 contrast", () => {
  function luminance(hex) {
    const channels = hex.match(/[a-f\d]{2}/gi).map(pair => {
      const value = parseInt(pair, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const fills = [];
  for (const { label, color } of Object.values(lessonStatuses)) {
    const fill = color.match(/bg-\[(#[a-f\d]+)\]/i)[1];
    const text = color.match(/text-\[(#[a-f\d]+)\]/i)[1];
    fills.push(fill);
    const a = luminance(fill), b = luminance(text);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${label} text contrast`);
  }
  assert.equal(new Set(fills).size, Object.keys(lessonStatuses).length);
});

test("calendar labels use only teacher - student (numeric ID), with an explicit open-slot label", () => {
  assert.equal(calendarLessonLabel({ teacher_name: "Jane Smith", student_name: "Linh", student_number: 12 }), "Jane Smith - Linh (12)");
  assert.equal(calendarLessonLabel({ teacher_name: "Jane Smith", student_name: null, student_number: null }), "Jane Smith - Available");
});

test("shared classes show upcoming availability but hide past status even if stale data retains it", () => {
  const shared = { ...lesson, booking_id: null, slot_status: "booked", is_my_class: false, can_book: false, teacher_name: "Jane Smith", student_name: "Linh", student_number: 12 };
  assert.equal(getLessonDisplayStatus(shared, now), "booked");
  assert.equal(getLessonDisplayStatus(shared, Date.parse(shared.ends_at)), "other");
  assert.equal(getLessonDisplayStatus({ ...shared, slot_status: null }, now), "other");
  assert.equal(getLessonDisplayStatus({ ...shared, slot_status: "cancelled" }, now), "other");
  assert.equal(getLessonDisplayStatus({ ...shared, attendance: "absent", teacher_comment: "Private" }, now), "booked");
  assert.equal(calendarLessonLabel(shared), "Jane Smith - Linh (12)");
  const available = { ...shared, slot_status: "available", student_name: null, student_number: null, can_book: true };
  assert.equal(getLessonDisplayStatus(available, now), "available");
  assert.equal(calendarLessonLabel(available), "Jane Smith - Available");
  const teacherView = { ...available, can_book: false };
  assert.equal(getLessonDisplayStatus(teacherView, now), "available");
  assert.equal(calendarLessonLabel(teacherView), "Jane Smith - Available");
  const pastOpen = { ...teacherView, slot_status: null };
  assert.equal(calendarLessonLabel(pastOpen), "Jane Smith - Class");
  assert.equal(needsMyFeedback(shared, "student", Date.parse(shared.ends_at)), false);
});

test("schedule summaries deduplicate slot records and count scheduled duration, availability and fully completed classes", () => {
  const completed = { ...lesson, slot_id: "complete", booking_id: "booked", booking_status: "completed", slot_status: "completed", attendance: "present", teacher_comment: "Well done", student_comment: "Thanks", student_rating: null };
  const cancelled = { ...lesson, booking_id: "old", booking_status: "cancelled" };
  assert.deepEqual(calendarSummary([cancelled, lesson, completed], Date.parse("2026-10-21T10:00:00Z")), { total: 2, hours: 2, available: 1, completed: 0 });
  assert.deepEqual(calendarSummary([completed], Date.parse("2026-10-22T10:00:00Z")), { total: 1, hours: 1, available: 0, completed: 1 });
  assert.deepEqual(calendarSummary([], now), { total: 0, hours: 0, available: 0, completed: 0 });
});

test("calendar opens near the earliest lesson in the member time zone and defaults to 08:00", () => {
  assert.equal(initialCalendarMinute([], "Asia/Ho_Chi_Minh"), 480);
  assert.equal(initialCalendarMinute([lesson], "Asia/Ho_Chi_Minh"), 960);
  assert.equal(initialCalendarMinute([lesson], "America/New_York"), 300);
  assert.equal(initialCalendarMinute([{ starts_at: "2026-10-21T00:30:00Z" }], "UTC"), 0);
});

test("calendar ranges respect the member zone, Monday weeks, invalid dates and month boundaries", () => {
  const range = calendarRange("2026-10-21", "Asia/Ho_Chi_Minh", now, "week");
  assert.equal(range.from, "2026-10-18T17:00:00.000Z");
  assert.equal(range.to, "2026-10-25T17:00:00.000Z");
  assert.equal(calendarRange("bad", "Asia/Ho_Chi_Minh", now, "day").date, "2026-10-20");
  assert.equal(calendarRange("2026-02-30", "Asia/Ho_Chi_Minh", now, "day").date, "2026-10-20");
  assert.equal(calendarRange("2026-12-20", "UTC", now, "month").to, "2027-01-01T00:00:00.000Z");
  assert.equal(calendarRange(undefined, "Pacific/Auckland", now, "day").date, "2026-10-21");
});

test("DST days have the correct elapsed duration; repeated local hours get distinct positions", () => {
  const spring = calendarRange("2026-03-08", "America/New_York", now, "day");
  const autumn = calendarRange("2026-11-01", "America/New_York", now, "day");
  assert.equal(spring.end.diff(spring.start, "hours").hours, 23);
  assert.equal(autumn.end.diff(autumn.start, "hours").hours, 25);
  const halfHour = calendarRange("2026-10-04", "Australia/Lord_Howe", now, "day");
  assert.equal(halfHour.end.diff(halfHour.start, "hours").hours, 23.5);
  const entries = daySegments([
    { ...lesson, starts_at: "2026-11-01T05:00:00Z", ends_at: "2026-11-01T05:30:00Z" },
    { ...lesson, slot_id: "later", starts_at: "2026-11-01T06:00:00Z", ends_at: "2026-11-01T06:30:00Z" },
  ], autumn.start);
  assert.deepEqual(entries.map(entry => entry.top), [60, 120]);
  assert.ok(entries.every(entry => entry.lanes === 1));
});

test("calendar splits midnight lessons and excludes adjacent-day boundary events", () => {
  const day = DateTime.fromISO("2026-10-21", { zone: "UTC" });
  const segments = daySegments([
    { ...lesson, starts_at: "2026-10-20T23:45:00Z", ends_at: "2026-10-21T00:45:00Z" },
    { ...lesson, slot_id: "next", starts_at: "2026-10-22T00:00:00Z", ends_at: "2026-10-22T01:00:00Z" },
  ], day);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].top, 0);
  assert.equal(segments[0].duration, 45);
});

test("overlapping lessons use separate lanes, adjacent lessons do not", () => {
  const day = DateTime.fromISO("2026-10-21", { zone: "UTC" });
  const segments = daySegments([
    lesson,
    { ...lesson, slot_id: "overlap", starts_at: "2026-10-21T10:30:00Z", ends_at: "2026-10-21T11:30:00Z" },
    { ...lesson, slot_id: "later", starts_at: "2026-10-21T12:00:00Z", ends_at: "2026-10-21T13:00:00Z" },
  ], day);
  assert.deepEqual(segments.map(entry => [entry.lane, entry.lanes]), [[0, 2], [1, 2], [0, 1]]);
});

test("display status distinguishes unbooked, booked, follow-up, attendance and cancellation without inferring bans", () => {
  assert.equal(getLessonDisplayStatus(lesson, now), "available");
  const after = Date.parse(lesson.ends_at) + 1;
  assert.equal(getLessonDisplayStatus(lesson, after), "expired");
  const booked = { ...lesson, booking_id: "booking", booking_status: "booked", slot_status: "booked" };
  assert.equal(getLessonDisplayStatus(booked, now), "booked");
  assert.equal(getLessonDisplayStatus(booked, after), "follow-up");
  assert.equal(needsMyFeedback(booked, "teacher", after), true);
  assert.equal(needsMyFeedback(booked, "student", after), true);
  assert.equal(needsMyFeedback(booked, "student", now), false);
  const complete = { ...booked, attendance: "present", teacher_comment: "Progress", student_comment: "Thanks", student_rating: null };
  assert.equal(getLessonDisplayStatus(complete, after), "completed");
  assert.equal(needsMyFeedback(complete, "teacher", after), false);
  assert.equal(getLessonDisplayStatus({ ...complete, attendance: "absent" }, after), "absence");
  assert.equal(getLessonDisplayStatus({ ...complete, attendance: "apologized" }, after), "apologized");
  const cancelled = { ...complete, attendance: "cancelled", slot_status: "cancelled", booking_status: "cancelled" };
  assert.equal(getLessonDisplayStatus(cancelled, after), "cancelled");
  assert.equal(needsMyFeedback(cancelled, "student", after), false);
  assert.equal(calendarSummary([cancelled], after).completed, 0);
  assert.equal(getLessonDisplayStatus({ ...complete, booking_status: "cancelled" }, after), "cancelled");
  assert.equal(needsMyFeedback({ ...booked, booking_status: "cancelled" }, "teacher", after), false);
});

test("workspace views default by actual role and reject unrelated view names", () => {
  assert.equal(getDashboardView("teacher", undefined), "schedule");
  assert.equal(getDashboardView("student", "academic"), "schedule");
  assert.equal(getDashboardView("admin", undefined), "academic");
  assert.equal(getDashboardView("teacher", "feedback"), "feedback");
});

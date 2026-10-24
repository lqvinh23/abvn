import assert from "node:assert/strict";
import test from "node:test";
import { studyTrendPoints } from "../src/lib/platform/study-trend.ts";
import { joinedYears, studentAddress, studentDirectoryRows, studentMilestones, studentRowsFromProfiles, studyPeriod } from "../src/lib/platform/student-directory.ts";

const student = (number, name, overrides = {}) => ({
  id: `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`, member_number: number, member_code: `ABVN-${String(number).padStart(12, "A")}`,
  full_name: name, email: `${name.toLowerCase().replaceAll(" ", ".")}@example.test`, role: "student", status: "approved",
  participation_status: "active", country: "Vietnam", city: "", created_at: "2026-01-10T00:00:00Z",
  student_joined_at: "2026-01-10T00:00:00Z", study_expires_on: "2026-07-10", ...overrides,
});
const members = [
  student(1, "An Nguyen", { city: "Hanoi", participation_status: "active", student_joined_at: "2026-01-31T18:00:00Z" }),
  student(2, "Binh Tran", { city: "Da Nang", participation_status: "suspended", student_joined_at: "2026-02-05T03:00:00Z" }),
  student(3, "Chi Le", { city: "", country: "Japan", participation_status: "banned", student_joined_at: "2025-12-20T03:00:00Z" }),
  student(4, "Duc Pham", { city: "Hue", participation_status: "inactive", student_joined_at: "2026-02-20T03:00:00Z" }),
];
const statistics = members.map((member, index) => ({
  student_id: member.id, attended_total: [12, 3, 40, 0][index], attended_1w: 1, attended_4w: 2, absent: [0, 2, 1, 0][index], apologized: [1, 0, 0, 0][index],
}));
const rows = (query, stats = statistics) => studentDirectoryRows(studentRowsFromProfiles(members, stats), new URLSearchParams(query), "Asia/Ho_Chi_Minh").map(row => row.member_number);

test("student search matches name, email and numeric ID; other filters combine", () => {
  assert.deepEqual(rows(""), [1, 2, 3, 4]);
  assert.deepEqual(rows("q=binh"), [2]);
  assert.deepEqual(rows("q=PHAM@example"), [4]);
  assert.deepEqual(rows("q=3"), [3]);
  assert.deepEqual(rows("q=%"), []);
  assert.deepEqual(rows("participation=suspended"), [2]);
  assert.deepEqual(rows("participation=guest"), [1, 2, 3, 4]);
  assert.deepEqual(rows("q=a&participation=banned"), [3]);
});

test("teacher rows include email for search", () => {
  const teacherRows = studentRowsFromProfiles(members, statistics);
  const find = query => studentDirectoryRows(teacherRows, new URLSearchParams(query), "UTC").map(row => row.member_number);
  assert.deepEqual(find("q=example"), [1, 2, 3, 4]);
  assert.deepEqual(find("q=chi"), [3]);
  assert.deepEqual(find("q=2"), [2]);
});

test("joined month and year use the administrator's time zone", () => {
  // 2026-01-31 18:00 UTC is already 1 Feb in Ho Chi Minh City.
  assert.deepEqual(rows("month=2&year=2026"), [1, 2, 4]);
  assert.deepEqual(rows("month=1&year=2026"), []);
  assert.deepEqual(rows("year=2025"), [3]);
  assert.deepEqual(rows("month=13"), [1, 2, 3, 4]);
  assert.deepEqual(joinedYears(members, "Asia/Ho_Chi_Minh"), [2026, 2025]);
});

test("student sorting covers status, absences, lesson totals, address and newest joined", () => {
  assert.deepEqual(rows("sort=status"), [1, 4, 2, 3]);
  assert.deepEqual(rows("sort=absent&direction=desc"), [2, 1, 3, 4]);
  assert.deepEqual(rows("sort=total&direction=desc"), [3, 1, 2, 4]);
  assert.deepEqual(rows("sort=address"), [2, 1, 4, 3]);
  assert.deepEqual(rows(""), [1, 2, 3, 4]);
  assert.deepEqual(rows("sort=joined"), [4, 2, 1, 3]);
  assert.deepEqual(rows("sort=joined&direction=asc"), [3, 1, 2, 4]);
  assert.deepEqual(rows("sort=total", null), [1, 2, 3, 4]);
});

test("study period is six months, flags soon and expired in the local calendar day", () => {
  const now = Date.parse("2026-07-01T05:00:00Z");
  assert.equal(studyPeriod({ ...members[0], study_expires_on: "2026-07-01" }, now, "Asia/Ho_Chi_Minh").state, "soon");
  assert.equal(studyPeriod({ ...members[0], study_expires_on: "2026-06-30" }, now, "Asia/Ho_Chi_Minh").state, "expired");
  assert.equal(studyPeriod({ ...members[0], study_expires_on: "2026-12-31" }, now, "Asia/Ho_Chi_Minh").state, "active");
  assert.equal(studyPeriod({ ...members[0], study_expires_on: null }, now, "UTC").state, "none");
  assert.equal(studyPeriod({ ...members[0], study_expires_on: "2026-07-31" }, now, "UTC").daysLeft, 30);
  assert.equal(studyPeriod(members[0], now, "Asia/Ho_Chi_Minh").joined.toISODate(), "2026-02-01");
});

test("addresses and milestones are derived consistently", () => {
  assert.equal(studentAddress({ city: " Hanoi ", country: "Vietnam" }), "Hanoi, Vietnam");
  assert.equal(studentAddress({ city: "", country: "Japan" }), "Japan");
  assert.equal(studentAddress({ country: "" }), "");
  const progress = studentMilestones(12, [{ count: 1, reached_at: "2026-01-01" }, { count: 5, reached_at: "2026-02-01" }, { count: 10, reached_at: "2026-03-01" }]);
  assert.deepEqual(progress.items.filter(item => item.reachedAt !== null).map(item => item.count), [1, 5, 10]);
  assert.deepEqual([progress.next.count, progress.remaining], [25, 13]);
  assert.equal(studentMilestones(0, []).next.count, 1);
  assert.equal(studentMilestones(100, []).next, null);
});

test("study trend buckets attended lessons by month, week or day in the viewer's time zone", () => {
  const now = Date.parse("2026-10-24T03:00:00Z");
  const attended = ["2026-10-23T20:00:00Z", "2026-10-20T01:00:00Z", "2026-10-02T05:00:00Z", "2026-08-15T05:00:00Z", "2026-04-01T05:00:00Z", "2026-11-01T05:00:00Z"];
  const six = studyTrendPoints(attended, "6m", "Asia/Ho_Chi_Minh", now);
  assert.deepEqual(six.map(point => point.label), ["May", "Jun", "Jul", "Aug", "Sep", "Oct"]);
  // 23 Oct 20:00 UTC is 24 Oct in Ho Chi Minh City; the April lesson is outside the window and November is in the future.
  assert.deepEqual(six.map(point => point.values.attended), [0, 0, 0, 1, 0, 3]);
  const three = studyTrendPoints(attended, "3m", "Asia/Ho_Chi_Minh", now);
  assert.equal(three.length, 13);
  assert.deepEqual([three.at(-1).label, three.at(-1).values.attended, three.at(-2).values.attended], ["19/10", 2, 0]);
  const one = studyTrendPoints(attended, "1m", "UTC", now);
  assert.equal(one.length, 30);
  assert.deepEqual([one.at(-1).label, one.at(-1).values.attended, one.at(-2).values.attended, one.at(-2).label, one.at(-5).values.attended], ["24", 0, 1, "23", 1]);
  assert.equal(one.reduce((sum, point) => sum + point.values.attended, 0), 3);
  assert.equal(studyTrendPoints([], "6m", "UTC", now).every(point => point.values.attended === 0), true);
});

import assert from "node:assert/strict";
import test from "node:test";
import { directoryRows } from "../src/lib/platform/directory-table.ts";
import { defaultApplicationFields, protectedApplicationField } from "../src/lib/platform/application-fields.ts";

const members = Array.from({ length: 25 }, (_, index) => ({
  id: String(index).padStart(3,"0"), member_number: index + 1, full_name: `Teacher ${index + 1}`,
  status: index % 2 ? "approved" : "pending", participation_status: index % 2 ? "active" : "inactive",
  country: index % 2 ? "Vietnam" : "Canada", created_at: `2026-10-${String(index + 1).padStart(2,"0")}`,
}));
const statistics = members.map((member, index) => ({ teacher_id: member.id, completed_lessons: index, students_taught: 25 - index }));

test("directory filtering uses the entire collection before pagination and treats wildcard characters literally", () => {
  assert.deepEqual(directoryRows(members, statistics, new URLSearchParams("q=2")).map(row => row.member_number), [2]);
  assert.equal(directoryRows(members, statistics, new URLSearchParams("q=teacher")).length, 25);
  assert.equal(directoryRows(members, statistics, new URLSearchParams("q=%")).length, 0);
  assert.equal(directoryRows(members, statistics, new URLSearchParams("q=_")).length, 0);
  assert.ok(directoryRows(members, statistics, new URLSearchParams("status=approved&participation=active")).every(row => row.status === "approved" && row.participation_status === "active"));
});

test("directory header sorting covers global statistics, numeric IDs, names and nulls", () => {
  const descending = directoryRows(members, statistics, new URLSearchParams("sort=completed&direction=desc"));
  assert.deepEqual(descending.slice(0, 3).map(row => row.member_number), [25,24,23]);
  assert.deepEqual(descending.slice(10, 13).map(row => row.member_number), [15,14,13]);
  assert.equal(directoryRows(members, statistics, new URLSearchParams("sort=students&direction=desc"))[0].member_number, 1);
  assert.equal(directoryRows(members, statistics, new URLSearchParams("sort=name&direction=asc"))[1].member_number, 2);
  assert.equal(directoryRows(members, statistics, new URLSearchParams("sort=newest"))[0].member_number, 25);
  const pending = { ...members[0], id: "pending", member_number: null };
  for (const direction of ["asc","desc"]) assert.equal(directoryRows([pending,...members], null, new URLSearchParams(`sort=number&direction=${direction}`)).at(-1).id, "pending");
});

test("All accounts filters and sorts by role and teaching or study status", () => {
  const accounts = [
    { ...members[0], id: "teacher", member_number: 1, role: "teacher", participation_status: "active" },
    { ...members[1], id: "student", member_number: 2, role: "student", participation_status: "inactive" },
    { ...members[2], id: "admin", member_number: null, role: "admin", participation_status: "active" },
    { ...members[3], id: "guest", member_number: null, role: null, participation_status: "active" },
    { ...members[4], id: "teacher-admin", member_number: 5, role: "teacher", admin_access: true, participation_status: "inactive" },
  ];
  assert.deepEqual(
    directoryRows(accounts, null, new URLSearchParams("role=guest&status=pending"), true).map(row => row.id),
    ["guest"],
  );
  assert.deepEqual(
    directoryRows(accounts, null, new URLSearchParams("participation=active"), true).map(row => row.id),
    ["teacher"],
  );
  assert.deepEqual(
    directoryRows(accounts, null, new URLSearchParams("role=admin&sort=role"), true).map(row => row.id),
    ["admin", "teacher-admin"],
  );
  assert.deepEqual(
    directoryRows(accounts, null, new URLSearchParams("role=teacher"), true).map(row => row.id),
    ["teacher", "teacher-admin"],
  );
  assert.deepEqual(
    directoryRows(accounts, null, new URLSearchParams("sort=role"), true).map(row => row.id),
    ["admin", "guest", "student", "teacher", "teacher-admin"],
  );
});

test("application field lists include personal identity, uploads and video with role-specific protection", () => {
  for (const role of ["teacher","student"]) {
    const fields = defaultApplicationFields(role);
    assert.equal(fields.length, role === "teacher" ? 11 : 18);
    assert.equal(fields.some(field => field.field_key === "weekly_hours"), role === "teacher");
    assert.equal(fields.some(field => field.field_key === "city"), role === "student");
    assert.equal(fields.some(field => field.field_key === "national_id_last8"), role === "student");
    assert.ok(fields.some(field => field.field_key === "photo"));
    assert.ok(fields.some(field => field.field_key === "intro_video_url"));
    assert.equal(protectedApplicationField(fields.find(field => field.field_key === "full_name")), true);
    assert.equal(protectedApplicationField(fields.find(field => field.field_key === "intro_video_url")), false);
    assert.equal(protectedApplicationField(fields.find(field => field.field_key === "photo")), role === "teacher");
    assert.equal(protectedApplicationField(fields.find(field => field.field_key === "date_of_birth")), role === "student");
  }
  const student = defaultApplicationFields("student");
  for (const key of ["city", "address", "occupation", "organization", "proficiency", "goals", "hobbies", "date_of_birth", "national_id_last8", "phone", "intro"])
    assert.equal(student.find(field => field.field_key === key).required, true, key);
  for (const key of ["cv", "intro_video_url", "photo"]) assert.equal(student.find(field => field.field_key === key).required, false, key);
  assert.equal(student.find(field => field.field_key === "intro").label, "Biography");
  assert.equal(protectedApplicationField(student.find(field => field.field_key === "national_id_last8")), true);
  assert.deepEqual(student.map(field => field.position), student.map((_, index) => index));
});

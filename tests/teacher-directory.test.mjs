import assert from "node:assert/strict";
import test from "node:test";
import { getPageItems } from "../src/lib/content-pagination.ts";
import {
  getTeachersByStatus,
  teacherProfiles,
  TEACHERS_PER_PAGE,
} from "../src/lib/teacher-profiles.ts";

function profile(name, sessions, status = "active") {
  return { ...teacherProfiles[0], name, sessions, status };
}

test("filters by status and sorts numerically by lessons, then alphabetically", () => {
  const profiles = [
    profile("Zoe", 100),
    profile("Amy", 100),
    profile("Lee", 10000),
    profile("Guest teacher", 20000, "guest"),
    profile("Sam", 900),
  ];
  const original = [...profiles];

  assert.deepEqual(
    getTeachersByStatus(profiles, "active").map(({ name }) => name),
    ["Lee", "Sam", "Amy", "Zoe"],
  );
  assert.deepEqual(
    getTeachersByStatus(profiles, "guest").map(({ name }) => name),
    ["Guest teacher"],
  );
  assert.deepEqual(profiles, original);
});

test("teacher pages have exactly 12 items before the final partial page", () => {
  const profiles = Array.from({ length: 25 }, (_, index) =>
    profile(`Teacher ${index}`, 25 - index),
  );

  assert.equal(TEACHERS_PER_PAGE, 12);
  const pages = [1, 2, 3].map((page) =>
    getPageItems(profiles, page, TEACHERS_PER_PAGE),
  );

  assert.deepEqual(
    pages.map(({ items }) => items.length),
    [12, 12, 1],
  );
  assert.deepEqual(
    pages.map(({ start }) => start),
    [0, 12, 24],
  );
  assert.ok(pages.every(({ totalPages }) => totalPages === 3));
  assert.deepEqual(
    pages.flatMap(({ items }) => items),
    profiles,
  );
  assert.equal(getPageItems(profiles, 99, TEACHERS_PER_PAGE).currentPage, 3);
});

test("each activity tab is paginated independently", () => {
  const profiles = [
    ...Array.from({ length: 13 }, (_, index) =>
      profile(`Active ${index}`, index),
    ),
    ...Array.from({ length: 14 }, (_, index) =>
      profile(`Guest ${index}`, index, "guest"),
    ),
  ];

  for (const [status, finalCount] of [
    ["active", 1],
    ["guest", 2],
  ]) {
    const teachers = getTeachersByStatus(profiles, status);
    const first = getPageItems(teachers, 1, TEACHERS_PER_PAGE);
    const second = getPageItems(teachers, 2, TEACHERS_PER_PAGE);

    assert.equal(first.items.length, 12);
    assert.equal(second.items.length, finalCount);
    assert.ok(
      [...first.items, ...second.items].every(
        (teacher) => teacher.status === status,
      ),
    );
  }
});

test("empty activity tabs return an empty page", () => {
  const teachers = getTeachersByStatus([], "active");
  const page = getPageItems(teachers, 1, TEACHERS_PER_PAGE);

  assert.deepEqual(page.items, []);
  assert.equal(page.currentPage, 1);
  assert.equal(page.totalPages, 1);
});

test("news keeps its existing six-item page size", () => {
  const stories = Array.from({ length: 9 }, (_, index) => index);
  assert.equal(getPageItems(stories, 1).items.length, 6);
  assert.deepEqual(getPageItems(stories, 2).items, [6, 7, 8]);
});

test("the preview directory has a second active page and guest teachers", () => {
  const active = getTeachersByStatus(teacherProfiles, "active");
  const first = getPageItems(active, 1, TEACHERS_PER_PAGE);
  const second = getPageItems(active, 2, TEACHERS_PER_PAGE);

  assert.equal(first.items.length, 12);
  assert.ok(second.items.length > 0);
  assert.equal(second.currentPage, 2);
  assert.ok(getTeachersByStatus(teacherProfiles, "guest").length > 0);
  assert.ok(
    teacherProfiles.every(({ status }) => ["active", "guest"].includes(status)),
  );
});

test("every teacher has a complete sample profile and a numeric lesson count", () => {
  assert.equal(
    new Set(teacherProfiles.map(({ slug }) => slug)).size,
    teacherProfiles.length,
  );
  for (const teacher of teacherProfiles) {
    assert.ok(Number.isInteger(teacher.sessions) && teacher.sessions >= 0);
    assert.ok(teacher.country);
    assert.ok(teacher.bio || teacher.sampleDetails.bio);
    assert.ok(teacher.sampleDetails.teachingFocus.length);
    assert.ok(teacher.sampleDetails.hobbies.length);
    assert.ok(teacher.sampleDetails.languages.length);
    assert.ok(teacher.sampleDetails.teachingApproach);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedMeetingUrl,
  isValidTimeZone,
  localLessonToUtc,
  formatLessonTime,
} from "../src/lib/platform/scheduling.ts";

test("Vietnam lesson times are stored as UTC", () => {
  assert.deepEqual(
    localLessonToUtc("2026-11-10T19:00", "Asia/Ho_Chi_Minh", 60),
    {
      startsAt: "2026-11-10T12:00:00.000Z",
      endsAt: "2026-11-10T13:00:00.000Z",
    },
  );
});

test("international teacher schedules respect summer and winter offsets", () => {
  assert.equal(
    localLessonToUtc("2027-07-01T10:00", "America/New_York", 30).startsAt,
    "2027-07-01T14:00:00.000Z",
  );
  assert.equal(
    localLessonToUtc("2027-01-01T10:00", "America/New_York", 45).startsAt,
    "2027-01-01T15:00:00.000Z",
  );
});

test("DST gaps and ambiguous repeated times need an explicit alternative", () => {
  assert.throws(
    () => localLessonToUtc("2027-03-14T02:30", "America/New_York", 60),
    /does not exist/,
  );
  assert.throws(
    () => localLessonToUtc("2026-11-01T01:30", "America/New_York", 60),
    /occurs twice/,
  );
});

test("invalid dates, zones, and durations are rejected", () => {
  assert.equal(isValidTimeZone("Mars/Olympus"), false);
  assert.throws(() =>
    localLessonToUtc("2026-02-30T10:00", "Asia/Ho_Chi_Minh", 60),
  );
  assert.throws(() => localLessonToUtc("not-a-date", "Asia/Ho_Chi_Minh", 60));
  for (const duration of [0,29,29.5,30.5,121,NaN,Infinity]) assert.throws(() =>
    localLessonToUtc("2026-11-10T10:00", "Asia/Ho_Chi_Minh", duration), /between 30 and 120/);
  assert.throws(() => localLessonToUtc("2026-11-10T10:00", "Mars/Olympus", 60));
  assert.match(
    formatLessonTime("2026-11-10T12:00:00Z", "Asia/Ho_Chi_Minh"),
    /19:00/,
  );
  assert.equal(
    formatLessonTime("2026-11-10T12:00:00Z", "Asia/Ho_Chi_Minh", false),
    "Tue, 10 Nov 2026 · 19:00",
  );
});

test("custom whole-minute durations from 30 through 120 are supported", () => {
  for (const minutes of [30,31,45,60,75,90,120]) {
    const {startsAt,endsAt}=localLessonToUtc("2026-11-10T10:30","Asia/Ho_Chi_Minh",minutes);
    assert.equal((Date.parse(endsAt)-Date.parse(startsAt))/60000,minutes);
  }
});

test("only known HTTPS classroom services are accepted", () => {
  for (const url of [
    "https://meet.google.com/abc-defg-hij",
    "https://us02web.zoom.us/j/123",
    "https://zoom.us/j/123",
    "https://teams.microsoft.com/l/meetup-join/abc",
    "https://join.skype.com/abc",
  ]) {
    assert.equal(isAllowedMeetingUrl(url), true, url);
  }
  for (const url of [
    "javascript:alert(1)",
    "http://meet.google.com/abc",
    "https://meet.google.com.attacker.com/x",
    "https://attacker.com/meet.google.com",
    "https://user@meet.google.com/abc",
    "https://meet.google.com:444/abc",
    "https://meet.google.com/",
    "invalid",
  ]) {
    assert.equal(isAllowedMeetingUrl(url), false, url);
  }
});

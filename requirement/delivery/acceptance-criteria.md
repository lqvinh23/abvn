# Acceptance criteria

> **Document ID:** ABVN-AC-001
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 10
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

## 10. Acceptance criteria

| ID | Scenario | Required result |
| --- | --- | --- |
| AC-01 | Collapse sidebar, refresh, navigate with keyboard | Preference persists; every item remains labeled and operable |
| AC-02 | Open role views directly or use browser Back | Correct view/filter context; unauthorized roles denied |
| AC-03 | Mobile schedule | Readable Agenda and accessible details; no forced desktop-width layout |
| AC-27 | Switch Month, change months, open padding dates | Complete Monday–Sunday weeks, correct range queries, same authorized lesson actions |
| AC-28 | Current week and a different week | One red time line across all day columns only in the current range, updating while open |
| AC-29 | Header and future lesson in different DST seasons | Zone and correct UTC offsets shown, including fractional offsets |
| AC-30 | Filter schedules, including reopened/cancelled records | Four correctly scoped summaries, unique slot counts, exact scheduled durations |
| AC-31 | Approve new teacher/student, repeat approval, restore account | Increasing role-specific numbers from 1, stable after retries/restoration, no client assignment |
| AC-32 | Open own/shared lesson details with and without photos | Aligned participant-local times, description and duration; current photos or honest initials; private signed photo access without student profile access |
| AC-33 | Admin assigns/removes roles on an account with and without Admin access | Distinct role labels; combined Admin+Teacher or Admin+Student works; Teacher/Student removal deactivates without losing history; Admin-only removal leaves a Guest |
| AC-34 | Use role popup and combined-role workspace switch | Popup closes on outside/other-account click; switch is shown only for eligible combined roles and opens the selected workspace |
| AC-04 | Teacher creates from grid and from button | Same form/validation; correct prefilled local time |
| AC-05 | Publish recurring times across daylight saving | Intended local time preserved; invalid/ambiguous times explicitly resolved |
| AC-06 | Recurrence contains conflicting dates | Conflicts listed; no silent partial publishing |
| AC-07 | Two students book one slot simultaneously | Exactly one live booking; loser gets actionable feedback |
| AC-08 | One student books different slots concurrently at quota | Weekly quota cannot be exceeded |
| AC-09 | Cancel exactly at cutoff, then just before/after | Server applies strict configured boundary consistently |
| AC-10 | Teacher/student inspects another upcoming/ongoing/past class or RPC | Shared names/IDs, title/description, pictures and times; Available/Booked only before lesson end; no past status, attendance/apology, feedback, student profile or meeting links |
| AC-11 | Student opens another student's profile URL | Access denied; approved teachers can read only the confirmed limited profile fields; admins retain full profile access |
| AC-12 | Teacher cancels after booking | Purple outcome, reason/audit, student notice, no student penalty |
| AC-13 | Unbooked slot expires | No feedback obligation, no absence, no learning hours |
| AC-14 | Booked lesson ends with missing required actions | Follow-up state and linked teacher/student action queues |
| AC-15 | Attendance and required feedback complete | Completed category; attended hours match actual duration |
| AC-16 | No-show/apology is reported | Review case and private notices; no unconfirmed permanent ban |
| AC-17 | Accepted apology restriction expires | Booking restores exactly at approved expiry; history remains |
| AC-18 | Admin overturns an attendance finding | Recompute outcome/metrics/restrictions; preserve audit history |
| AC-19 | Teacher/student application approved twice | One effective membership; reviewed fields synchronized once |
| AC-20 | Admin changes CMS draft | Private live preview changes; public page unchanged until Publish |
| AC-21 | Publish/rollback content | Correct version public; actor/time logged; invalid media/content blocked |
| AC-22 | Change policy while bookings exist | Version/effective date recorded; existing obligations treated explicitly |
| AC-23 | Email fails or preferences disable optional mail | No false delivered state; required in-app notice remains available |
| AC-24 | Suspend account or deactivate teacher | Access/availability reflects policy immediately; admin can resolve bookings |
| AC-25 | Migrate existing platform | Real users, bookings, feedback and approval state preserved |
| AC-26 | Keyboard/screen-reader and color-blind use | Status meanings and main workflows accessible without color or mouse |
| AC-35 | Admin opens Systems > Settings, changes a value and saves | Value validated on the server, applied to the next action, and recorded in history with admin, time and note; non-admins cannot read or write settings |
| AC-36 | Student has booked two lessons in a week and tries a third | Refused unless the lesson is still available within the extra-booking window (default 5 hours); a fifth lesson is always refused |
| AC-37 | Student books two lessons with the same teacher in one week | Second booking refused with a different-teacher message |
| AC-38 | Student books next week's lesson before and after the opening time | Refused with the opening day and time before; allowed after; later weeks stay closed |
| AC-39 | Student has an attended lesson without feedback and tries to book | Refused until written feedback is saved; absences do not require feedback |
| AC-40 | Student cancels inside and outside the cut-off | Inside: refused with an instruction to email the teacher and CC the EA team; outside: allowed |
| AC-41 | Teacher records No, then No but Apologize | Student banned (until restored) or suspended for 14 days, with an automatic history entry; an existing ban is never lowered; the suspension ends automatically |
| AC-42 | Student attends no lesson for 4 weeks | Becomes Inactive; an attended lesson or a disabled rule prevents it |
| AC-43 | Study period ends, then an admin extends it | Booking refused with extension, package and price details; allowed again after the admin extends the Expiry date |
| AC-44 | Applicant outside the configured age range submits a student application | Rejected by the server naming the allowed range |
| AC-45 | Two interviewers offer overlapping availability; one repeats an overlap | Different interviewers can save overlapping slots; the same interviewer is blocked; booking remains exclusive per slot |

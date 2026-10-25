# Calendar and lesson workflows

> **Document ID:** ABVN-FR-002
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 3
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

## 3. Shared lesson calendar

### Confirmed user preferences — 21 October 2026

These preferences override older optional recommendations below and must be
maintained as implementation continues:

- Update this specification and the parent PRD alongside future requested
  changes; keep delivered behaviour distinct from remaining roadmap features.
- Follow the supplied calendar reference's structure, not its branding/artwork:
  compact sidebar, light neutral workspace, one compact date/view toolbar,
  shared hour column, sticky weekday headings, rounded pastel lesson blocks,
  and filters hidden until requested. Avoid the previous stacked control panels.
- Updated 21 October: remove the visible workspace heading and bottom notes from
  Schedule/Academic so the timetable fills the remaining desktop viewport.
  Keep the main heading accessible to screen readers. Latest refinement restores
  the compact status legend at the bottom of the calendar panel, always visible
  outside the scrolling timetable. Do not restore the old bottom help notes.
  Filters uses compact 44px controls, smaller text/spacing, and bounded input
  widths rather than oversized fields. Keep comfortable keyboard/touch targets.
  Selection controls use a consistent custom list menu instead of the browser's
  native dropdown styling. Keep them keyboard-operable and visibly focused, with
  clear selected-state and disabled-option styling.
  Day/week hour rows are 80px (previously 112px), with proportional lesson
  placement, scroll positioning, and current-time marker.
  Use an aligned, fixed-size SVG chevron in the date selector.
- Offer **Month** alongside Day, Week, and Agenda. Month uses Monday–Sunday
  rows, includes adjacent dates needed for complete weeks, and opens the same
  lesson details. Previous/Next move one month in Month mode.
- The red current-time line spans **all day columns** of the visible week
  (not just today's column). Show it only when today belongs to that day/week;
  update it while open. Position against today's elapsed time on clock-change
  days. Month highlights today but has no time-grid line.
- The header shows the user's zone **and UTC offset**, for example
  `Asia/Ho Chi Minh (UTC+7)`. Account for fractional/negative offsets and DST.
  Place it on the same line as the calendar summary metrics, without the
  "Your time zone" prefix; wrap naturally on small screens.
  Lesson details show the offset applicable to the actual lesson, not today's.
- Show **Total classes, Total hours, Available classes, Completed classes**.
  Place these as compact inline metrics in the calendar panel header beside the
  period heading (for example, "This week"), not as separate cards above it.
  Wrap the metrics into two columns on small screens without page overflow.
  Label their scope: selected day/week/month and current filters, using classes
  starting within that period in the viewer's time zone. Month padding dates
  are not included in the month's totals. Count each slot once even if an old
  cancelled booking and a reopened available slot both appear.
  Total hours are full scheduled durations (including cancellations), not
  attended learning hours. Available means future/open; Completed requires
  attendance present plus feedback from both sides. Keep learning-hour
  statistics separately identified in History.
- Calendar class blocks display only
  **`Teacher name - Student name (Student ID)`**.
  Unbooked blocks display **`Teacher name - Available`**. Class titles, time,
  duration, numeric teacher ID, status labels and descriptions belong in the
  detail dialog / accessible label / tooltip rather than crowding the block.
- Teacher and student IDs are **simple increasing integers starting at 1**,
  with a separate counter for each role. Allocate once on first approval,
  transactionally in the database, never at signup or in the browser. Retain
  numbers on suspension/restoration and repeat approvals. Do not renumber to
  close deletion gaps. Auth UUIDs remain private; old member-profile link codes
  remain stable internal route identifiers, not displayed member IDs.
- Existing teacher/student accounts receive initial numbers by creation order
  (creation timestamp, then UUID to resolve ties) within their role, because
  historical approval timestamps are unavailable. Do not claim this backfill
  reconstructs actual approval order.
- Lesson details use a professional participant layout: teacher/student uploaded
  photos (honest initials placeholder if absent), names, numeric IDs, profile
  links, class title/status, description and elapsed duration.
  Place Teacher and Student in two desktop columns, with each local date/time
  directly beneath that participant's name/photo, aligned on the same horizontal
  row even when names wrap. Use equal-height participant headers and the same
  header geometry for the empty Student box. Stack these cards on narrow screens
  for readability. Remove a redundant viewer-local section when both
  participants are booked. When the Student box is empty, show the viewer's own
  local lesson date/time and zone inside that empty Student box.
  The lesson title, status badge and Close button remain sticky at the top
  while the dialog body scrolls. Use "Teacher feedback", not "Teacher progress
  notes", throughout the dashboard. Always label Teacher time and (when booked)
  Student time using each participant's current profile time zone, even when
  one matches the viewer's zone. Display dates as well as times so cross-date
  lessons are clear; calculate UTC offsets at the lesson instant, including DST
  changes within a lesson. Shared calendar entries include participant-local times.
  **Updated 21 October:** Approved teachers and active students can view every
  class entry on the calendar. For another booked class, show participant names
  and numeric IDs, class title, description, date/time, duration and current
  participant photos. Show participant-local times in aligned cards. Share only
  Available/Booked status before the lesson ends; hide other classes' status at
  the exact end time. Attendance and feedback are private at all times, as are
  classroom links and other students' profile links. Use a neutral appearance for
  past classes and a read-only details view for others' booked classes. Students
  retain the ability to see and book open slots; availability is not treated as
  another person's class status. Own classes keep their full participant details,
  status and feedback. Admins continue to see all details.
  Preserve classroom, cancellation, attendance and feedback actions.
  Do not invent portraits. Protect student photos with server/database checks;
  use expiring private-image URLs, and explicitly report image failures.
- Teacher attendance choices after a lesson are **Yes / No / No but Apologize /
  Cancelled**. Yes means present; No means absent; No but Apologize is an
  excused absence with a distinct pink status. Its consequence is set in Systems >
  Settings (default: a 14-day suspension; see
  [Administrative systems](./administrative-systems.md#settings)).
  Cancelled is for a teacher-missed lesson or a cancellation communicated outside
  ABVN. Save both slot and booking as cancelled, preserve notes/history, never
  reopen the elapsed slot, and exclude this booking from weekly class allowance
  consumption. Cancelled bookings never count toward the weekly lesson limit.
  A future available slot cancelled before any booking history exists is deleted
  permanently and removed from calendar/history. A slot with any booking history
  remains auditable when later cancelled.
  The entire operation, including notes, must succeed or roll back together.
- Student feedback is **written only**, with no star/rating input or score
  displayed. Completion requires attendance present and written feedback from
  both participants, never a rating. Preserve historical stored scores during
  migration but do not display or use them; new/edited feedback saves no score.
  Apply the same requirements to Feedback, History, reminders and legacy RPCs,
  not just the lesson popup.
- Keep body text/readable controls suitable for older retired teachers. Dense
  calendar labels may be smaller; full details must remain comfortably readable
  and keyboard accessible. Never sacrifice student privacy for visual parity.

### 3.1 Calendar navigation and display

- Provide a date/time grid inspired by Teams/Outlook calendar conventions, without
  copying proprietary artwork or branding.
- Default to Week on desktop and Agenda on mobile; offer Day, Week, Month, and
  Agenda. Month is required, but is not a substitute for the time grid. A selected
  month grid may scroll horizontally inside its panel on narrow screens; Agenda
  remains the readable mobile alternative.
- Include Today, previous/next date range, date picker, visible range heading,
  current-time marker, and explicit time-zone selector.
- Show configurable working hours with a clear way to reveal all 24 hours.
- Use configurable 15/30-minute grid increments and position events by their
  actual start/end times. Overlapping events must remain individually accessible.
- Load only the visible range and bounded additional context; do not download all
  historical lessons to render a week.
- Calendar and Agenda must expose the same authorized records and actions.
  Teacher/student calendars include all approved teachers' scheduled classes,
  with full status/feedback fields only for the viewer's own classes. Other
  upcoming/ongoing classes expose only Available/Booked, never past outcomes.
- Retain filters while changing date ranges, and offer Reset filters.
- A status legend must be available without obscuring the schedule.

### 3.2 Lesson labels and details

- Use stable human-readable teacher/student IDs, distinct from private auth UUIDs.
- Use the confirmed `Teacher name - Student name (Student ID)` block format for
  booked classes. Numeric teacher IDs are in details rather than the block.
- Teacher/student calendars may show the names and numeric IDs of participants
  in other booked classes, plus title, description, pictures and participant-local
  times. Do not provide other students' profile links, contact information,
  feedback, attendance or past/completion/cancellation status. Upcoming/ongoing
  classes show Available/Booked; past entries use a neutral style. Others' booked
  details remain read-only. Open slots are visibly available to teachers/students
  and bookable to eligible students.
- Truncate long labels in dense cells, but expose full text in the detail panel.
- Clicking or keyboard-activating a lesson opens a details drawer/dialog showing:
  - Lesson ID, class title, description, and recurrence information.
  - Teacher photo, name/numeric ID and profile link.
  - Authorized student photo, name/numeric ID and profile link, when booked.
  - Date, start/end, duration, viewer time zone, and Vietnam equivalent.
  - For the viewer's own classes: booking, attendance, feedback, and cancellation
    state. For other classes: participant names/IDs/photos, class title,
    description, participant-local times, duration and upcoming availability only.
  - Classroom link for authorized participants and administrators only.
  - Applicable cancellation deadline and policy explanation.
  - Appropriate actions: book, cancel, edit, join, submit feedback, mark attendance,
    submit apology, or resolve an issue.
- Teacher profiles are public for approved, publishable members. Do not expose
  private email, phone, administrative notes, or documents in a public profile.
- Student academic profiles are available to the student themself and authorized
  approved teachers/admins, never to the public or other students.

### 3.3 Lesson status presentation

These are presentation categories, not one overloaded database status field.
Maintain scheduling, booking, attendance, feedback, and policy-case states
separately so one update does not erase the others.

| Category | Suggested color | Meaning |
| --- | --- | --- |
| Available | Green | Future slot open for booking |
| Booked / occupied | Contrasting lavender | Slot has a live booking |
| Follow-up required | Amber/yellow | Booked lesson ended; required attendance or student feedback is missing |
| Completed | Gray/slate | Lesson ended, student marked present, required attendance/feedback complete |
| No-show | Red | Student absence recorded without an accepted apology; policy review required |
| No-show with apology | Pink/rose | Student absence with apology; no automatic restriction |
| Teacher cancelled after booking | Purple | Teacher cancelled a previously booked lesson |
| Other cancellation | Muted outline | Student/admin cancellation of a booked lesson; never-booked slots are deleted |
| Expired unbooked | Muted outline | Available slot passed without a booking |
| In progress | Booked color + live label | A booked lesson has started and not ended |

- Delivered palette uses more saturated fills, darker borders and dark text
  rather than the earlier faint pastels. All cancellations currently use purple;
  only the explicit Cancelled attendance outcome establishes teacher-side cause.
  Other cancellation actors are not tracked and must not be inferred.
- Display the "My lesson" indicator independently from status color.
- Prioritize privacy and explicit outcomes: cancellations first, then recorded
  absence outcomes, then follow-up/completed, then live/upcoming availability.
- An unresolved no-show must say "Under review"; a red event does not itself
  prove the student is banned.
- Completed feedback means student lesson feedback and teacher attendance are
  present; written teacher feedback is additionally required by this proposed
  specification. Admin-configurable optional feedback must not block completion.
- Unbooked past slots must not create missing-feedback or attendance alerts.
- Keep booked cancellations available in History even if hidden by default
  in the active scheduling view. Never-booked cancelled availability is deleted
  and must not appear in calendar or history.

### 3.4 Time zones and recurrence

- Store individual lesson instants in UTC; use IANA zones for presentation.
- Default to the saved profile time zone, not an assumed browser location.
- Show local time and optionally a secondary Vietnam time row/tooltip.
- Persist a time-zone change to the profile only with explicit user confirmation.
- Changing display zone must not change stored lesson instants.
- Recurring schedules preserve the teacher's intended wall-clock time in the
  series time zone, including daylight-saving transitions.
- Reject nonexistent local times. Require an explicit offset/alternative for
  ambiguous repeated local times; never silently shift an appointment.
- Show the actual start/end dates for lessons spanning midnight.

### 3.5 Filters and privacy

- Teachers: status, date range, title, and participant filters; their calendar
  includes other teachers' classes. Share descriptions, pictures and times;
  show Available/Booked for upcoming/ongoing classes and neutral past entries.
- Students: date range, teacher, availability, and own/booked/past categories.
  Their calendar shows other booked participants' names/IDs/photos, title,
  description, local times and duration, but no past status, feedback, attendance,
  student profile links or meeting links.
- Administrators: status, teacher, student, date range, attendance, feedback
  completeness, cancellation actor, and policy-case state.
- Database RPCs return full status, attendance, feedback and meeting links only
  for the viewer's own classes/admin. Others' records include names/IDs, title,
  description, current photo paths and participant-local times, but null booking
  IDs, attendance, feedback, ratings, meeting links and student profile codes.
  Return only Available/Booked slot status while the lesson has not ended;
  return null past status. Enforce photo access in private Storage policies for
  eligible members without exposing arbitrary uploads or making student profiles
  public. Open availability remains bookable to active students.
  Do not rely on frontend hiding alone.
- Delete never-booked available slots when teachers/admins cancel them; do not
  leave them in calendar or history. Preserve booked cancellation history.
- For a student viewing their own lessons, use friendly labels such as
  "Attendance issue" and "Absence with apology"; show their own restriction and
  appeal information privately.
- Hiding a color or field in the frontend is insufficient: unauthorized data must
  be excluded by database/RPC authorization.

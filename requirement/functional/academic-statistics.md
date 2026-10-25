# Academic statistics

> **Document ID:** ABVN-FR-007
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 6.4
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

### 6.4 Academic

Delivered administrator subsections: Schedule and Statistics. Schedule contains
the existing shared lesson calendar; do not duplicate its calendar under Academic
overview. Statistics has top tabs for Lessons, Teachers and Students and a shared
Week/Month/Quarter/Year reporting-period control. The default view is Lessons /
Month. Match the established compact dashboard cards, tables, green accents,
neutral panels and sidebar navigation. Keep the view tabs, selected date range
and period controls together in one compact toolbar, without a redundant
"Jump to" label. On narrow screens, place view tabs and period controls on
separate rows and allow controls to wrap without horizontal overflow. Provide
direct pickers for ISO weeks 1–52/53, months 1–12, quarters 1–4 and year;
changing the period size or statistics tab keeps the selected date in view.
Include a Current shortcut that returns to today's period in the administrator's
configured time zone. Show the relevant UTC offset (for example, UTC+7) rather
than an IANA identifier in the reporting toolbar.
Prioritize above-the-fold information with dense KPI cards and a trend chart
beside a status breakdown or ranked table on wide screens; stack cleanly on
narrow screens.

- Lessons (updated 24 October): row 1 has one box with Total lessons,
  Completed, Booked, Unbooked, Absent, Absent with apology and Cancelled on the
  left and a pie chart of those six statuses on the right. Row 2 is a column
  chart with four columns per bucket: Total, Completed, Unbooked and Absent +
  Absent with apology. Buckets are day (week view), week (month), month
  (quarter) and quarter (year). Completed means the teacher recorded present;
  Absent and Absent with apology come from the recorded attendance.
  Every number in the box is followed by its share in brackets, e.g. "2 (18%)";
  the six status shares are whole numbers that always add up to 100%.
  In month view, chart buckets are whole Monday-Sunday ISO weeks labelled with
  the week number and date range beneath, e.g. "Week 43" over "(Oct, 19-25)" or
  "Week 40" over "(Sep 28 - Oct 4)". A week spanning two months counts every
  day of the week in the column and line charts (Lessons, Teachers and Students),
  while totals, tables and the attendance distribution cover only the selected
  month.
  The Lessons and Teaching activity charts have a Column / Line switch at the
  top right of their panel (Column by default); Line shows the trend. The
  Teaching activity chart uses two y axes sharing the same grid lines: Lessons
  (Total and Completed lessons) on the left and Teachers (Engaged and New
  teachers) on the right; Teachers lines are dashed in Line view.
- Teachers: row 1 has one box with Total teachers (approved, active now),
  Engaged teachers (published at least one non-cancelled lesson in the period)
  and New teachers (approved in the period), each followed by its percentage of
  Total teachers, beside a column chart with two columns per bucket: Total
  lessons with Completed lessons drawn inside it, and Engaged teachers with New
  teachers drawn inside it, using the same buckets as Lessons. Row 2 is a tall
  table (25 rows per page by default) of every engaged teacher with Name, ID,
  Total lessons (cancelled excluded), Completed lessons and Students taught,
  sorted by total lessons by default and sortable by column.
- Students: row 1 has one box with Total active students, Total engaged
  students (attended at least one lesson) and Banned/suspended students
  (current), each followed by its percentage of Total active students, beside a
  table of banned/suspended students (ID, Name, Status, Teacher reported,
  Date/Time, sorted by ID) where the teacher is the one who most recently
  marked the student Absent or Absent with apology and the date is when that
  attendance was submitted. Row 2 is a tall table (25 rows per page by default)
  of engaged students (Rank, Name, ID, Total attended lessons, sorted by
  attended lessons). Row 3 has a column chart of students by lessons
  attended (week 0/1/2/3/4+, month 0/1–3/4–8/9–16/17+, quarter and year in
  steps of five) and a line chart of lessons attended and engaged students
  over the same buckets. Missing values display "-".
- "Students taught" counts distinct students with present attendance in completed
  bookings for completed lessons. Repeat students count once in a period.
  Absences, apologies, cancelled and upcoming lessons are not attended.
- Period boundaries and chart buckets use the administrator's configured IANA
  time zone and calendar periods (Monday–Sunday ISO week, calendar month,
  calendar quarter, calendar year); timestamps remain stored in UTC. Include
  zero buckets and identify the selected date range in that time zone.
  Active-member counts are current; "new" counts reflect approved accounts
  created within the selected period.
- Aggregate at the database for the selected period; do not load or expose
  project-wide lesson-level records to construct aggregate dashboards. Use an
  admin-only read-only RPC, preserve privacy/authorization, and define all metric
  denominators. Display loading, empty, failure, and schema-setup states explicitly.
- Public pages and dashboard navigation show accessible, branded loading states
  with content skeletons and motion that respects reduced-motion preferences.
  Keep route loading UI immediate and avoid serializing independent requests.
- Charts have an accessible text/table equivalent and are responsive.
  The expanded planned roadmap (class audit, policy cases, attendance/feedback
  analytics, overrides and exports) remains separate from these delivered views.

- View all authorized lesson details, participants, feedback, attendance,
  recurrence, changes, and meeting links.
- Filter/search by teacher/student, date, outcome, follow-up state, and cohort.
- Resolve conflicts, urgent cancellations, incorrect attendance, and disputed
  no-show reports with reasoned, audited overrides.
- Analytics include availability, booking rate, attended lessons/hours, feedback
  completion, teacher/student cancellation rates, no-shows, and unresolved cases.
- Identify engaged learners and learners needing support using transparent
  measures, not unexplained "hardworking" or "violator" scores.
- Define denominators and date/time zone for every metric; distinguish true
  no-shows from cancellations and disputed/overturned reports.
- Restrict exports to authorized administrators, scope them to filters, and record
  sensitive exports in the audit trail.

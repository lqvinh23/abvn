# Administrative systems

> **Document ID:** ABVN-FR-008
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 6.5
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

### 6.5 Systems

Subsections: **All accounts** and **Settings** are available. Notifications and
templates, Audit log, and Integrations and operations remain planned.

Only **All accounts** is a separate account subsection; there is no Guests
subsection. Guests (signed-in accounts with no assigned role, including
applicants and legacy membership requests) appear in All accounts and can be
filtered by role. Do not confuse this category with the existing Guest teacher
participation status. The other operational subsections above remain planned.

#### Settings

Systems > Settings is the single place where admins view and change the programme
rules. The database enforces every value on the server; changing a value takes
effect on the next action, with no deployment.

**Requirements**

- Only admins can read or write settings. Members see a plain-language summary of
  the rules that apply to them (student and teacher Settings page); only students
  and admins see the payment account, and teachers never do.
- Settings are grouped: Programme time, Booking, Cancellation, Attendance and
  student status, Study period and fees, Student eligibility, Teachers.
- Every setting has a server-validated type and range. Cross-field rules are also
  validated (maximum lessons per week at least the standard number, maximum
  package at least the minimum, maximum age at least the minimum age). Invalid
  input is rejected in full; no partial save.
- A setting that was never changed uses its default. Reset to defaults removes
  every override.
- Each change records the setting, old and new value, admin, time and an optional
  note; the page lists the 25 most recent changes. Resetting is recorded too.
- Changes apply to future actions only. Existing bookings, past attendance results
  and existing study-expiry dates are not rewritten.
- Settings never contain credentials or secrets. The payment account is a
  receiving bank account for fees, not an integration key.
- Weeks run Monday to Sunday in the programme time zone. The week of a lesson is
  the week it starts in, and weekly limits count that week.

**Default values (confirmed 24 October 2026)**

| Area | Setting | Default |
| --- | --- | --- |
| Programme time | Rule time zone | Asia/Ho_Chi_Minh |
| Booking | Standard lessons per week | 2 |
| Booking | Maximum lessons per week (third and fourth lessons) | 4 |
| Booking | Extra lessons open when still available this long before start | 5 hours |
| Booking | A different teacher for every lesson in a week | On |
| Booking | Next week opens for booking | Saturday 09:00 |
| Booking | Feedback required before booking | On |
| Cancellation | Student cancellation cut-off | 24 hours |
| Cancellation | Education Affairs (EA) team email | abettervietnam.ea@gmail.com (the address in the website footer) |
| Attendance | Absent without apology (teacher records No) | Ban until an admin restores access |
| Attendance | Absent with apology (teacher records No but Apologize) | Suspend for 14 days |
| Student status | Weeks without attending before inactivation | 4 |
| Study period | Free study period | 6 months |
| Study period | Block booking after the study period ends | On |
| Fees | Paid extension | 6 months |
| Fees | Price per lesson | 30,000 VND |
| Fees | Package size | 10 to 50 lessons at one time |
| Fees | Bank name, account holder, account number, transfer instructions | Empty; set before launch |
| Eligibility | Student age | 16 to 25 years |
| Teachers | Publish lessons up to | 180 days ahead |

**How each rule behaves**

- *Weekly limit.* A student has two standard lessons per week. Lessons three and
  four (up to the maximum) can be booked only when the lesson is still available
  within the extra-booking window (default 5 hours) before it starts. Cancelled
  bookings do not count.
- *Different teachers.* Booking a second lesson with the same teacher in the same
  week is refused.
- *Booking window.* Lessons in the current week can be booked at any time. Lessons
  in the next week open on the configured day and time of the current week
  (default Saturday 09:00); later weeks stay closed. The message states when the
  week opens.
- *Feedback first.* A student who has not left written feedback for a finished,
  non-cancelled lesson they were not recorded absent from cannot book another
  lesson until the feedback is saved.
- *Cancellation.* A student cannot cancel inside the cut-off. The message tells
  them to email the teacher and CC the EA team (with the configured address).
  Teachers and admins are not subject to the cut-off. A cut-off of 0 allows
  cancellation until the lesson starts.
- *Absence.* When a teacher records an absence, the configured action is applied
  immediately and recorded in the student's status history as an automatic
  decision with the lesson date. A ban is never lowered by a later suspension,
  and an existing restriction is never shortened. A timed suspension ends
  automatically (a restriction length of 0 means until an admin restores access).
  Existing future bookings are preserved; admins resolve them.
- *Inactivity.* A student with no attended lesson for the configured number of
  weeks (counted from joining, the last time the student was made Active, or the
  last attended lesson, whichever is latest) becomes Inactive. Setting the number
  to 0 turns this off. When this migration is first applied, every existing student
  starts a fresh period.
- *Study period.* Newly approved students get the free period. Afterwards, with
  expiry blocking on, booking is refused with a message giving the extension
  length, package size, price per lesson and instruction to contact ABVN. After
  payment, an admin extends the Expiry date on the student's Edit page (the
  extension button adds the configured months). Payments are not tracked in the
  system yet.
- *Eligibility.* A student application whose age on the day of submission is
  outside the range is rejected by the server.
- *Review job.* Restoring finished suspensions and inactivating students is applied
  when a student opens their dashboard or books, when an admin selects Run policy
  review, and hourly where the pg_cron extension is available.

**Planned**

- Per-student exceptions and an audited override for the booking rules.
- Notification to the student and teacher when an automatic restriction is applied.
- Payment records linked to study-period extensions.
- Draft settings with an effective date, an impact preview and rollback.

- Configure cancellation cutoff, weekly booking quota, lesson duration choices,
  registration opening/closing rules, book-ahead horizon, age limits, programme
  duration, and required attendance/feedback policies.
- Configure weekly rule time zone and week boundary explicitly; recommended
  programme standard is Asia/Ho_Chi_Minh with Monday week start.
- Registration windows are evaluated on the server, including exact boundary times.
- Configure no-show/apology rules, grace periods, restriction durations, appeal
  process, and exceptions. See Section 7.
- Show draft policy changes, validation, impact preview, effective date, and
  confirmation. Keep policy versions and notify affected members.
- Do not retroactively punish conduct under a later policy. Define how new
  settings affect existing bookings; preserve previously communicated deadlines
  unless an audited exception is explicitly made.
- Manage optional email/in-app categories, reminder offsets, email templates,
  project announcements, and delivery status/retries.
- Templates use approved placeholders and safe content, with test preview/send.
- View all accounts, including Google-only users with no application or role.
  The table uses Role (Teacher, Student, Admin, or Guest) and Status; show `-`
  when a value does not apply. Do not show country or English level here.
- Give Teacher, Student, Admin, and Guest role tags distinct colors while
  keeping their text labels visible. Manage role assignment/removal from one
  per-account popup; dismiss it when clicking outside or selecting another
  account. Do not provide a separate Guests subsection.
- Keep the primary Teacher/Student/Admin role separate from Admin access.
  An account may have Admin access together with Teacher or Student, but not
  both Teacher and Student roles. Admin access can be assigned to an existing
  Teacher or Student. Show an eligible combined-role user's workspace switch
  in the sidebar; Admin is the default workspace.
- Removing Teacher or Student marks that participation inactive without
  deleting the role, account, or lesson history; assigning the same role again
  reactivates it. Removing Admin access preserves any Teacher/Student role and
  its status. An Admin-only account becomes a Guest with pending account status.
  Role removal is not permanent account deletion.
- Prevent an Admin from removing their own Admin access or the last approved
  Admin's access. Keep permanent account deletion separate, confirm it, and
  protect records with lesson history.
- Application settings must not expose Supabase secret/service keys, Google
  secrets, database passwords, or email-provider credentials.
- Show failed background tasks/integration health explicitly; never mark a queued
  or failed email as delivered.

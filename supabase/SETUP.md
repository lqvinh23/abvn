# ABVN learning platform setup

## What is implemented

- Google OAuth sign-in/out with server-side session verification and refresh.
- New accounts are **Guests** (no assigned role) and cannot teach/book until
  their recruitment application and interview receive final admin acceptance,
  unless an administrator directly assigns a role from **Systems → All accounts**.
- Teacher, student, and administrator dashboards, plus editable profiles and
  private JPEG/PNG/WebP avatar uploads (maximum 2 MB).
- Teachers publish individual lesson times in an IANA time zone: 30/45/60 minutes
  or a custom whole-minute duration between 30 and 120 minutes.
  Start/end timestamps are stored in UTC. Confirmation shows both local and
  Vietnam time. Nonexistent and ambiguous daylight-saving times are rejected.
- Students see upcoming teacher availability, book exclusively, and cancel only
  **more than 12 hours** before a lesson. Database constraints prevent teacher and
  student overlaps, even if the app is bypassed.
- Participants get the teacher-supplied classroom link after booking. The teacher
  creates the actual Google Meet/Zoom/Teams/Skype meeting outside ABVN.
- Teachers record attendance and Teacher feedback after a lesson ends. Students
  submit written feedback without ratings. Participants see each other's feedback;
  administrators can audit it. Completed hours count only attendance marked present.
- Administrators approve/reject/restore/suspend non-admin accounts and audit or
  cancel upcoming lessons. Administrator privileges cannot be granted through
  signup metadata, profile editing, or the review UI.
- Accessible role-specific sidebars, collapsible desktop navigation, mobile menu,
  and dedicated schedule, feedback, history, student-list, and reminder views.
- Day/week/agenda calendars with local time zones, date navigation, status/person
  filters, labelled status colours, and keyboard-accessible lesson dialogs.
- Teacher lesson titles/descriptions, click-to-create time cells, and stable
  member IDs. Approved teachers have public member profiles; student profiles
  are limited to themselves, connected approved teachers, and administrators.
- Admin teacher/student management tables with profile editing, teaching/study
  status filters, name/ID search, sorting, and 10/25/50/100-account pages.
  The teacher directory lists approved teachers only, with completed-lesson and
  unique attending-student counts. Membership filtering remains in student and
  Systems tables; Guest accounts appear in Systems → All accounts.
- Admin Landing/About/news editors with private drafts, live desktop/mobile
  preview, image uploads, and explicit publishing.

When Supabase is configured, the public teacher directory lists real approved
active/guest teachers and links to their member profiles. Current photos of these
public teachers can be read and signed for one hour; all student photos remain
private. Missing photos use initials, never fictional portraits.
Unconfigured development retains the labelled sample directory. The CMS imports
the existing sample news as editable initial content; replace it before launch.
Sample teachers are not login accounts and are not bookable.

This is the core workflow, **not the full PRD**. Automated emails,
recurring availability,
Editable global policies, programme enrollment limits, and automatic video
meeting creation are not implemented. Internal recruitment replaces the old-site
application links and the one-click new-membership request.

## Teacher directory statistics upgrade (22 October 2026)

Run [`202610220015_teacher_directory_statistics.sql`](./migrations/202610220015_teacher_directory_statistics.sql)
once in Supabase SQL Editor, then refresh the teacher directory. This read-only,
admin-only aggregate RPC requires the existing learning-platform/member-management
schema (through migration 003); it does not modify profiles, lessons or bookings
and can be applied independently of recruitment migrations 013/014.
Counts cover all lesson history, for at most 100 requested approved teachers.
Completed lessons counts completed slots. Students taught counts distinct
students marked present in completed bookings of completed slots.
Until this migration is applied, the directory remains usable with a visible
setup notice and unavailable statistics rather than misleading zeroes.

## Recruitment upgrade (22 October 2026)

Apply earlier migrations in filename order, then run
[`202610220013_recruitment.sql`](./migrations/202610220013_recruitment.sql),
followed by
[`202610220014_recruitment_workflow.sql`](./migrations/202610220014_recruitment_workflow.sql)
**once each** in your Supabase SQL Editor. If 013 is already applied, run only 014.
Do not rerun the base schema or 013 on an existing project. Refresh the website
afterward; no new environment secrets are needed.

The migrations create the private `recruitment-documents` bucket (5 MB PDF/DOC/
DOCX), question/application/interview/feedback tables, scoped upload/read/delete
policies, default teacher/student questions and restricted workflow RPCs.
Migration 014 preserves earlier submissions (including older teacher applications
without photos), while enforcing teacher photo/CV requirements on new submissions.
It permits optional student documents and requires the interview to end before
a final decision. Existing decisions are not reversed.
Applicant photos use the existing private `avatars` bucket (2 MB JPEG/PNG/WebP).
The website accepts a combined upload request up to 8 MB while independently
enforcing each file limit; check hosting request limits before deployment.

- Public applicant pages: `/apply` and `/student-apply`, with sign-in, a four-step
  roadmap, forms, in-app review status, interview booking and final decisions.
- Admin: **Teacher management / Student management > Recruitment**. Review
  Applications, edit/remove Form questions, and create/cancel Interview slots.
  Slots are shared by both recruitment types and separate from lessons.
- Teacher CV and photo are required; student evidence/photo are optional.
  Student age 16-25 and required answers are validated by the database.
- An invited applicant books an available slot. Times use their application time
  zone. Admins supply an existing Meet/Zoom/Teams/Skype link; ABVN does not create
  video meetings. The applicant can cancel/rebook before the slot starts.
- After the slot ends, record required admin-only interview feedback and a final
  decision. Acceptance atomically activates/synchronizes the role/profile.
  Active approved teachers appear in the existing public teacher directory.
- **Systems > All accounts** includes Guest accounts, including applicants.
  This is unrelated to a teacher's Guest participation status.
- Rejected applicants can reapply only after admin enables it. Old submissions
  and internal decision history remain intact. No recruitment emails are sent.
- The old `request_membership` RPC is retired. `review_member` can still restore
  existing role accounts but cannot grant an initial role to a Guest; legacy
  pending users must complete recruitment.

## Student recruitment campaigns upgrade (24 October 2026)

After the earlier migrations (through 030), run
[`202610240031_student_recruitment_campaigns.sql`](./migrations/202610240031_student_recruitment_campaigns.sql)
once in Supabase SQL Editor. Refresh **Student > Recruitment > Campaigns** and
use **Add campaign** to enter its name and application/interview booking dates.
No campaigns are seeded and no existing applications are assigned automatically.
Without an open campaign, new student applications are closed. Teacher recruitment
is unchanged.

- ABVN normally accepts applications in November-December for January courses and
  May-June for July courses. Admins can choose other dates when needed.
- Opening and closing dates include the entire calendar day in
  `Asia/Ho_Chi_Minh`. Upcoming is before form opening; Ongoing lasts from form
  opening through the later of form/interview closing; Completed is afterward.
  No cron job is needed: the page and database evaluate dates on each request.
- Application windows cannot overlap. New student applications are automatically
  linked to the open campaign; that link cannot be changed afterward.
- An invited student can book only during their campaign's interview booking
  window. Dates control when booking is allowed, not the time of the actual
  interview. Already-booked interviews and existing applications are retained
  when dates change. Unassigned legacy applications remain visible but have no
  campaign booking window; contact ABVN to handle these cases.
- Applications defaults to the latest campaign by form opening date. Filters
  support campaign name, campaign status and application stage, plus All campaigns
  and Unassigned. Legacy applications remain Unassigned.
- Campaign reports show all submissions, invited applicants (including later
  booked/decided applications), and accepted students. Gender, age and area
  charts describe accepted students only. Age is measured on form opening day
  so historical reports do not change on birthdays.
- New student forms require Male, Female or Other. Area is derived from a
  recognized province/city name, including accented Vietnamese and common aliases.
  North includes the northern provinces; North Central covers Thanh Hoa through
  Hue; South Central covers the southern central coast and Central Highlands;
  South covers the southeast and Mekong Delta. Unrecognized free-text names and
  missing data are reported as Unknown, not guessed.
- Campaign schedules are publicly readable; editing and demographic reports are
  admin-only. Application, feedback and document privacy rules are unchanged.

Validation: `node --experimental-strip-types --test tests/platform-database.test.mjs tests/recruitment.test.mjs`.

### Campaign management upgrade (25 October 2026)

After migration 031, run
[`202610250032_student_campaign_management.sql`](./migrations/202610250032_student_campaign_management.sql)
once, then refresh **Student > Recruitment > Campaigns**.

- Add campaign and Back to campaigns are in the recruitment top toolbar.
  The table combines name/status with a status tag and provides Edit/View/Delete.
- In Edit campaign, **Mark campaign completed** immediately closes
  new student applications and interview bookings. Original dates, existing
  applications, reports and booked interviews are preserved. Editing the dates
  afterward does not clear manual completion. Migration 033 below adds an
  explicit Mark campaign incomplete action.
- Delete opens a confirmation popup. The database rejects deletion when any
  application is linked, including rejected or accepted applications.
- Existing campaigns retain date-derived status until manually completed.
  Both management actions require an approved admin account.

### Campaign due dates upgrade (25 October 2026)

After migration 032, run
[`202610250033_student_campaign_due_dates.sql`](./migrations/202610250033_student_campaign_due_dates.sql)
once and refresh. Deploy the matching application changes together.

- Due date is required in Add/Edit campaign and appears in the campaign table.
  Existing campaigns receive the later of their form/interview closing dates;
  manually completed campaigns keep their completion marker.
- A campaign is Completed only after its due date (inclusive Vietnam calendar
  day) or when manually marked completed. Closing both booking windows alone
  does not complete a campaign. A due date earlier than a booking window's end
  closes new submissions/bookings after that due date.
- Manually completed campaigns offer **Mark campaign incomplete** through their
  due date. This clears the manual marker; the scheduled form/interview windows
  still control eligibility. After the due date, first extend and save it.
- The report header uses the table's status tag, without the Vietnam time suffix.
  Dates continue to be evaluated in Vietnam time.
- Existing applications, interview bookings and report data remain intact;
  delete protection and approved-admin authorization are unchanged.

### Student National / Citizen ID upgrade (25 October 2026)

After migration 033, run
[`202610250034_student_national_identity.sql`](./migrations/202610250034_student_national_identity.sql)
once and deploy the matching application changes.

- New student applications require exactly the last **8 digits**, preserving
  leading zeros. Do not enter or upload a full National / Citizen ID number.
  The required student-only question appears in Form questions; its label/help
  and position are editable, but it cannot be disabled or deleted.
- Acceptance copies the number into private profile details. Admins can view and
  edit it in Student profiles, and students see it read-only in My profile.
  It is excluded from teacher reports, directories and public profile data.
- Another account is blocked once an ID has been accepted as a student, even
  before the study period ends. Pending/rejected applications alone do not claim
  an ID. Acceptance also checks duplicates, so an application submitted before
  another account's acceptance cannot bypass the restriction.
- Existing applications and students keep null IDs; no values are invented and
  existing profiles can still be saved. Backfill IDs in the admin student editor
  to protect legacy students from cross-email reuse. Known values cannot be
  cleared; corrections must also contain exactly eight digits.
- A private claim registry retains accepted IDs even after account deletion or a
  correction. It has no client read/write grants, and identity checks are internal
  database functions. Errors never disclose another student's name or account.
  ABVN must review disputed matches/corrections; eight digits can collide and
  self-reported information does not verify identity.
- Teacher application requirements, campaign dates, profile uploads, configurable
  age checks and existing recruitment validation are preserved.

Validation: `node --experimental-strip-types --test tests/platform-database.test.mjs tests/recruitment.test.mjs tests/recruitment-database.test.mjs tests/directory-table.test.mjs`.

### Student application assessment upgrade (25 October 2026, superseded by 036 below)

After migration 034, run
[`202610250035_student_application_assessments.sql`](./migrations/202610250035_student_application_assessments.sql)
once and refresh the admin workspace.

- Student > Recruitment > Applications shows Applicant, Info (city/country,
  DOB and current age), Submitted (UTC+7), Stage and Campaign. Click a name
  to open the full private application; the back link retains table filters,
  sort order, page and page size.
- Application details place the submitted application and answers on the left
  and one ABVN review note on the right. Assessment and review use the same
  note field; Back to applications and Save application review remain in the
  top toolbar. Save a note without a decision, or choose Pass / Fail in the
  same form.
- Saving a note appends an admin-only entry without changing the stage or
  granting membership. Notes remain in the shared review history and can be
  added before or after a decision.
- Pass invites to interview; Fail rejects the submitted application. Final
  student activation still requires acceptance after the interview.
- The migration extends the existing private feedback table to support
  assessment-only entries. Existing decisions, notes, RLS and campaign
  counts are preserved. Only an approved admin can save a note.
- Without migration 035, the details view explicitly explains how to enable
  notes; existing Pass / Fail decisions continue to work.

Validation: `node --experimental-strip-types --test tests/platform-database.test.mjs tests/recruitment.test.mjs`.

### Campaign round decisions upgrade (25 October 2026)

After migration 035, run
[`202610250036_campaign_round_decisions.sql`](./migrations/202610250036_campaign_round_decisions.sql)
once, then refresh. Do not rerun previous migrations.

- Applicant details have separate scroll areas for the submitted application
  and the fixed right-side ABVN review panel. The detail toolbar replaces the
  recruitment tabs; Back is on the left and Save on the right. Action buttons
  have icons; the review history is no longer displayed.
- Save one private editable note and optional Pass/Fail decision for each round.
  Saving never changes the student's application stage or grants membership.
  Saved reviews reload and include concurrent-edit protection.
- In Campaigns > Actions, publish the application or interview round after
  confirming. Only eligible unpublished Pass/Fail decisions are processed.
  Undecided and already-published applications are unchanged. Repeat later for
  additional reviews. An empty batch returns an explicit message.
- Application Pass invites to interview; Fail rejects. Interview Pass activates
  the student account; Fail rejects after interview. Booked interviews must
  have ended. Existing identity/account restrictions still apply; any failure
  rolls back all decisions in the batch.
- Published decisions cannot be changed, but their notes may be corrected.
  Direct student decision RPCs and role assignment for open student applicants
  are blocked; use campaign publication. Booking/cancellation logistics and
  teacher recruitment remain unchanged.
- Existing student feedback seeds the current private review per round,
  preserving already-published decisions even when a later note was added.
  Old feedback is retained. Applicants, teachers and anonymous clients cannot
  read the new review table or save/publish decisions.
- Unassigned legacy applications support saved reviews but not campaign
  publication. The UI reports missing migration 036 explicitly rather than
  falling back to immediately changing stages.

Validation: `node --experimental-strip-types --test tests/platform-database.test.mjs tests/recruitment.test.mjs tests/recruitment-database.test.mjs tests/directory-table.test.mjs`.

## Interview scheduling and contact updates (26-27 October 2026)

After migration 036, run the following migrations once in filename order in
Supabase SQL Editor: [`202610260037_interview_review_and_cancellation.sql`](./migrations/202610260037_interview_review_and_cancellation.sql),
[`202610260038_sync_interview_notes_and_cleanup.sql`](./migrations/202610260038_sync_interview_notes_and_cleanup.sql),
[`202610270039_interview_booking_admin_details.sql`](./migrations/202610270039_interview_booking_admin_details.sql),
and [`202610270040_interviewer_slot_overlap.sql`](./migrations/202610270040_interviewer_slot_overlap.sql).
On an existing project, run only migrations that have not already been applied,
then refresh the website.

- Interview cancellation uses the configurable cutoff in **Systems > Settings**.
  Interview review notes are written from application details; cancellation
  clears the associated note and deletes a slot that has never been booked.
- Invited applicants see the interviewer name, email and time zone for available
  slots. This contact lookup is limited to invited applicants.
- Non-cancelled interview slots may overlap across different interviewers, but
  one interviewer cannot create overlapping slots. Applicant booking remains
  exclusive per slot. Lesson availability continues to be scoped per teacher.

## Academic statistics upgrade (23 October 2026)

Run [`202610230019_academic_statistics.sql`](./migrations/202610230019_academic_statistics.sql),
then [`202610230020_academic_statistics_navigation.sql`](./migrations/202610230020_academic_statistics_navigation.sql),
then [`202610230021_academic_statistics_timezone.sql`](./migrations/202610230021_academic_statistics_timezone.sql),
then [`202610240024_academic_statistics_report.sql`](./migrations/202610240024_academic_statistics_report.sql)
in Supabase SQL Editor after the learning-platform schema and member management
migration 003, then refresh **Admin > Academic > Statistics**. The last migration
replaces the earlier summary functions with one read-only admin RPC,
`admin_academic_statistics`, that reports database aggregates for calendar
periods evaluated in the administrator's configured IANA time zone; timestamp
storage remains UTC. The navigation upgrade enables selecting any
week/month/quarter/year. The migrations do not change profiles, lesson slots or
bookings.
Until the report migration is applied, Schedule continues to work and Statistics
displays an actionable setup notice. If you ran the report migration earlier,
run it again: it is safe to repeat and updates the function so month charts include the whole Monday-Sunday weeks (for example
Sep 28 - Oct 4 in October) while totals and tables stay within the month.

The Statistics tabs are Lessons, Teachers and Students; choose Week, Month,
Quarter or Year, then use the picker to jump to a specific ISO week, calendar
month, quarter or year. All date boundaries and displayed ranges use the
administrator's configured time zone. Lessons are classified from the slot
status and the attendance a teacher records: Completed (present), Absent, Absent
with apology, Booked, Unbooked (open availability) and Cancelled. Charts group
by day for a week, week for a month, month for a quarter and quarter for a year.
An engaged teacher published at least one non-cancelled lesson in the period;
a teacher's total lessons exclude cancelled lessons. An engaged student attended
(present) at least one lesson. Students taught counts unique students marked
present, while student attendance excludes absences, apologies, cancellations
and future bookings. The banned/suspended table lists current restrictions; the
reporting teacher is the teacher who most recently marked that student Absent
or Absent with apology, and the date is when that teacher's attendance and
feedback were submitted (the lesson end time if no feedback exists).

## Student directory and profiles upgrade (24 October 2026)

Run [`202610240025_student_directory.sql`](./migrations/202610240025_student_directory.sql)
in Supabase SQL Editor after migration 017 (recruitment form fields) and the
earlier migrations, then refresh **Admin > Student > Directory**. It adds:

- `profiles.city`, `student_joined_at` and `study_expires_on`. A student's study
  period is six months from the date the account was given the student role; the
  migration backfills existing students and a trigger stamps the dates whenever
  the student role is assigned (application acceptance or admin assignment).
  Admins extend the period from the student's Edit page.
- `student_restriction_history`, an admin-readable log written by a trigger each
  time a student moves into or out of Suspended/Banned, with the reason and admin.
- Admin-only functions `admin_student_directory_statistics`,
  `admin_student_profile` and `admin_save_student`.
- Application details (`profile_application_details`) can now be edited for
  students who never applied: `application_id` and `weekly_hours` are optional.
  (Migration 026 follows; apply it right after.)

Until it is applied the directory still lists students but shows a setup notice
instead of statistics, and the View/Edit pages explain that the migration is
needed. The migration is not repeatable (it adds columns); apply it once.
The expiry date is shown with Expired/Expires-soon markers. Migration 028 (below)
can block booking after the date passes.

### Student profile details upgrade (second migration, 24 October 2026)

After migration 025, run [`202610240026_student_profile_details.sql`](./migrations/202610240026_student_profile_details.sql).
Apply it once; it adds columns and replaces functions. It adds:

- `profiles.address`, `occupation`, `organization`, `facebook_url` and `cv_path`.
- The reworked student application: `recruitment_applications` gains city,
  detailed address, occupation, organization, English level, learning goals and
  hobbies; weekly hours become optional and are removed from the student form.
  The student form fields are configured in `recruitment_form_fields` (everything
  required except photo, CV and introduction video); teacher forms are unchanged.
  `submit_recruitment_application` has seven new optional parameters, and
  accepting a student application copies the new fields into the profile.
- Storage policies that let admins upload a student's profile image and CV.
- `admin_student_profile` (replaced), `teacher_student_profile`,
  `teacher_student_directory_details` and a new `admin_save_student` signature.
  Teachers can open every student account in the directory, regardless of
  participation status, and see email, age, intro video and CV. Phone, birth date, detailed
  address, Facebook, application answers and restriction history stay admin-only, and
  the all-lessons table is hidden from teachers.
- Run migration 027 after 026 to update existing installations with these report
  permissions. On a fresh database, apply both migrations in order. The CV read policy
  (`recruitment_documents_teacher_student_cv_read`) and `teacher_can_read_student_cv`
  let teachers open a student's CV only when that CV is on a student profile.
Students have no public profile; `/members/[code]` returns Not found for students.

### Programme settings and enforced rules (third migration, 24 October 2026)

After migration 027, run [`202610240028_platform_settings.sql`](./migrations/202610240028_platform_settings.sql),
then [`202610240029_inactivate_expired_students.sql`](./migrations/202610240029_inactivate_expired_students.sql),
then [`202610240030_guard_expired_student_reactivation.sql`](./migrations/202610240030_guard_expired_student_reactivation.sql),
once each. They add **Systems → Settings** and enforce the rules in the database.
Migration 029 makes an approved student's status change to Inactive after their
expiry date when study-expiry enforcement is enabled. The existing hourly policy
review and student dashboard review apply the change. Migration 030 prevents
restoring Active until the expiry date is extended. The migrations add:

- `platform_settings` and `platform_settings_history` (admin-only through RPCs; no
  direct table access) and the functions `admin_platform_settings`,
  `admin_save_platform_settings`, `admin_reset_platform_settings`,
  `admin_run_policy_review` and `member_policy_summary`. A setting with no stored
  row uses the default defined in `platform_setting_specs()`.
- Booking rules in `member_book_lesson`: weekly limit (default 2 standard lessons,
  up to 4 if still available 5 hours before the start), a different teacher for
  every lesson in a week, next week opening Saturday 09:00, written feedback before
  booking, and blocking after the study period ends.
- Cancellation cut-off in `member_cancel_lesson` (default 24 hours).
- `profiles.restriction_ends_at` and `last_activated_at`, the automatic absence
  restrictions applied when a teacher records No or No but Apologize (ban, or a
  14-day suspension), and `review_student_policies` for inactivation after 4 weeks
  without attending and for ending timed suspensions. Existing students start a
  fresh inactivity period when the migration is applied.
- The free study period, student application age range and teacher publishing
  horizon now read their settings.
- A pg_cron job (`abvn-student-policy-review`, hourly) when the extension is
  available. Otherwise run it from **Systems → Settings → Run policy review**; it
  also runs when a student opens the dashboard or books, or an admin opens the
  student directory.

After applying, open **Systems → Settings** and enter the receiving bank account for
fees; it is empty by default. The Education Affairs email defaults to the address in
the website footer. Existing study-expiry dates are not changed. With expiry
enforcement enabled, students whose expiry has passed become Inactive and have
read-only access to their lesson history until an admin extends the expiry date and
restores Active status. Disabling *Block booking after the study period ends*
also disables the automatic status change.
Database tests: `node --test tests/platform-database.test.mjs tests/platform-settings.test.mjs`.
Verify in a non-production project using a guest account and an admin: submit,
invite, book, cancel/rebook, complete an interview, accept, and confirm role sync.
Verify that another applicant cannot read documents or internal feedback.
Admin attachment links expire after 10 minutes. Do not make either bucket public.
Database tests run with `node --test tests/recruitment-database.test.mjs`;
on Node 22 the existing full suite needs
`node --experimental-strip-types --test tests/*.test.mjs` (Node 24+ strips types
by default). No Node upgrade is necessary for this local validation.

## Admin All accounts actions (23 October 2026)

After applying the recruitment and interview-detail migrations through
[`202610230020_remove_legacy_unbooked_interviews.sql`](./migrations/202610230020_remove_legacy_unbooked_interviews.sql),
apply
[`202610230021_account_management.sql`](./migrations/202610230021_account_management.sql)
once in Supabase SQL Editor. It enables direct admin assignment of Guest accounts
as approved teachers or students from **Systems → All accounts**, closing a
matching open recruitment application and cancelling its booked interview
without losing the internal decision trail.

The Remove action permanently deletes the auth account, profile, application
data and applicant uploads so a later signup creates a new Guest account. It
preserves lesson history: accounts referenced by lesson slots, bookings or
feedback cannot be removed. Applicant assessments are deleted, and associated
interview slots are retained as cancelled, unlinked records.

### Combined Admin access (23 October 2026)

After migration 021, apply
[`202610230022_combined_admin_roles.sql`](./migrations/202610230022_combined_admin_roles.sql)
once in Supabase SQL Editor. Existing Admin accounts are backfilled with Admin
access. From **Systems → All accounts**, an Admin can grant Admin access to a
Teacher or Student, or assign a Teacher/Student role to an Admin-only account.
An account cannot have both Teacher and Student roles. Assigning Admin access to
a Guest with an open application closes that application without accepting the
teacher/student application.

Accounts with Admin access show both role tags when they also have a Teacher or
Student role. Their sidebar provides a workspace switch. Guest accounts are
included in All accounts; there is no separate Guests subsection.

### Role status management (23 October 2026)

After migration 022, apply
[`202610230023_role_management.sql`](./migrations/202610230023_role_management.sql)
once in Supabase SQL Editor. The All accounts role menu can set a Teacher or
Student to Inactive without deleting the role or lesson history. The same menu
can reactivate that role, grant/revoke Admin access, and add a Teacher/Student
role to an Admin-only account. Removing Admin from an Admin-only account keeps
the account and history, returning it to Guest status. The separate Remove
account action remains the permanent deletion option. The current Admin and last
approved Admin are protected from Admin access removal.

## Existing project: dashboard upgrade

If signup and booking already work, **do not rerun the original migration**.

1. Open your existing Supabase project → **SQL Editor** → **New query**.
2. Open [`202610210001_dashboard_calendar.sql`](./migrations/202610210001_dashboard_calendar.sql)
   in VS Code. Copy the entire file into the SQL Editor.
3. Click **Run** once. This adds columns and restricted functions; it does not
   delete accounts, lessons, or bookings. Existing classes receive the title
   “English conversation” and existing members receive unique ABVN IDs.
4. Refresh your dashboard. No OAuth or environment changes are required.
   If Supabase reports that a function is missing immediately afterward, allow
   its API schema cache to refresh, then reload.

Until this migration is applied, the calendar shows an explicit upgrade notice,
not an empty or simulated schedule. Never paste Google secrets into the SQL Editor.

### Schedule preferences upgrade (21 October 2026)

After the original platform and first dashboard migration have been applied:

1. Open Supabase → SQL Editor → New query.
2. Copy all of
   [`202610210002_schedule_preferences.sql`](./migrations/202610210002_schedule_preferences.sql)
   into it and **Run once**. Do not rerun earlier migrations on an existing project.
3. Refresh the dashboard. This keeps accounts, bookings and old profile links.

The update adds sequential numeric IDs (separate Teacher/Student counters,
each starting at 1). Existing role members are numbered by account creation
order because old approval timestamps were not recorded; new members receive
their number on first approval. Restoring/reapproving a member retains it.
Numbers are not editable or recycled. Private auth UUIDs are not member IDs.

Participant photos remain in the private bucket. Approved members may read
approved teachers' current avatars, connected teachers may read their own lesson
students' avatars, and admins may read member avatars. Migration 007 below adds
member-only access to current participant photos on shared calendar classes,
including student-to-student viewing; student profiles stay private.
The server signs only authorized calendar paths for
one hour; missing photos use initials, and image-load failures are displayed.
An already issued signed URL remains valid until its expiry.
If signing a photo fails, the schedule remains usable and shows an explicit
warning rather than hiding the failure or presenting a broken image as success.

The calendar now offers Month, a week-wide current-time line, UTC offsets,
four filtered/range-scoped summaries, and participant-oriented class labels and
detail dialogs. Month includes full surrounding weeks, but summaries count only
classes starting in the selected month. Total classes count unique slots;
Total hours sum scheduled durations including cancelled classes, not attended
learning hours. All block labels follow `Teacher - Student (numeric ID)`, or
`Teacher - Available`; full times/status/IDs remain accessible in details.

### Member management upgrade (21 October 2026)

After applying all three earlier migrations:

1. Open Supabase -> SQL Editor -> New query.
2. Copy the entire
   [`202610210003_member_management.sql`](./migrations/202610210003_member_management.sql)
   into the editor and **Run once**. Do not rerun old migrations.
3. Refresh Teacher management / Student management.

Existing accounts default to Active participation; their membership decisions,
IDs, photos, bookings, and profile links are preserved. Only approved admins can
save member profiles or change participation. Email, roles, IDs and photos cannot
be changed through this editor.

Use **Edit** in a table row to save profile fields and teaching/study status.
The separate membership form still approves, rejects, restores, or suspends the
entire account. Approving membership does not reset a study restriction.

- Teachers: Active, Inactive, Guest. Inactive hides the teacher only from the
  public directory; teaching access continues. Successfully publishing their next
  lesson restores Active automatically; signing in alone does not. Guests remain
  in the public Guest tab and do not automatically change status when publishing.
- Students: Active, Inactive, Banned, Suspended. Non-active students retain
  profile/settings and read-only past history, without Schedule, availability,
  booking, classroom links, cancellation or feedback editing. Database RPCs also
  enforce this, including legacy lesson endpoints. Admin restores Active manually;
  there is no automatic expiry or disciplinary automation.
- Existing bookings are not cancelled when a status changes. Admins must contact
  affected participants and resolve upcoming lessons using Academic.
- Full **account suspension** still blocks dashboard access, unlike study status.
- The live public directory excludes unapproved/inactive teachers and sorts
  completed lessons descending, then name. It no longer lists sample teachers
  when Supabase is configured. Missing migrations/load errors show a notice,
  not a success-shaped fallback.

### Calendar details and attendance upgrade (21 October 2026)

After applying the four earlier migrations, open Supabase -> SQL Editor -> New
query, paste all of
[`202610210004_calendar_details.sql`](./migrations/202610210004_calendar_details.sql),
and **Run once**, then refresh. Do not rerun older migrations. Existing attendance,
accounts, photos and lessons are preserved.

- Schedule/Academic hide the visible workspace heading and bottom notes; the
  timetable fills the remaining desktop viewport. Zone/UTC offset sits beside
  the summary metrics. The latest layout restores the compact legend at the
  bottom and uses smaller filter controls, with no bottom help notes.
- Status fills/borders have stronger contrast. The date selector uses a centered
  SVG chevron instead of the misaligned text glyph.
- Lesson details show Teacher time and booked Student time beneath their respective
  names/photos in two desktop columns (stacked on mobile), using
  each profile's current IANA zone and the lesson's actual UTC offsets. These
  zones are authorized through the same participant-scoped calendar RPC.
- After a lesson ends, teachers select **Yes**, **No**, **No but Apologize**, or
  **Cancelled**, with a shared note. Apology is an excused absence (pink); no
  automatic ban/restriction is created.
- Cancelled records teacher non-attendance or an off-platform cancellation.
  Both booking and slot become cancelled atomically with the teacher note.
  History is retained, the slot is not reopened, and the booking does not count
  as an attended/completed class or consume student weekly allowance. There is
  no enforced weekly quota/balance yet, so no balance-credit claim is displayed.
  Future quota rules must exclude cancelled bookings.

### Written feedback upgrade (21 October 2026)

After all five earlier migrations, open Supabase -> SQL Editor -> New query,
paste the complete
[`202610210005_written_feedback.sql`](./migrations/202610210005_written_feedback.sql)
and **Run once**, then refresh. Do not rerun earlier migrations.

Student feedback now requires only written text; rating controls and score
displays are removed. Completed status requires present attendance and both
participants' written feedback, not a score. Historical ratings are preserved
in storage during migration but are no longer shown/used; editing a feedback
record clears its old score. The new RPC and legacy RPC enforce written-only
submissions while retaining membership, participation, time and ownership checks.
Missing migration errors explicitly say the feedback was not saved.

The same refinement restores the always-visible bottom legend, uses 80px
hour rows instead of 112px, and compacts filters without shrinking touch targets
below 44px. The popup uses participant-aligned time cards, no duplicate local
time section, and a sticky title/status/Close header.

### Shared calendar and unbooked cancellation upgrade (21 October 2026)

After applying migrations 001 through 005, run
[`202610210006_shared_calendar.sql`](./migrations/202610210006_shared_calendar.sql)
once in Supabase SQL Editor. It adds a calendar-only RPC and updates cancellation
handling. Do not rerun earlier migrations.

Approved teachers and active students can see all class entries. Other booked
classes show participant names/IDs, title, and time, but not status, attendance,
feedback, student profile links, photos, descriptions, or classroom links.
Available slots remain available/bookable to students. History and feedback
views retain their participant-only data. A never-booked slot cancelled by its
teacher/admin is deleted from the system; any class with booking history retains
its cancellation record. The migration also removes old cancelled slots that
never had a booking. Accounts and booked lessons are preserved.

### Shared class details upgrade (21 October 2026)

After migration 006, run
[`202610210007_shared_class_details.sql`](./migrations/202610210007_shared_class_details.sql)
once in Supabase SQL Editor, then refresh the calendar. This supersedes the
earlier shared-detail restrictions without changing accounts, lessons or feedback.

Teachers and active students can see names/IDs, title, description, duration,
participant-local lesson times and current profile pictures for all visible
calendar classes. Available/Booked status is shared for upcoming or ongoing
classes; at the exact lesson end, other classes use neutral styling and their
status is hidden. Other participants' attendance, feedback, ratings, student
profile links and classroom links remain private at all times. Own lessons and
admin views keep their full authorized details.

Photo access is enabled through private Storage policies only for eligible
members and current photos associated with visible calendar classes. It does not
make student images public, grant access to old uploads, or open student profiles.
Expiring signed photo URLs remain in use. History and Feedback stay scoped to the
viewer; deleting never-booked cancelled slots continues unchanged.

### Web content upgrade (21 October 2026)

After migrations 001–007, open **Supabase -> SQL Editor -> New query**, paste
[`202610210008_web_content.sql`](./migrations/202610210008_web_content.sql), and
**Run once**. Do not rerun older migrations. This imports the current Landing,
About, and sample news content, creates private draft/publishing tables and a
private `web-content` image bucket, and preserves all members and lesson data.
Deploy the matching app changes together with this migration: configured public
pages now require published CMS content and report missing setup explicitly.

1. Sign in as an approved admin and open **Web content**.
2. Expand **Web content** in the sidebar and select **Landing page**, **About
   page**, **News**, or **Media**. Page editors show a compact Content/Edit value
   table. Choose a content group or search major fields. Edit the text directly;
   choose images from the library beside their thumbnails. Small labels,
   navigation links and layout details are intentionally omitted and retain
   their saved values.
3. Select **Show preview** when needed; it is hidden by default to leave more
   editing space. The private preview updates as you type. Switch **Desktop/Mobile** to check
   real 1024px/390px layouts. Preview links do not navigate; interactive page
   controls still work. Incomplete input shows a validation warning.
4. Select **Save draft** to persist work without changing the public site.
   Select **Publish changes -> Confirm publish** to make this collection live.
   A stale version is rejected if another admin saved first; retain your edits
   separately before reloading to reconcile them.
5. Under **News**, click an article in the title/date/visibility table or add a
   new article. Set visibility to Published before
   publishing the collection. Archived articles remain private, even
   when other articles in the collection are published. Removing an article
   changes the draft first, then removes its public URL on publication.
6. Under **Media**, upload JPEG/PNG/WebP up to 2 MB, then select the uploaded
   image in an editor's library picker. Images are private until referenced by
   published page content or a Published news article. Recruitment/member
   images use separate buckets and permissions. Unused uploads can be removed;
   referenced images are protected for publication audit integrity. Previously
   issued signed media URLs can remain readable for up to 60 seconds.
7. Versions/restore controls are no longer shown. Existing internal publication
   audit records and concurrent-save protection are retained.

The media table shows the 100 newest uploads plus built-in images. News allows
up to 100 articles; the news editor upgrade below adds safe visual formatting
to existing plain-text paragraphs, never executable HTML. Page layouts and existing card counts are
preserved, including previously saved section ordering/visibility. The simplified
editor exposes 23 major Landing fields and 60 About fields, not every small
label. Adding new layout types or changing the global header/footer remains
a development task. Existing news is sample content: replace it before launch.

**Acceptance checks:** saving a draft leaves public content unchanged; publishing
updates both listing and article URL/metadata; archived articles and their
unpublished media cannot be fetched anonymously; teachers/students cannot access
the editor/write RPC; concurrent editor
saves cannot silently overwrite each other.

### News editor upgrade (22 October 2026)

After migration 008, open **Supabase -> SQL Editor -> New query**, copy all of
[`202610220009_news_editor.sql`](./migrations/202610220009_news_editor.sql),
and **Run once**, then refresh the admin page. No environment changes are needed.
This upgrade preserves article text and converts the retired Draft visibility to
Archived (hidden). It increments the news collection version so editors opened
before the migration cannot overwrite newer data; save any unsaved work separately
before refreshing.

- The news table starts newest first. Click **Date** to reverse the sort without
  changing the selected article.
- **Category** offers Announcements, Community, Events, Impact, Milestones,
  Partnerships and Volunteering. Existing custom categories remain available.
- Visibility is **Published** or **Archived**. New articles start Archived.
  **Save draft** still saves privately; **Publish changes** updates the website.
- Select **Choose image** beside the article fields to browse the thumbnail
  library or upload a local JPEG/PNG/WebP (up to 2 MB) in the same dialog. Uploads
  are selected immediately and stored in Media.
- Use the article toolbar for bold, italic, strikethrough, headings,
  bulleted/numbered lists, quotes and undo/redo. The same formatting appears in
  private preview and the public article. Existing paragraphs are preserved.
- Publisher is assigned by the database from the admin who publishes a new or
  changed article. Unchanged articles retain their publisher; names cannot be
  supplied by the editor. Old attribution is recovered from real publication
  records where possible; sample content without a known publisher is not
  assigned a fictional writer.
- Result notices disappear after five seconds. Publish/delete confirmations and
  unsaved-navigation warnings still require a decision.

### Standard editor and save reliability fix (22 October 2026)

After migration 009, open **Supabase -> SQL Editor -> New query**, copy and run
[`202610220010_article_editor_fix.sql`](./migrations/202610220010_article_editor_fix.sql).
It replaces only the structured-format validator, adds underline support, and
does **not** change article content or increment saved versions. Do not rerun
migration 009 to fix a format error.

The article form now uses Quill's standard Snow toolbar: a paragraph/heading
menu, bold/italic/underline/strikethrough, numbered and bullet lists, indentation,
quotes, clear formatting and undo/redo. It remains free and self-hosted, without
an editor API key or third-party content service.

Save draft persists formatting privately, and reopening the article preserves it.
The editor keeps its saved version synchronized when there are no local edits.
If an old tab has a stale version, the app preserves non-conflicting changes
and retries once against the latest version instead of immediately failing.
If both drafts changed the same article, a persistent warning keeps local edits
intact. Choose **Download my edits** for a JSON backup, **Use latest saved draft**
to deliberately replace the local copy, or **Keep editing my version**. A backup
is a recovery record, not an automatic import/overwrite feature.

### Article media and table refinement (22 October 2026)

After migrations 009 and 010, run
[`202610220011_article_media.sql`](./migrations/202610220011_article_media.sql)
once in Supabase SQL Editor. It extends safe article validation and published
inline-image permissions without changing saved content or version numbers.
Do not rerun 009. No new environment variables, paid editor or API keys are needed.

- News lists category alongside title/date/publisher/visibility. Search by title
  or publisher name; combine category, exact day and visibility filters. Clear
  filters restores the list. Date sorting remains newest first by default.
- All dashboard tables share pagination with 10 rows initially and 10/25/50/100
  choices, row ranges, page totals and Previous/Next. Filters/sort reset to page
  one. Page-field edits remain in memory when changing table pages.
- **Choose image** opens one thumbnail library with local upload and search.
  The same dialog powers page images, article covers and **Insert image** in
  article text. Uploads are selected immediately and stored in Media. Article
  image descriptions default to the title; there is no separate alt-text box.
- Place the cursor in the article and choose **Insert image** or **Insert YouTube
  video**. Paste an HTTPS watch/share/Shorts/live/embed URL; the app creates a
  privacy-enhanced, click-to-play player. Other video hosts, arbitrary iframe
  HTML and remote image URLs are rejected.
- Preview and published articles render the same images/player. Inline uploads
  remain private until used in a Published article. Archived/draft images stay
  private; existing signed URLs can last up to 60 seconds.
- Published versions/restore controls and revision fetching have been removed.
  Internal optimistic locking, genuine-conflict recovery and existing publication
  audit records remain to prevent data loss; this upgrade deletes no history.
- Primary actions use icons alongside readable text. Table actions are icon-only
  with hover titles, accessible names and 44px targets.

**Acceptance checks:** combine each filter and verify an empty result; change
row size and pages without losing edits; insert image/video -> save private
draft -> reload -> media retained -> save again. Publish only intended content.
Verify anonymous readers can load inline images only after publication, and
cannot access them in draft/archived articles.

### Article toolbar, styles and date ranges (22 October 2026)

After migration 011, run
[`202610220012_article_styles.sql`](./migrations/202610220012_article_styles.sql)
once. This extends the structured validator for text alignment, safe hex colors
and percentage image widths, without changing content or document versions.
Apply earlier migrations only if not already installed; never rerun 009.

- **Add article** is in the sticky top toolbar with preview/save/publish.
  The News table contains no inline editing form. Click a title to open its
  editor page, with **Back to all articles** and **Remove article** instead of Add.
  The URL supports refresh, deep links and browser Back/Forward. Returning to
  the table preserves filters/pagination and unsaved draft edits.
  **Show preview** shows the public news listing from the table, or the selected
  article from its editor. Archived articles are omitted from the listing preview.
- **Filter day** is a single box. Choose **One day** or **Date range**, enter
  the day or From/To dates. Valid selections filter immediately without Apply.
  Ranges include both endpoints; a To date before From shows a validation error
  without changing the last valid filter. Close dismisses the date picker.
- Undo/Redo, Insert image and YouTube share the standard formatting toolbar.
  Alignment offers left (default), center, right and justify; text color uses
  Quill's palette. All values persist to preview and published articles.
- **Insert image** is an icon-only toolbar button with an accessible label.
  Click an image inside article text and drag a corner handle (10–100%).
  Arrow keys on a handle adjust width by 5%; Home/End choose the limits.
  Resizing supports undo/redo, preserves aspect ratio and fits narrow screens.
- YouTube uses a visible **Play YouTube video** panel rather than a blank lazy
  iframe. Clicking Play loads a responsive, privacy-enhanced player with explicit
  dimensions, origin/referrer, inline playback and fullscreen permission. There
  is no automatic playback before clicking. Loading failures/player errors
  produce an explanation and a **Watch on YouTube** link that works in preview.
- Some videos disable embedding or have account/region restrictions; browsers
  and networks may also block YouTube. Do not treat the presence of an iframe
  alone as proof of playback: verify playback in a regular browser with YouTube
  access, plus blocked-player messaging in restricted environments.
- The VS Code integrated browser canceled YouTube frame navigation during
  verification. The same actual public article's Play button worked in regular
  Chrome: the player reported Playing and progressed beyond 14 seconds, with
  no loading/error message. Integrated Electron browsers receive a note to open
  the page in Chrome, Edge or Safari. No content publication is needed to fix
  an integrated browser's navigation restrictions.
  These interface changes require no additional migration beyond 012.

**Acceptance:** test single-day/range filtering and reversed-range rejection;
format colors/alignment and resize an image -> save -> reload -> repeat save;
check preview/public rendering on desktop and 390px screens. Schema validation
must reject arbitrary CSS, unsafe iframe hosts and widths outside 10–100%.

### Compact fixed workspace and admin profile (22 October 2026)

After migration 015, apply
[`202610220016_admin_profile_preferences.sql`](./migrations/202610220016_admin_profile_preferences.sql)
once in Supabase SQL Editor. This adds private per-admin interview meeting
defaults and full-directory statistics sorting. It changes no existing profile,
lesson, booking, interview slot or published content. Do not rerun older migrations.

- Dashboard filters run automatically: loaded collections filter immediately; server search debounces 150ms, option
  changes run immediately, and Clear is an icon with a tooltip/accessibility
  label. There is no Apply or separate Sort control. Click column headers to
  toggle sorting; filters and row size persist and sorting resets to page 1.
  Directories, accounts/guests and recruitment lists now sort/filter the whole
  authorized loaded collection locally before slicing pages, like News. Initial
  loads fetch in batches rather than silently truncating at Supabase's row limit.
  Subsequent filter/sort/page interactions make no server requests. Statistics
  still use all lesson history, loaded in authorized 100-teacher batches.
- The outer dashboard is fixed to the viewport, including mobile. Tables have
  independent vertical scrolling, sticky headers and visible footers. Columns
  fit the panel and wrap long text; mobile records use labeled two-column layouts.
  Profile/editor panels and calendar contents scroll within their allotted space.
  Introductory notes are removed; validation/errors and confirmations remain.
- Table actions use icon buttons/links with hover names and accessible labels.
- Admin **My profile** shows only personal details, read-only account email,
  picture and optional interview meeting link. Hidden biography/teaching fields
  are preserved. Saving is atomic through `save_admin_profile`; invalid meeting
  links do not partially update the profile. Email remains managed by Auth.
  Preferences are readable only by their approved admin owner, not other admins,
  teachers, students or anonymous users. New interview-slot offers prefill this
  link, which can be overridden for a slot. Existing slots never change.
- Without 016, admin profile saving explicitly reports the required upgrade.
  Interview offers can still use a manually entered meeting link. Local statistics
  sorting needs 015, not the legacy server-ordering RPC from 016.

### Recruitment calendar and complete question list (22 October 2026)

Apply [`202610220017_recruitment_form_fields.sql`](./migrations/202610220017_recruitment_form_fields.sql)
once after the earlier migrations. Do not reapply old migrations.

- The question view is table-only, with Add and popup Edit, Hide/Unhide and
  confirmed Delete actions. It includes the 11 existing personal/application
  fields per role alongside supplemental questions, including photo and video.
- Essential identity fields, student birth date, and teacher photo/CV are
  protected from hiding/deletion or becoming optional in both UI and database.
  Optional fields support visibility/deletion; their labels, help, order and
  required state drive the applicant form. Hidden fields cannot be supplied
  through a forged submission; newly required fields are enforced in the database.
- Existing submissions retain snapshots when custom questions change or are
  deleted. Acceptance still syncs identity/bio/photo atomically, and now links
  phone, birth date, weekly hours, video and answers to private profile details.
  The migration backfills these details for already accepted applications.
  Only the member and admins can read them; they appear under the member's
  **My profile > Accepted application details**, never in public contact data.
- Missing 017 produces an explicit warning. Standard applicant fields and custom
  question editing remain available; personal-field management is disabled.
- Interview slots now use the shared Academic calendar grid/month components:
  day/week/month/agenda, date navigation, timezone, status colors/legend, local
  filtering and internal scrolling. Admins create availability in a popup or by
  clicking a future grid time/day, and open slots for details/cancellation.
  Invited applicants choose a slot in the same calendar and confirm booking in
  its popup. Existing database overlap, eligibility and exclusive-booking rules
  remain in force. Interview availability remains shared across recruitment roles.

**Acceptance:** verify one active sort arrow, zero RSC requests during local
table interactions, filtering before pagination, 390px/desktop fit, popup-only
question editing, protected core fields, optional hide/unhide/delete, unchanged
submitted snapshots, applicant booking eligibility and private profile syncing.

**Acceptance:** type/search without Enter, choose status, clear, sort both
directions and paginate; verify row size, focus and query retention. Check 390px
and desktop fixed heights and internal scrolling, icon hover/keyboard names,
admin profile save/reload, private meeting-link permissions, atomic invalid-link
rollback, and interview-slot prefill. Never publish content as part of testing.

### Interview slot details and shared duration controls (22 October 2026)

Apply [`202610220018_interview_slot_details.sql`](./migrations/202610220018_interview_slot_details.sql)
once after the earlier migrations, including 017. Apply manually in Supabase SQL
Editor; do not rerun older migrations. Without 018, interview creation is disabled
with an explicit upgrade warning rather than silently discarding new fields.

- Add interview availability contains title, optional description, eligible
  interviewee selection, local start/zone, duration and meeting link. Teacher and
  student recruitment default titles differ; the title remains editable. Availability
  remains shared across recruitment roles. Selecting an applicant reserves/bookings
  atomically; only invited, non-suspended applicants without an assigned role or
  another booked interview are eligible. Overlaps and stale choices roll back.
- New slots record the creating admin. Details reuse the lesson participant cards,
  with admin/interviewee photos and local times, sticky title/status/Close,
  duration, description, application link, join and confirmed cancellation.
  Legacy slots have no invented creator/timezone. Missing creator information
  is shown honestly; existing appointments are not reassigned by migration.
- Assessments are append-only notes in `interview_assessments`, independent of
  final decision feedback. Approved admins can read/add; applicants, teachers,
  other guests and anonymous users cannot read or write them. Notes are linked
  to both slot and applicant and survive cancellation.
- Never-booked slots are deleted on cancellation. A persistent booking flag
  prevents deletion after applicant cancellation/reopening. Slots with previous
  bookings remain cancelled and preserve their last applicant. Legacy slots are
  conservatively marked as previously booked because their original booking
  history cannot reliably be reconstructed, including reopened available slots.
  Migration 020 later removes already-cancelled legacy slots only when they have
  no current/prior applicant link or assessment history.
- Interview filters start collapsed, toggled beside Add interview slot. Search
  the authorized loaded collection by admin/interviewee name/email, title or
  description; status selection and Clear remain local.
- Shared lesson/interview grid add targets span 30 minutes, with starts at :00
  and :30. Shared duration controls offer 30, 45, 60 and Other (numeric 30-120,
  whole minutes). The existing two-hour maximum remains unchanged. Migration
  triggers enforce bounds on new slot inserts/time changes, including legacy
  creation RPCs, without modifying existing appointment times.

**Acceptance:** test both title defaults, optional descriptions, invited/stale/
suspended applicant assignment, atomic overlap failure, private assessment
visibility and retention, never-booked removal vs previously-booked cancellation,
collapsed filters, name/email matching, half-hour creation targets and custom
duration bounds. Use local integration fixtures, not real applicant bookings.

### Slot editing and in-app schedule notifications (23 October 2026)

After applying 018, apply
[`202610230019_slot_edit_notifications.sql`](./migrations/202610230019_slot_edit_notifications.sql)
once in Supabase SQL Editor. It adds authorized editing for future lesson and
interview slots and private, persistent participant notifications. Do not rerun
the migration or apply it before the earlier calendar and recruitment migrations.

- Teachers can edit their own future available or booked lessons, and admins
  can edit any future lesson or interview slot. Titles, descriptions, time,
  duration, and meeting links are editable without changing the booked
  participant/application assignment.
- Saving a changed start time or duration on a booked slot prompts the editor
  to contact the participant first. On save, the affected student/applicant
  receives an in-app notification with the old and new local times. Description,
  title, and meeting-link-only changes do not create schedule notifications.
- Lesson slot and booking timestamps update atomically. Database constraints
  continue to enforce duration, overlaps, valid meeting links, ownership, and
  role authorization. Notifications are visible only to their recipient and
  can be marked read. They appear in Dashboard > Notifications and on the
  applicant page. Email delivery is not configured.
- Cancelling a newly created interview slot that has never been booked deletes
  its row entirely; the calendar and history read directly from that table.
  Previously booked or legacy slots retain cancellation history.

**Acceptance:** test booked and available edits, title/description-only updates,
timestamp synchronization, schedule-notification contents and cross-account
privacy, mark-as-read authorization, and deletion of never-booked cancelled
interviews. Run `node --experimental-strip-types --test tests/recruitment-database.test.mjs`.

### Legacy cancelled interview cleanup (23 October 2026)

After migration 019, apply
[`202610230020_remove_legacy_unbooked_interviews.sql`](./migrations/202610230020_remove_legacy_unbooked_interviews.sql)
once. It permanently deletes existing cancelled interview rows with no current
or prior applicant link and no assessment history. This handles old unbooked
cancellations that migration 018 conservatively retained. Cancelled interviews
with applicant or assessment history remain available for audit. Future
cancellations of unassigned slots with no assessment history are deleted too.

### Calendar and workflow behaviour

- Schedule / Academic show the selected day, month, or Monday–Sunday week. Agenda is a
  list of the same week. On narrow screens the week/day view also becomes an
  agenda; use the desktop grid for click-to-create, or the Create button anywhere.
  Clock-change days have 23 or 25 elapsed hours, with time-zone abbreviations in
  lesson details to distinguish repeated local times. Ambiguous creation times
  remain rejected; choose a different time.
- The schedule uses a compact date toolbar: Today, previous/next arrows, a date
  picker, and Day / Week / Month / Agenda links. Filters expand only when needed.
  The timetable opens near the earliest lesson (08:00 for an empty week),
  highlights today, and marks the current time. Select a lesson for full member
  IDs, classroom links, and actions; short lesson cards show a compact summary.
  Booked lessons are lavender, available lessons green, and follow-up yellow.
- Calendar queries are bounded by date, not the old 200-available-slot limit.
  Teachers and students see every class; the shared calendar RPC returns full
  status/feedback and classroom details only for the viewer's own classes.
  With migration 007, other classes also show descriptions, pictures and
  participant-local times. Only upcoming/ongoing Available/Booked status is
  shared; past-class status and all other participants' attendance/feedback
  remain private.
- Feedback and History are explicitly **monthly**. Change month
  to find older outstanding feedback or lessons. Metrics describe that month,
  not lifetime totals; a lesson belongs to the month in which it starts in your
  time zone. Notifications combines participant-only schedule-change messages
  with upcoming-booking and follow-up task lists. Email is not configured.
- “Completed” means attendance is present and both sides supplied feedback.
  Yellow means follow-up is needed; booked lessons are lavender. An attendance issue does **not** impose a ban.
  Explicit Cancelled attendance records a teacher-side cancellation; other
  cancellation actors are not inferred. Apologies have a separate pink status.
- A teacher's Student list includes only people with a non-cancelled booking
  with that teacher. A project-wide student directory is deliberately not enabled.
- The sidebar preference is local to the account and browser. Browser-storage
  failures are displayed. Email preference switches are not shown because email
  delivery is not configured.
- Web content now supports draft editing, private preview, media and publishing.
  Recruitment is available after migrations 013 and 014. Recurrence,
  configurable policies, apology/
  appeal workflows and advanced academic analytics remain later phases.

## 1. Create and configure Supabase

1. Create a Supabase project with a region appropriate for ABVN.
2. In the SQL editor, run
   [`migrations/202610200001_learning_platform.sql`](./migrations/202610200001_learning_platform.sql)
   once, or apply it using the Supabase CLI migrations workflow. It creates the
   application tables, restricted RPCs, RLS policies, and private `avatars` bucket.
   Supabase's managed `auth` and `storage` schemas must already exist.
   Then run
   [`migrations/202610210001_dashboard_calendar.sql`](./migrations/202610210001_dashboard_calendar.sql)
   once to install the dashboard calendar and member-profile functions.
   Finally run
   [`migrations/202610210002_schedule_preferences.sql`](./migrations/202610210002_schedule_preferences.sql)
   once for sequential member IDs and private participant-photo access.
   Then run
   [`migrations/202610210003_member_management.sql`](./migrations/202610210003_member_management.sql)
   once for admin profile editing, participation statuses, and the live public
   teacher directory.
   Then run
   [`migrations/202610210004_calendar_details.sql`](./migrations/202610210004_calendar_details.sql)
   once for participant time zones and the four attendance outcomes.
   Finally run
   [`migrations/202610210005_written_feedback.sql`](./migrations/202610210005_written_feedback.sql)
   once for written-only feedback.
   Then run
   [`migrations/202610210006_shared_calendar.sql`](./migrations/202610210006_shared_calendar.sql)
   once for shared calendar access and never-booked slot deletion, followed by
   [`migrations/202610210007_shared_class_details.sql`](./migrations/202610210007_shared_class_details.sql)
   for shared descriptions, pictures, participant-local times and private past outcomes.
   Then run
   [`migrations/202610210008_web_content.sql`](./migrations/202610210008_web_content.sql)
   followed by [`migrations/202610220009_news_editor.sql`](./migrations/202610220009_news_editor.sql),
   then [`migrations/202610220010_article_editor_fix.sql`](./migrations/202610220010_article_editor_fix.sql),
   each once, for the admin content editor, private media, live previews,
   publishing and formatted news articles.
3. Copy the **project URL** and **publishable key** from Supabase's project
   settings. Do not use a `service_role` or secret key in this app.
4. Copy [`.env.example`](../.env.example) to `.env.local` and fill in:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   The publishable key is intentionally public. RLS and RPC authorization protect
   data. Never commit private credentials or Google client secrets.

5. In Supabase Auth URL Configuration, set the site URL and allow exactly:
   - `http://localhost:3000/auth/callback` for local development.
   - `https://YOUR_DOMAIN/auth/callback` for deployment.
6. Leave anonymous sign-in disabled. Enable Google as the intended sign-in provider.
   Other providers are not exposed by this app.

Without configuration, login/dashboard pages display a setup notice instead of
pretending authentication or bookings are working.

## 2. Configure Google OAuth

1. Create a Google Cloud OAuth web application and configure its consent screen.
2. Add the **Supabase Auth callback URL** from the Google provider settings
   (normally `https://YOUR_PROJECT.supabase.co/auth/v1/callback`) as an authorized
   redirect URI in Google Cloud. This is different from the app's `/auth/callback`.
3. Enter the Google client ID and secret in **Supabase Auth → Providers → Google**.
   The Google secret stays in Supabase, not in frontend environment variables.
4. If the consent screen is in testing mode, add the accounts you will use as
   test users. Follow Google's publishing requirements before opening access.

## 3. Bootstrap the first administrator

1. Start the app with `npm run dev` and sign in through `/login` with the intended
   administrator's Google account. This creates a pending, role-less profile.
2. In Supabase's SQL editor, find the exact UUID under Auth → Users. Verify the
   account/email belongs to the administrator.
3. Run this **only in the trusted SQL editor**, replacing the UUID:

   ```sql
   update public.profiles
   set role = 'admin', admin_access = true, status = 'approved', requested_role = null
   where id = 'THE_VERIFIED_ADMIN_AUTH_USER_UUID';
   ```

4. Refresh `/dashboard`. It redirects to `/dashboard/admin`.
5. Teacher/student users sign in, request membership, and wait for review.
   Confirm programme eligibility outside the app, then approve in the admin
   dashboard. Approval is an explicit trust decision.

Additional administrators must also be provisioned by a trusted operator. The
review UI intentionally cannot modify administrator accounts.

## 4. Run and verify

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

Use Node.js 24+ for the test runner's direct TypeScript support. Tests execute the
actual application migration in embedded PostgreSQL (PGlite with `btree_gist`).
Only the Supabase-owned Auth/Storage primitives are stubbed. Database tests cover
approval, unauthorized access, booking conflicts, cancellation, feedback, profile
ownership, suspension, RLS, and RPC grants. Time-zone tests cover UTC conversion
and daylight-saving gaps/repeated hours.

### Live acceptance checklist

Live OAuth, Supabase Storage uploads, and separate concurrent client requests need
the configured project; embedded tests do not prove those external integrations.

1. Sign in as an admin, teacher, and two students using separate browser profiles.
2. Confirm new accounts cannot access any role dashboard before approval, and that
   changing the URL to another role never exposes that role's data.
3. Approve the teacher/student requests. Set the teacher's actual time zone in
   their profile. Upload a profile picture and verify it reloads after sign-in.
4. Publish two future times and verify Vietnam/local time confirmation. Try an
   overlapping time and a bad classroom link; both must fail.
5. Have both students try to book the same slot at once. Exactly one must succeed.
   The successful student and teacher must both see the booking/classroom link.
6. Verify a student cannot book another teacher during the same time range.
7. Cancel a booking more than 12 hours ahead. It must disappear from active
   bookings and reappear as available. A different student can then book it.
8. Create a slot less than 12 hours away; student cancellation must fail.
   An administrator can cancel it to resolve an urgent change.
9. After a lesson ends, mark attendance present and submit teacher notes; submit
   student feedback. Confirm both dashboards update and learning hours increase.
   Absence must not increase completed hours.
10. Suspend a teacher/student, refresh their dashboard, and verify access is
    blocked. Suspension does not automatically cancel existing bookings; an admin
    must resolve them in the lesson audit and contact participants separately.

## Deployment and operations

- Set the three environment variables in the hosting platform and rebuild.
  `NEXT_PUBLIC_SITE_URL` must be the canonical HTTPS origin. Match the Supabase
  redirect allowlist. Do not cache authenticated dashboard or callback responses
  in a CDN. The session proxy explicitly marks them private/no-store.
- [`src/proxy.ts`](../src/proxy.ts) refreshes the Supabase session before protected
  and application requests. Server pages/actions re-verify identity and read
  role/status from the database. RLS and transactional RPCs are the authorization
  boundary.
- The dashboard uses Next.js runtime/Suspense boundaries; do not put authenticated
  profile/lesson queries inside `"use cache"`.
- Keep Supabase database backups and access monitoring enabled. Review application
  log errors rather than exposing database internals to users.
- Classroom links must be real meetings configured with appropriate access controls
  and waiting rooms in the provider. ABVN stores links; it does not host calls.
- Add programme policies/privacy notices and your operational review process
  before handling real student information. Recruitment documents and interview
  notes are private; recruitment emails and reminder automation remain deferred.

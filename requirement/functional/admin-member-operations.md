# Administrator member operations

> **Document ID:** ABVN-FR-006
> **Status:** Maintained specification
> **Source:** Dashboard specification, sections 6.2–6.3 and administrator overview
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

## 6. Administrator dashboard

### 6.2 Teacher management

Current subtabs: Directory, Recruitment. Recruitment contains Applications,
Form questions and Interview slots. Profile review and Statistics remain planned.

- Search/filter teachers by ID, name, country/time zone, approval, participation
  status, lesson counts, and date range.
- Participation categories: active, inactive, guest. Keep these separate from
  approval/security states such as pending, rejected, or suspended.
- Edit permitted profile fields, manage participation/publishability, review
  applications, and inspect teaching/feedback/cancellation statistics.
- Applications originate from Become a Teacher on the public website and capture
  relevant identity/contact, biography, country, time zone, experience,
  preferences, availability, and private resume/certification files.
- Applicant signs in before submission; application ownership is bound to the
  verified user, not matched by an arbitrary entered email.
- Approval atomically grants teacher membership and copies approved application
  fields into the profile; retain the reviewed application snapshot.
- Record reviewer, decision, reason, and timestamp. Prevent duplicate approval or
  silent overwrite of subsequently edited profile data.
- Show the applicant-visible decision/status, but keep review notes and interview
  feedback admin-only. Recruitment email delivery is deferred for this release.
- Confirmed 21 October 2026: inactive teachers are hidden only from the public
  volunteer teacher directory. They retain login, Schedule, existing lessons,
  and publishing access. Successfully publishing their next lesson automatically
  restores Active; login alone and failed publishing do not. Guest teachers
  remain visible in the Guest tab and keep teaching access.
- Directory refinement, 22 October: the teacher directory contains only accounts
  with teacher role and approved membership. Pending applicants remain under
  Recruitment; non-approved account recovery/access management stays in Systems.
  Remove the duplicate Directory/Recruitment navigation above this table; use
  the existing sidebar links.
- Use a compact filter toolbar: name/teacher-ID search, teaching status
  (All/Active/Inactive/Guest) and an icon-only Clear control. Search and status
  changes filter automatically; column headers provide sorting.
  Do not show a membership filter. Retain row size when filtering and reset the
  page. Wrap controls cleanly on small screens.
- Teacher directory columns: numeric ID, name/email, teaching status, country,
  completed lessons, students taught, joined date and actions. No membership or
  English-level column. Retain the News-style footer and 10/25/50/100-row choices;
  tables scroll internally on small screens.
- Completed lessons counts slots recorded as completed, consistently with the
  public teacher profile. Students taught counts distinct students marked present
  in completed bookings of completed lessons: repeat students count once;
  absent/apologized, cancelled and upcoming bookings do not count as taught.
  Aggregate in the database for only the teachers on the current page, with no
  truncated lesson-history fetch. Teachers without lessons show actual zeroes.
  Missing statistics setup or query failures must be explicit, never fake zeroes.
- Edit opens an accessible dialog for name, country, time zone, biography,
  teaching focus, hobbies, and participation status. English-level editing is
  student-only; preserve any existing teacher value without displaying it. Identity,
  email, role, member numbers, and uploaded photos are not changed by this editor.
  Membership decisions remain a separate form; full account suspension blocks
  the dashboard, unlike participation status.
- With Supabase configured, the public directory uses approved real members,
  not demo teachers; inactive/unapproved teachers are excluded. Sort by completed
  lesson count descending, then name. Unconfigured development retains the
  explicitly labelled sample directory. Load errors must be visible.

### 6.3 Student management

Current subtabs: Directory, Recruitment. Recruitment contains Applications,
Form questions and Interview slots. Programme enrollment, dedicated Restrictions
and Statistics remain planned.

- Search/filter by name/ID, level, programme/cohort, approval, active/inactive,
  banned/suspended state, restriction expiry, and policy issues.
- Separate programme participation from access restrictions and account approval.
- Confirmed 21 October 2026: study status options are Active, Inactive, Banned,
  Suspended. Any non-active study status retains login, profile/settings, and
  read-only past lesson history, but removes Schedule, availability, classroom
  access, booking, cancellation, and feedback editing. Enforce this in database
  functions as well as navigation; direct legacy calls must not bypass it.
  Restrictions set by an admin are indefinite until an admin restores Active.
  Automatic restrictions follow the attendance rules in Systems > Settings
  (default: a ban for absence without apology, a 14-day suspension for absence with
  apology, Inactive after 4 weeks without attending). A manual status change by an
  admin always replaces an automatic one and clears any timed end date.
- Student directory refinement, 24 October: the directory lists only approved
  student accounts (pending applicants stay under Recruitment). Columns: ID,
  name/email (the name opens the profile), student status (Active/Inactive/
  Suspended/Banned) with the absent figures shown as "absent with apology / absent",
  lessons attended as Total / 1w / 4w, address (city or province, falling back to
  country) with the English level (for example A2), joined and expiry dates on
  two lines in dd/mm/yyyy, and Edit/View actions. Total / 1w / 4w count completed
  bookings marked present overall, in the last 7 days and in the last 28 days.
  Search matches name, email, numeric ID or member code; filters are student status
  and joined month and year in the administrator's time zone. Every data column sorts.
- Teacher workspace Student list: list all student accounts and participation
  statuses, not only students with a prior booking. Reuse the directory columns,
  search and filters, including email, but omit the Actions column; clicking a
  name opens a limited, read-only profile. Teachers can see age, introduction video
  and CV in that profile, but not phone, date of birth, address, Facebook,
  application answers, restriction history or the all-lessons table.
- Study period: a student studies free for the configured period (default six
  months) from the date the account was
  given the student role (Joined). Admins extend the Expiry date for scholarship,
  paid or admin-approved students from the Edit page. The date is shown with
  Expires-soon (30 days) and Expired markers. Where Settings enable it (default),
  a student whose study period has ended cannot book lessons until an admin extends
  the Expiry date; history, profile and feedback remain available. The Edit page's
  extension button adds the configured paid-extension length.
- Students have no public profile. Admins can view and edit student profiles;
  approved teachers can view limited, read-only profiles for any student account.
- Edit page (compact top bar with Back, breadcrumb, Cancel, Save changes): name,
  phone, date of birth, city/province, country, detailed address, Facebook link,
  occupation, organization, English level, learning goals, hobbies, biography,
  introduction video, profile image and CV uploads, study status, a reason (required
  when suspending or banning) and study expiry. Weekly study hours are not collected.
  Email and IDs are read-only. Time zones are chosen from a searchable list shown as
  "Asia/Ho_Chi_Minh (UTC+7)" everywhere a time zone is entered.
- Profile page: header with status, study period and three figures (total attended
  lessons, total teachers studied, total absent). Two sub-views: Profile (about,
  study trend, all lessons, personal details, milestones, application details and
  suspension/ban history) and Teacher feedback. The trend switches between column and
  line and between the last 6 months (monthly), 3 months (weekly) and 1 month (daily).
  All lessons appear in a sortable, paginated table. Feedback is grouped by teacher,
  teachers ordered by their latest lesson with the student and notes newest first.
- Student application form (required unless noted): name, email, phone, date of
  birth, city/province, country, detailed address, occupation, organization, time
  zone, English level, learning goals, hobbies and interests, biography; introduction
  video, CV and photo are optional. Accepting an application copies these fields to the profile.
- Use the teacher editor's dialog pattern for teachers only.
  Approving/restoring membership does not clear a study restriction. Existing
  bookings are preserved, not automatically cancelled; show admins a reminder
  to resolve upcoming lessons with participants.
- Become a Student captures identity, date of birth, background, learning goals,
  English self-assessment, required declarations, and private supporting evidence.
- Apply the configured age/eligibility criteria on the server.
- Approval grants student membership and atomically synchronizes reviewed fields
  into the profile/enrollment, with reviewer and source-application audit records.
- Review attendance, progress, feedback, policy cases, appeals, and statistics.
- Add/remove restrictions only through recorded decisions with reasons.
- Do not expose private application evidence in teacher-visible academic profiles.
- Retention/deletion controls must preserve required audit/history safely;
  recommend deactivation rather than destructive deletion of lesson participants.

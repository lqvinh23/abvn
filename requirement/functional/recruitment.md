# Recruitment workflows

> **Document ID:** ABVN-FR-009
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 6.6
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

### 6.6 Recruitment workflow - confirmed 22 October 2026

#### Applicant experience

- `/apply` and `/student-apply` host the entire process; no old-site redirects.
- Sign in before submitting. The application is owned by the verified user and
  uses the account email; applicants cannot select another owner or email.
- Display **Application > Application review > Interview > Final review** on the
  left and the current form/status/actions on the right. Student recruitment
  adds a fifth step, **ABVN Student**, activated by an account's student role,
  including existing student accounts without a recruitment application.
  Final review means the ABVN team reviews the interview and makes the decision,
  not a decision for the applicant to make.
  On mobile the roadmap precedes the current-step panel in a compact two-column
  step layout, without the longer desktop descriptions.
- Use balanced, responsive introductory text without short orphaned final lines.
  Highlight the current campaign name, open state and application deadline,
  inclusive in Vietnam time; omit generic seasonal recruitment copy.
  In the heading note box, remind applicants to answer in English without
  AI-generated or AI-rewritten responses and upload a clear, appropriate photo
  that will be synced to their ABVN profile after acceptance. Include student
  age eligibility (16-25 at submission); do not apply this age limit to teachers.
  Use a plain bordered note box without the thick left accent. Show
  "Required questions are marked *." below the form heading without the
  additional reviewer sentence.
  Place question help text between the label and its input for both built-in
  fields and supplemental questions, with accessible descriptions.
- Round 1: application and application review. Round 2: interview and final
  review. Display booked interview times/durations in the applicant's stored
  IANA time zone, including the UTC offset.
- Teacher core fields: name, phone, country, time zone, biography/introduction,
  hours/week (1-40), required photo and CV, optional date of birth and optional
  introduction video (YouTube, Vimeo or Google Drive).
- Student core fields: contact, date of birth, country/time zone, introduction,
  hours/week, optional photo/supporting document and optional video.
  Age is 16-25 inclusive at submission, calculated in PostgreSQL using its current
  date; teachers have no age limit.
- New student applications require exactly the last eight ASCII digits of the
  National / Citizen ID number, preserving leading zeros. Never collect the full
  number. The built-in question cannot be hidden, deleted or made optional.
  Once accepted, that ID cannot be submitted or accepted under another account;
  pending or rejected applications alone do not reserve it. Enforce this in the
  database for both submission and acceptance, including administrative paths.
- Sync the accepted ID to private student profile details. Approved admins may
  add/correct it; students can view but not edit their own recorded ID. Teachers
  and public profiles never receive it. Existing applications/profiles remain
  valid without an ID; admins can backfill existing students to enable checks.
  Known IDs cannot be cleared. Retain private accepted-ID claims when an account
  is removed or the displayed ID is corrected, to prevent repeat enrolment.
  Matching last-eight digits require ABVN review when disputed; self-reported
  partial numbers are not proof of identity and can collide.
- Supplemental questions cover teacher experience/preferences/motivation,
  adaptability, availability, commitment and equipment; student motivation,
  self-assessed English, educational background, availability and readiness.
  These are editable defaults, not immutable programme policy.
- One open application per signed-in account across both roles. Submissions
  retain question-label/answer snapshots. Do not allow applicant editing after
  submission; direct corrections through ABVN.
- Rejected applications stay closed until an admin allows a new application.
  Preserve the original submission, decisions and feedback.
- Show explicit empty, loading and error states. Do not fake a successful
  submission/booking or show an empty queue when the database is unavailable.
- Show decisions in-app only. Email, automated reminders,
  applicant draft saving and automatic video-meeting creation are not enabled.

#### Student recruitment campaigns

- Student > Recruitment includes a Campaigns view; teacher recruitment is unchanged.
- Normal application seasons are November-December for January courses and
  May-June for July courses. Admins may choose custom dates.
- Campaigns have a name, form open/close dates, interview booking open/close
  dates and a required due date, all inclusive in Vietnam time. Application
  windows cannot overlap.
- The campaign table combines name and a tagged Upcoming/Ongoing/Completed status
  in one column, followed by both date windows, Due date and Edit/View/Delete actions.
  Add campaign and the report's Back to campaigns control belong in the top
  recruitment toolbar, with no extra title/note above the table.
  Ongoing runs from form opening through the due date, even after both booking
  windows close. Completed means past the due date or manually marked completed.
  Reports use the same status tag, without a Vietnam time suffix.
- The edit popup includes Mark campaign completed. This override
  immediately closes new applications and interview bookings without changing
  scheduled dates or existing records. While the due date has not passed,
  Mark campaign incomplete clears manual completion and restores date-controlled
  windows. After the due date, extend and save it before marking incomplete.
  Delete requires confirmation and is allowed only without linked applications.
- Opening/closing automatically governs student submissions and new interview
  bookings in the UI and database. An applicant's campaign determines their
  interview booking window; already-booked interviews are preserved.
- New student applications attach to the open campaign. Existing records remain
  Unassigned. Applications defaults to the latest campaign by form opening date
  and supports campaign name/status and application-stage filters.
- Reports count submitted applications, invited applicants and accepted students.
  Gender, age and area charts cover accepted students only. Age is evaluated on
  form opening day, not the report viewing date.
- Collect Male/Female/Other on new student applications. Derive area from the
  submitted province/city: North, North Central, South Central (including Central
  Highlands), or South. Unknown/missing data must be explicitly shown as Unknown.
- Campaign schedules are public; campaign edits and demographic statistics
  remain admin-only.

#### Administration and booking

- Student applications use exactly five columns: Applicant (linked name and
  email in the same regular text style as other cell values), DOB (Age) /
  Address (date and age on the first line; city/country on the second line,
  in the same text style), Submitted (UTC+7 regardless of the admin's time
  zone; omit the GMT+7 suffix), Stage and Campaign. Calculate
  age against the current Vietnam calendar date. Search matches name or email.
- Clicking the applicant name opens the private application details, including
  submitted personal information, campaign/gender, attachments and all answer
  snapshots. Back to applications preserves filters, sorting and pagination.
  On mobile, scroll filters and application cards within the list so the sticky
  table header cannot cover the applicant links in a compressed table viewport.
- In applicant details, show submitted fields and answer snapshots on the left
  and one ABVN review-note panel on the right. Each panel scrolls independently;
  keep the review panel fixed on the right while reading the application.
  On narrow screens stack two separately scrollable panels.
  Use one editable note/decision per application round and interview round,
  selected in the review panel. Do not show a separate assessment editor or
  ABVN review history.
- Applicant details omit the Applications/Campaigns/Form questions/Interview
  slots navigation. Put Back to applications at the left of the top bar and
  Save application review on the right, with icons on all action controls.
- Saving a student Pass/Fail decision or note does not change the application
  stage, membership, applicant-visible status or campaign statistics. Keep
  reviews private to approved admins, reload the saved note/decision, and
  reject stale saves rather than overwriting another admin's review.
- Campaign actions include Publish application round and Publish interview
  round, each with confirmation. Application Pass invites to interview; Fail
  rejects the application. Interview Pass accepts/activates the student; Fail
  rejects after interview. Preserve existing completed-interview, account-role
  and duplicate-ID checks. A failed publication rolls back the entire batch.
  Skip undecided, ineligible and previously published records. Allow repeated
  publishing for newly reviewed applicants, never processing a decision twice.
  Direct student review/final-decision RPCs and role-assignment shortcuts cannot
  publish recruitment decisions. Interview booking/cancellation still update
  their logistical stages as before; teacher recruitment is unchanged.
- Published student decisions are locked, though their notes can be corrected.
  Unassigned legacy applications may be reviewed, but cannot be published
  through a campaign. Retain historical private feedback without displaying it.
- Teacher management > Recruitment and Student management > Recruitment contain
  searchable/status-filtered application tables and question tables with
  10/25/50/100 row-size choices and pagination. Applications, Form questions
  and Interview slots use the same compact segmented top-tab bar as Academic
  Statistics; keep View applicant page as a right-aligned secondary action.
  Interview slots use the Academic calendar design, not a table/form split.
- Question types: short/long text, whole number, dropdown, yes/no and HTTPS URL.
  Support label/help, required flag, display order and active flag. Removing
  means excluding a question from future forms, not deleting reviewed answers.
  Include personal details, account email, picture and introduction video in
  the same management table. Only popup Edit opens question details. Provide
  Edit, Hide/Unhide and confirmed Delete actions for optional/custom questions.
  Core identity fields (including student age and teacher photo/CV) remain
  required, visible and server-validated; their labels/help/order can be edited.
- Application review accepts/invites or rejects. It does not activate a role.
- Interview slots use a separate table and booking flow modeled on lesson
  availability; never create lesson bookings for recruitment. Availability is
  shared by teacher and student applicants. Admins enter future local times,
  time zone, 30/45/60-minute duration and a supported meeting URL.
- Use shared day/week/month/agenda grids, compact date controls, time zone,
  status legend and internally scrolling panels. Admins click a future time/day
  or Add to open availability creation; invitees click a slot to confirm booking.
  Slot details/cancellation are shown in a popup. Filter loaded slots locally.
- Creation includes a required title (Teacher interview / Student interview
  defaulted from the originating recruitment view), optional description and
  optional interviewee. Only eligible invited applicants without another booked
  interview can be selected; create and booking/status changes are atomic.
- Match Academic lesson details: sticky title/status/Close and two aligned
  admin/interviewee photo/name/local-time cards, duration and description.
  Admins may append internal assessment notes without finalizing a decision.
  These notes stay in a separate admin-only table and remain unreadable to applicants.
- Filters are collapsed by default behind a toolbar Filters button next to Add.
  Search admin/interviewee name/email as well as title/description locally.
- Confirming cancellation permanently deletes never-booked slots. Previously
  booked slots retain cancelled history, last applicant linkage and assessments;
  legacy slots with unknown booking history are not automatically deleted.
- Both lesson and interview creation targets occupy half an hour and offer
  each half-hour start. Duration controls offer 30/45/60 minutes or Other with a
  number input, permitting whole minutes from 30 through the existing 120 maximum.
  Enforce the same bounds through server actions and database writes.
- Convert to UTC and reject invalid/ambiguous DST times. Prevent overlapping
  non-cancelled interview slots and double booking transactionally.
- Only invited applicants can book. They can cancel before the interview starts.
  Cancelling a booked slot as admin returns an open application to invitation.
- Final decisions open after the booked slot ends, with required internal
  interview feedback. Accept/reject and feedback are one atomic operation.
- Acceptance grants the teacher/student role, approved membership and Active
  participation, clears legacy requested role, copies name/country/time zone/
  biography/photo, and preserves stable member-number assignment. It must not
  overwrite an account that already has a role.
- Link accepted phone, birth date, hours, video and answer snapshots to private
  member profile details, readable only by that member and admins.
- Teacher acceptance immediately feeds the existing public teacher directory.
  Student profiles/supporting documents and internal feedback remain private.
- Retire the old membership-request endpoint; directory approval may restore an
  existing role member but must not bypass recruitment for a new Guest.

#### Attachments and privacy

- Private recruitment documents: PDF/DOC/DOCX up to 5 MB, with MIME/signature
  checks. Photos: JPEG/PNG/WebP up to 2 MB. Upload only within the user's folder.
- Private evidence can be read by its applicant and approved admins only.
  Admin downloads use short-lived signed links; no public document URLs.
- Review and interview feedback live in a separate admin-only table, protected
  by database RLS, not merely hidden in the applicant UI.
- Signed-in guests can upload applicant photos without approved membership.
  Failed submissions clean up newly uploaded, unreferenced files when possible;
  cleanup failures are logged explicitly.

#### Acceptance checks

- An under-16 or 26-and-over student cannot submit, including direct RPC calls.
- Required teacher photo/CV and required answers are enforced server-side;
  students can submit without a CV.
- Two applicants cannot reserve the same interview; cancelled bookings free it.
- A booked applicant remains at Interview until the slot ends, then Final review.
- Internal feedback is unreadable by applicants, even after rejection/acceptance.
- Accepting twice cannot create duplicate memberships or reassign member IDs.
- Editing/removing a question does not change any submitted answer snapshot.
- Guests appear only in the role-null account category; teacher participation
  Guests remain teacher accounts.
- Existing teacher/student accounts, lesson data and membership restoration
  remain usable after the migration.

Design references: [GOV.UK task list](https://design-system.service.gov.uk/components/task-list/)
for clear progress states and
[check answers pattern](https://design-system.service.gov.uk/patterns/check-answers/)
for clear review/submission guidance. The ABVN roadmap and interview UI are
original, use existing ABVN controls, and do not copy third-party page content.

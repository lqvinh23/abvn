# PRD & SYSTEM ARCHITECTURE: A BETTER VIETNAM WEBSITE

> The expanded dashboard specification is in
> [DASHBOARD_REQUIREMENTS.md](./DASHBOARD_REQUIREMENTS.md). It covers role-specific
> navigation, calendars, recruitment, content management, configurable policies,
> privacy, and acceptance criteria. It describes planned work, not the current
> implementation.
>
> **User preferences updated 21 October 2026:** use the supplied minimalist
> calendar reference's layout; support Day/Week/Month/Agenda, a full-week red
> current-time line, explicit UTC offsets, four range-based schedule summaries,
> simple sequential teacher/student IDs assigned at approval, compact
> `Teacher name - Student name (Student ID)` blocks, and photo-rich lesson
> details in the viewer's local time. The precise requirements and later changes
> are maintained in [Dashboard calendar preferences](./DASHBOARD_REQUIREMENTS.md#confirmed-user-preferences--21-october-2026).
>
> **Member management preferences, 21 October 2026:** table-based teacher/student
> monitoring, admin profile editing, and separate teaching/study status controls.
> Inactive teachers are hidden from the public directory and reactivate when they
> successfully publish a lesson. Inactive/banned/suspended students retain
> read-only history but cannot use Schedule or booking. See
> [Teacher management](./DASHBOARD_REQUIREMENTS.md#62-teacher-management) and
> [Student management](./DASHBOARD_REQUIREMENTS.md#63-student-management).
>
> **Calendar refinement, 21 October 2026:** maximize timetable space, move the
> zone/UTC offset beside summary metrics, strengthen status contrast, align the
> date chevron, show both participant local times, and support Yes / No /
> No but Apologize / Cancelled attendance. Teacher-side Cancelled preserves
> history and does not consume a weekly class allowance; weekly limit enforcement
> remains a future feature.
>
> **Latest calendar preferences:** restore the bottom legend, compact filters,
> 80px hourly rows, participant-aligned two-column times without viewer-local
> duplication, a sticky title/status/Close header, and written-only student
> feedback. "Teacher feedback" replaces "Teacher progress notes". Ratings are
> neither shown nor required for completed lessons.
>
> **Calendar detail and control refinement:** when no student has booked a
> lesson, show the current viewer's local date/time and time zone inside the
> empty Student panel. Replace native select dropdown appearances with a
> consistent, keyboard-accessible custom option menu across dashboard pickers.
> Align the Teacher and Student local-time sections horizontally.
>
> **Shared calendar and cancellation policy:** teachers and active students can
> see all classes with participant names/IDs, title, description, pictures and
> participant-local times. Other upcoming/ongoing classes show Available/Booked;
> their status is hidden once they end. Other participants' attendance, feedback,
> student profile links and classroom links stay private at all times. Students
> can still see/book open slots. Cancelling a slot with no booking history deletes
> it; booked cancellations retain history.
>
> **Content editing and workspace preferences, 22 October 2026:** use collapsible
> Landing/About/News/Media links beneath Web content in the sidebar. Editors are
> compact and table-based, exposing only major content with optional live
> preview. Preserve saved minor content without exposing every label or layout
> detail. Remove visible headings/descriptions and standalone time-zone banners
> from all dashboard sections to maximize usable space; retain accessible
> headings and context-specific time zones inside calendars and lesson details.
>
> **News editor refinements, 22 October 2026:** five-second result notices;
> per-article publisher assigned from the publishing admin; newest-first sortable
> dates; inline local image upload shared with Media; category options;
> Published/Archived visibility with separate private draft saving; visual article
> formatting for emphasis, headings, lists and quotes, preserved in public pages.
>
> **Editor reliability refinement:** use standard Quill/Snow controls instead of
> the custom toolbar. Support underline and clear formatting. Align editor,
> server and database validation; verify formatted save/reload/repeated save.
> Recover safely from stale versions without discarding unsaved work or silently
> overwriting another editor's changes; keep real conflict recovery visible.
>
> **Latest news/table preferences, 22 October 2026:** add Category to the article
> table; combine title/publisher search with category/day/visibility filters.
> All dashboard tables have pagination and 10/25/50/100 row-size choices. Insert
> library/uploaded images and playable YouTube links inside articles. Combine
> choose/upload image in one dialog; derive article image descriptions from its
> title instead of exposing an alt-text field. Remove versions/restore UI while
> retaining internal save-conflict protection and publication audit records.
> Use consistent icons with readable action-button labels.
>
> **Teacher profile and pagination refinement, 22 October 2026:** restore the
> original portrait header and two-column biography/focus/interests/milestones
> layout for real teacher accounts, with introduction and statistics sidebar.
> Use real published data and honest missing-content states, never sample facts
> or private recruitment evidence. All dashboard table footers match News:
> row range on the left, row-size menu, previous/next chevrons and page count on
> the right, including member, guest and recruitment management tables.
>
> **Teacher directory refinement, 22 October 2026:** approved teachers only,
> sidebar navigation instead of duplicate top tabs, and a compact search/status/
> sort toolbar without membership controls. Replace the membership column with
> completed lessons and unique attending students taught; show Country without
> English level, and keep English-level editing student-only. Statistics use
> database aggregates over all history, not a truncated client-side lesson list.
>
> **Workspace consistency, 22 October 2026:** remove duplicated top navigation
> for Directory/Recruitment and All accounts in every management view;
> use the sidebar/mobile menu instead. Keep unique recruitment workflow tabs,
> calendar view switches and contextual Back buttons. Use one shared compact
> filter style across directories, accounts/guests, recruitment, calendar,
> page-content/news editors and media pickers: white bordered bar, 12px labels,
> 14px control text and aligned 44px controls. Filter automatically on selection
> and after a short search debounce; no Apply button. Clear is an icon with a
> tooltip and accessible name. Sort through table headers, not a separate box.
> Wrap cleanly on narrow screens. Preserve filter behavior,
> row size, sorting, pagination and accessible custom dropdown menus.
>
> **Academic dashboard, 23 October 2026:** move the existing lesson calendar
> into the Academic > Schedule subsection and add Academic > Statistics for
> administrators. Statistics has Lessons, Teachers and Students tabs plus
> Week/Month/Quarter/Year controls, compact metric cards, trend charts and
> ranked activity tables. Use privacy-preserving, admin-only database
> aggregates, define activity metrics and period boundaries, and provide
> accessible chart equivalents. See
> [Academic requirements](./DASHBOARD_REQUIREMENTS.md#64-academic).
>
> **Compact dashboard refinement:** the dashboard stays fixed to the viewport;
> only its tables/panels/calendars scroll. Remove unnecessary introductory notes,
> not error/validation messages or destructive confirmations. Table actions are
> icon-only with hover names and accessible labels. Admin My profile contains
> name, read-only email, country, time zone, picture and a private interview
> meeting link used as the default for newly offered slots. Hide unrelated fields
> without clearing saved values. Sorting applies to all filtered rows before
> pagination. Only the active sort column shows an arrow. Directories and
> recruitment lists use immediate local filtering/sorting like News after loading
> the complete authorized collection, retaining URL state and page size.
> Table text wraps within the available width; mobile records use labeled cells.
>
> **Editor refinement:** Add article belongs in the top action bar. One date
> filter supports either one day or an inclusive From/To range. Undo/Redo,
> image/video insertion, alignment and text color share the formatting toolbar.
> Article titles open a separate, deep-linkable editor view with Back to all
> articles and Remove article replacing Add article. Preserve draft changes and
> table state on return. List preview shows the news page; editor preview shows
> the article. Insert image is icon-only with an accessible label. Click embedded
> images and drag corner handles to resize proportionally, with keyboard/undo
> support and no separate width-control bar.
> Preview/public YouTube players must show a click-to-play panel and explicit
> errors/fallback links if a browser or the video owner blocks playback.
>
> **All accounts and combined-role refinement:** keep Guests in the All accounts
> list as a role filter, not a separate subsection. Show Teacher, Student, Admin,
> or Guest as the role, with a distinct tag color for each; use Status for
> participation status and `-` when a value does not apply. One per-account
> popup assigns or removes roles and closes when clicking outside or another
> account. Admin access is independent of the primary Teacher/Student role, so
> Admin may be combined with either. Admin is the default workspace; eligible
> combined-role accounts can switch workspaces from the sidebar. Removing
> Teacher/Student marks participation inactive but preserves the role and
> history; reassigning that role reactivates it. Removing Admin access preserves
> any Teacher/Student role; an Admin-only account becomes a Guest. Admins cannot
> remove their own Admin access or the last approved Admin's access. Role removal
> never deletes the account or lesson history.

## 1. PROJECT OVERVIEW
* **Project Name:** A Better Vietnam (ABVN) Website
* **Target Audience:** 
  * Vietnamese students (aged 16-25) from disadvantaged backgrounds.
  * Retired foreign volunteer teachers (requiring a highly intuitive, high-contrast, minimalist UI).
  * System Administrators.
* **Core Mission:** Provide free English education through an automated, reliable, and highly accessible scheduling and feedback system.

### Confirmed recruitment scope - 22 October 2026

- Recruitment stays on this website: `/apply` for teachers and `/student-apply`
  for students. Do not send applicants to the old ABVN website.
- Four account categories: Guest, Teacher, Student, Admin. A Guest is a signed-in
  account with no assigned role (database `role = null`), not the existing Guest
  teaching-participation status. Admins monitor all categories, including
  Guests, under **Systems > All accounts**; Guests are not a separate subsection.
- Two rounds with a four-step roadmap on the left and current-step work on the
  right: **Application > Application review > Interview > Final review**.
  Stack these panels on narrow screens.
- Teacher forms collect verified-account email, name, phone, country/time zone,
  introduction, weekly teaching hours, required photo and private CV, optional
  introduction-video link, and admin-managed questions covering motivation,
  experience, teaching preferences, adaptability, availability and commitment.
- Student forms collect age/date of birth, contact/background, learning goals,
  weekly availability, English self-assessment and readiness. Students must be
  **16-25 inclusive**, enforced on the server. Teacher age is unrestricted.
  Student photos/supporting documents are optional; do not require a student CV.
- Admins manage questions and applications under **Teacher management >
  Recruitment** and **Student management > Recruitment**. Lists are tables;
  questions can be added, edited, reordered or removed from future forms without
  changing submitted snapshots.
- Include personal information, account email, picture upload and introduction
  video in the question table, not only supplemental questions. Show only the
  table and Add action; open detail editing in a popup on Edit. Provide icon-only
  Edit, Hide/Unhide and confirmed Delete actions. As confirmed, essential identity
  fields remain required and cannot be hidden/deleted; optional/custom fields can.
  Form labels, help, required state, visibility and ordering follow saved settings.
- Use the academic calendar design for interview availability and booking:
  Today, date/period controls, day/week/month/agenda, timezone, status legend,
  internal scrolling, click-to-create for admins and click-to-book for invitees.
  Creation and slot details use popups rather than a permanently displayed form.
- Interview creation includes a required title (default **Teacher interview** or
  **Student interview** based on the recruitment view), optional description, and
  optional assignment to an eligible applicant who passed application review.
  Assignment atomically books the slot and advances the applicant to booked.
- Interview details match lesson details: sticky title/status/Close, aligned
  admin/interviewee photo/name and local-time cards, duration and description.
  Admins can append private assessment notes without making a final decision.
  Applicants cannot read these notes, including through direct database access.
- A never-booked interview slot is permanently removed on confirmed cancellation.
  Slots with prior bookings retain cancelled history, applicant linkage and notes.
  Migration 020 removes legacy cancelled slots only when there is no current or
  prior applicant link or assessment history; unassigned future availabilities
  remain until cancelled.
- Admins can edit every field on an upcoming interview slot, including while
  booked, without reassigning its interviewee. Teachers can edit their own
  upcoming lessons and admins can edit any upcoming lesson, preserving its
  current booking. A booked time or duration change must prompt the editor to
  contact the participant before saving and create a private in-app notice for
  the affected participant. Email delivery is deferred. Lesson booking
  timestamps must stay synchronized with slot times.
- Cancelling a newly created, never-booked interview slot deletes it completely
  from the calendar and history; slots with prior or unknown booking history
  remain as cancelled records when applicant or assessment history is recorded.
- Keep interview filters hidden initially behind a Filters button on the same
  toolbar row as Add interview slot; search admin/interviewee name or email,
  title and description locally.
- Both lesson and interview calendar creation targets span 30 minutes and support
  starts on each half hour. Duration defaults offer 30/45/60 minutes and Other
  with a numeric input. Minimum is 30 whole minutes; preserve the existing
  120-minute maximum and enforce limits in UI, server actions and database.
- Application acceptance invites the applicant to book a separate interview
  slot, not a lesson. Admins create shared interview availability; applicants
  select available times in their time zone. Booking is exclusive and
  server-validated. Applicants can cancel/rebook before the interview starts;
  admin cancellation makes the applicant eligible to book again.
- Final acceptance/rejection is recorded after the interview slot ends, together
  with required **admin-only feedback**. Feedback/review notes are never shown
  to applicants. Final acceptance atomically activates the correct account role,
  synchronizes reviewed profile fields and retains the decision history.
  Preserve phone, date of birth, weekly hours, introduction video and custom-answer
  snapshots in private profile-linked application details visible only to the
  member and admins; never expose contact/birth/application answers publicly.
  Accepted active teachers appear in the existing Our volunteer teachers list;
  no additional home-page teacher section is required.
- Show status/decisions in-app only for this release. Recruitment emails are
  deferred. Rejected applicants cannot reapply until an admin enables it.
- Keep Google sign-in; new members use recruitment rather than a one-click
  membership-approval shortcut. Existing approved accounts and lessons remain.
- See [Recruitment workflow](./DASHBOARD_REQUIREMENTS.md#66-recruitment-workflow---confirmed-22-october-2026)
  for validation, privacy and acceptance criteria.

---

## 2. SYSTEM ARCHITECTURE & TECH STACK
To build a professional, scalable, and secure platform, the following modern tech stack is recommended:

### Frontend
* **Framework:** **Next.js 14+ (App Router)** - Excellent for SEO (Landing Page) via SSR, and dynamic dashboard performance via CSR.
* **Styling:** **Tailwind CSS + shadcn/ui** - Minimalist, highly accessible design system with built-in dark/light contrast optimization.

### Backend & Database
* **Backend Framework:** **Next.js Route Handlers (Serverless)** or **Node.js (NestJS)** if complex real-time background jobs are required.
* **Database:** **PostgreSQL** (Managed via **Supabase** or **Neon**) - Highly reliable relational data for complex schedules, relationships, and user roles.
* **Authentication:** **NextAuth.js (Auth.js)** or **Supabase Auth** - Native integration for Google OAuth 2.0.

### Infrastructure & Services
* **Hosting/Server:** **Vercel** (Frontend & Serverless functions) or **AWS Amplify**.
* **Storage (Cloud):** **Supabase Storage** or **AWS S3** (for profile pictures, educational resources, and news media).
* **Notifications:** **Resend** or **SendGrid** are future integrations; recruitment
  status is in-app only in the current release.

---

## 3. FULL PRODUCT REQUIREMENTS (PRD)

### 3.1. Landing Page (Public Access)
* **Design Philosophy:** Minimalist, generous whitespace, large readable typography (minimum 16px for body text to accommodate senior teachers).
* **Navigation Tabs:**
  1. **Home:** High-impact hero section, mission statement, clear Call-to-Actions (CTAs).
  2. **About Us:** History, impact statistics, core team information.
  3. **News:** Blog engine for project updates, events, and student stories.
  4. **Our Volunteer Teachers:** Public grid showcasing active foreign educators.
  5. **Become a Teacher:** Application form for international volunteers (Includes resume/certification upload, availability overview).
  6. **Become a Student:** Internal application for ages 16-25 with background,
     English self-assessment and optional private supporting documents.
  7. **Login/Signup:** Seamless Google Account OAuth integration.

### 3.2. Role-Based Dashboards & Features

#### A. Volunteer Teacher Dashboard
* **Profile Management:** Edit biography, upload profile picture, specify teaching preferences.
* **Schedule Logging (Availability):** Time-zone aware calendar interface (crucial for international teachers). Teachers open slots in their local time zone; the system automatically converts it to Vietnam Time (ICT) for students.
* **Classroom Access:** Integration links for teaching platforms (Zoom, Google Meet, or Skype).
* **Post-Class Feedback:** Submit attendance and quick performance remarks for the student.
* **Received Feedbacks:** View encouraging messages or constructive notes sent by students.

#### B. Student Dashboard
* **Profile Management:** Basic information display, tracker for completed learning hours.
* **Class Booking:** Interactive list or calendar view of available slots opened by teachers. One-click booking with auto-cancellation rules (e.g., cannot cancel within 12 hours of the class).
* **Post-Class Feedback:** Rate the lesson and leave thank-you notes/feedback for the teacher.
* **Academic Review:** View historical progress notes and feedback received from all teachers.

#### C. Administrator Dashboard (Superuser)
* **User Management:** Standard CRUD operations for Students and Teachers. Verification queue to approve or suspend accounts.
* **Recruitment Pipeline:** Internal teacher/student applications, application
  review, separate interview booking, internal feedback and final acceptance or
  rejection. Status is in-app; automated emails are deferred.
* **Content Management (CMS):** Create, update, or delete blog entries under News, change impact metrics, update text content on the landing page.
  Implemented with an approved-admin editor for Landing/About text, images, links,
  section ordering/visibility, News CRUD/statuses, private media and live previews,
  draft saves and explicit publishing, without a versions/restore interface. Public pages
  use persisted published content. New layout/card types and global header/footer
  changes remain developer-managed.
* **Class Audit:** Monitor active schedules, booking rates, and resolve class disputes or absences.
* **Global Configurations:** Manage system parameters, update Terms of Service, Privacy Policies, and automated email rules.

---

## 4. DATABASE SCHEMA DESIGN (ENTITY RELATIONSHIP RELATION)
```
- Users (id, email, name, role [student, teacher, admin], avatar_url, created_at)
- TeacherProfiles (id, user_id FK, bio, country, time_zone, status [pending, approved, suspended])
- StudentProfiles (id, user_id FK, birth_date, background_info, proficiency_level, status)
- Slots (id, teacher_id FK, start_time [UTC], end_time [UTC], status [available, booked, completed, cancelled])
- Bookings (id, slot_id FK, student_id FK, meet_link, created_at)
- Feedbacks (id, booking_id FK, sender_role [teacher, student], comment, created_at).
  Historical rating values may remain stored for compatibility; new feedback is
  written-only and completion never depends on a score.
- News (id, title, slug, content, banner_url, author_id FK, created_at)
- Applications (id, full_name, email, application_type [teacher, student], raw_data [JSONB], status [pending, approved, rejected])
```

---

## 5. VS CODE COPILOT PROMPTS FOR STEP-BY-STEP DEVELOPMENT

### Prompt 1: Initializing Project Structure & Database Schema
```text
Act as a Senior Full-Stack Engineer. I am building a website for "A Better Vietnam" (ABVN), a non-profit project that provides free English lessons to disadvantaged Vietnamese youths using retired foreign volunteer teachers. We are using Next.js 14 (App Router), Tailwind CSS, shadcn/ui, and Prisma with PostgreSQL. 

Please generate:
1. A clean, modular file structure optimized for Next.js App Router.
2. A complete Prisma schema matching our requirement entities: User (roles: admin, teacher, student), TeacherProfile, StudentProfile, Slot (for calendar scheduling), Booking, Feedback, News, and Application. Ensure appropriate foreign keys and relations are declared cleanly.
```

### Prompt 2: Authentication & Protected Role-Based Routing
```text
Using NextAuth.js (Auth.js) with the Google Provider and Prisma Adapter, implement a complete authentication system. 

Requirements:
1. When a user logs in via Google for the first time, their account should default to a public status without a specific dashboard role.
2. If their User.role is 'teacher', protect and safely redirect them to `/dashboard/teacher`. If 'student', redirect to `/dashboard/student`. If 'admin', redirect to `/dashboard/admin`.
3. Provide the full code for a custom middleware handling this role-based edge redirection, alongside custom session callback extensions to include the `role` inside the session token.
```

### Prompt 3: Timezone-Aware Schedule Calendar for Senior Teachers
```text
I need to build the Slot Management component for the Volunteer Teacher dashboard using Tailwind CSS and shadcn/ui. 
The users are mostly retired individuals, so the UI must be exceptionally clean, intuitive, and high contrast. 

Please write a React component (Next.js client component) that:
1. Displays a Weekly Grid view where teachers can select slots they are available to teach.
2. Explicitly uses the teacher's native local time zone via `luxon` or `date-fns-tz`, but saves the timestamps cleanly into the backend database as UTC ISO strings.
3. Includes an elegant visual confirmation modal that states exactly what dates and times are being uploaded to reduce cognitive load.
```

### Prompt 4: Student Booking Component with Automated Conflict Validation
```text
Write a Next.js Server Action and a Frontend booking button component for the Student Dashboard.
When a student clicks "Book Class" on an open teacher slot:
1. Verify via database transaction that the Slot status is still 'available'.
2. Verify that the student does not have any conflicting bookings at that same time.
3. Update Slot status to 'booked', create a new row in the Booking table, and generate a dynamic Google Meet or placeholder video link.
4. Return clear error/success toasts using shadcn/ui components. Use high-quality concurrent safety mechanisms (Prisma transaction isolation).
```

### Prompt 5: Admin Application Verification Dashboard
```text
Create an analytical, elegant dashboard view for the Admin panel (`/dashboard/admin/applications`). 
1. Build a shadcn/ui Data Table that lists all pending applications (both student and teacher types).
2. The table must support server-side pagination, sorting, and filtration by type ('teacher' vs 'student').
3. When clicking a row, open a detailed sheet or side-drawer showing the application's JSON metadata (resume links, background descriptions).
4. Provide action hooks ("Approve" / "Reject") that hit a Next.js Server Action to update the status and trigger a mock automated email notification.
```

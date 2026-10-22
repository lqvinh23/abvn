# ABVN Dashboard Requirements

Status: evolving specification and user-preference record. See the setup guide
for delivered features and required database upgrades.

This document expands the dashboard requirements in [REQUIREMENTS.md](./REQUIREMENTS.md).
It describes intended functionality, not features already delivered. Where the
two documents differ on dashboard behavior, this document is the newer
specification. Existing implementation/setup information remains in
[the platform setup guide](../supabase/SETUP.md).

## 1. Goals and scope

Provide clear, accessible workspaces where:

- Teachers manage availability, lessons, student progress, and communication.
- Students find lessons, understand their obligations, and follow their progress.
- Administrators manage recruitment, accounts, academic operations, content, and policy.

Retain Supabase Auth, PostgreSQL, and private storage. Keep Google sign-in and
server-enforced membership approval. Public sample teachers/news must not be
mistaken for real accounts, applications, bookings, or production statistics.

Requirements written as "must" are proposed release requirements. Items labeled
"recommended" are additions to the requested scope. Policies marked "decision
required" must not silently become production defaults.

## 2. Shared layout and design

### 2.1 Dashboard shell

- Use a persistent left sidebar with expand/collapse controls.
- Expanded mode shows icons and text; collapsed mode keeps accessible labels and
  tooltips. Remember the user's preference without mixing preferences between accounts.
- Highlight the active view and expose unread/action counts where useful.
- Show role, member name, avatar, and profile access in the shell.
- Updated 22 October: remove visible workspace headings, descriptions, role
  banners, and the standalone time-zone banner from every dashboard section.
  Retain a screen-reader heading and skip link. Start with the actual controls
  and content; keep time zones only where useful, such as the calendar toolbar
  and lesson details.
- Include clear links to the public website and sign-out.
- On mobile, replace the sidebar with an accessible dismissible drawer. Keep the
  main content readable without squeezing a desktop sidebar onto the screen.
- Use dedicated URLs for views and subtabs; refresh, browser Back, and direct
  links must preserve the selected view.
- Do not display the full marketing navbar/footer inside the authenticated
  workspace. Public profile and marketing pages retain their public layout.
- New/pending, rejected, and suspended members see a limited account-status
  workspace, not functional teacher/student dashboards.

### 2.2 Visual and accessibility standards

- Minimalist ABVN branding, restrained green accents, neutral backgrounds, and
  consistent cards, spacing, typography, forms, and button hierarchy.
- Default body text at least 16 px; readable line lengths and generous spacing.
- Target WCAG 2.2 AA: keyboard support, visible focus, appropriate contrast,
  descriptive labels, reduced-motion support, and screen-reader announcements.
- Prefer controls at least 44 x 44 px for primary interaction targets.
- Never communicate lesson status through color alone: include labels and icons.
- Support loading, empty, error, success, disabled, and permission-denied states.
- Explain why an action is unavailable and what the user can do next.
- Confirm destructive, disciplinary, publishing, and series-wide changes.
- Prevent duplicate submission, retain unsaved form values after errors, and warn
  before discarding meaningful unsaved edits.
- Avoid surprise auto-navigation, crowded tables, unnecessary animations, and
  unlabeled icon-only controls.

### 2.3 Role navigation

| Teacher | Student | Administrator |
| --- | --- | --- |
| Profile | Profile | Web content |
| Schedule | Schedule | Teacher management |
| Feedback | Feedback | Student management |
| History | History | Academic |
| Student list | Notifications | System settings |
| Notifications | Settings | |
| Settings | | |

Recommended default views: Schedule for teachers/students; Academic overview for
administrators. Show a compact summary of the next lesson, pending actions, and
important notices rather than making users search through every tab.

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
  excused absence with a distinct pink status and no automatic penalty.
  Cancelled is for a teacher-missed lesson or a cancellation communicated outside
  ABVN. Save both slot and booking as cancelled, preserve notes/history, never
  reopen the elapsed slot, and exclude this booking from weekly class allowance
  consumption. The current app has no enforced weekly quota/balance; do not claim
  a balance was credited. Future quota enforcement must exclude cancelled bookings.
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

## 4. Teacher dashboard

### 4.1 Profile

- Edit name, country, time zone, photo, biography, teaching focus/preferences,
  languages, hobbies, and introduction video URL.
- Distinguish public profile fields from private contact/account fields.
- Validate inputs and uploads, preview the public profile, and show save state.
- Teachers cannot change approval, account role, or active/inactive/guest status.
- Recommended: draft profile editing and an administrator publishability review.

### 4.2 Schedule

- Create a lesson by activating an empty time cell or the persistent Create class
  button. Both open the same accessible form.
- Prepopulate the chosen cell's local date/time; allow choosing another date.
- Capture title, description, duration/start/end, teaching focus or level, time
  zone, and a supported classroom URL.
- Offer one-time and recurring weekly lessons, selected weekdays, repeat
  interval, and an end date or occurrence count.
- Preview all occurrences in local and Vietnam time before publishing.
- Set a bounded recurrence horizon and maximum occurrences to prevent accidental
  unlimited creation. Proposed defaults: 12 weeks and 50 occurrences.
- Validate conflicts for every occurrence on the server. Show conflicting dates;
  do not partially publish a series without explicit confirmation of the subset.
- Edit/delete this occurrence or this and future unbooked occurrences.
- Do not silently move booked lessons. Require cancellation/rescheduling workflow,
  affected-student notice, and an audit record.
- Cancelling a booked lesson requires a reason, creates the purple outcome,
  notifies the student, and does not count as student absence or consume their
  weekly booking entitlement.
- Recommended: calendar export using private revocable subscription tokens.

### 4.3 Feedback

- Separate "To complete", "Given", and "Received" views with counts.
- Mark attendance and write Teacher feedback after the lesson ends.
- View student written feedback linked to each lesson/student; no ratings.
- Filter by student, date, and feedback state.
- Edits preserve revision/audit history and any configured edit deadline.
- No-show submissions initiate the policy-review workflow, not an irreversible
  teacher-controlled account ban.

### 4.4 History

- Searchable, paginated completed/cancelled/absence history.
- Display taught lessons, attended teaching hours, distinct students supported,
  cancellation totals, and feedback completion over a selected date range.
- Define every metric; do not count open slots as taught lessons.
- Recommended: a private CSV export of authorized records.

### 4.5 Student list

- Read-only, searchable list of active programme students for approved teachers.
- Academic profiles show name, member ID, level, learning goals, relevant
  attendance history, and teacher progress feedback across lessons.
- Do not expose income evidence, applications, private contact details, or
  administrator disciplinary notes.
- Access to all programme students is requested scope; access to only previously
  taught/booked students is a recommended privacy alternative. Final visibility
  policy requires confirmation before implementation.
- Suspended/inactive teachers lose student-directory access.
- Teachers cannot edit student identities or other teachers' feedback.

### 4.6 Notifications

- Booking/cancellation/rescheduling, upcoming lesson reminders, pending attendance,
  received feedback, project news, and administrator announcements.
- Include unread counts, read/unread controls, filters, and relevant deep links.
- Notification text must not leak private student data in emails or previews.

### 4.7 Settings

- Email/in-app preferences by notification category and reminder timing.
- Time zone, week-start day, 12/24-hour clock, default calendar view/working hours,
  sidebar preference, and accessibility/reduced-motion preference.
- Account sign-out, privacy information, and account-support contact.
- Mandatory policy/account-security notices remain visible in-app regardless of
  optional email preferences.

## 5. Student dashboard

### 5.1 Profile

- Edit name, photo, country/time zone, biography, interests, and learning goals.
- Show programme dates, verified level, eligibility state, and member ID.
- Distinguish self-assessed level from administrator-verified level.
- Verified identity, age/eligibility, account status, and programme membership
  changes require review where applicable.
- Profile is private to self and authorized teachers/admins.

### 5.2 Schedule and booking

- Show available lessons, shared calendar classes with participant names/IDs,
  title/description, pictures and local times, and the student's own classes.
- Booking confirmation includes teacher, title, time zone, duration, cancellation
  deadline, and applicable booking restrictions.
- Recheck eligibility, teacher status, availability, overlap, weekly quota,
  booking window, outstanding feedback, and sanctions in one server transaction.
- One live booking per slot; concurrent booking attempts cannot both succeed.
- Cancellation is allowed strictly more than the configured cutoff before start.
  Proposed initial cutoff: 12 hours, preserving current behavior.
- Show a countdown/deadline and explanatory disabled state after the cutoff;
  administrators retain an audited override for exceptional cases.
- Cancelled bookings must not continue to consume quota; show the history.
- Show a clear next-registration opening time and restriction expiry when relevant.
- Allow joining via the participant-only classroom link; do not imply ABVN hosts
  the video call or automatically creates a meeting unless integrated later.
- Names/IDs are intentionally visible for other booked calendar entries, but
  pictures and class details are also shared. Another student's profile,
  feedback, attendance/apology, past/cancellation status and disciplinary
  information must never be visible.

### 5.3 Feedback

- Views for feedback due, feedback given, and Teacher feedback received.
- Submit constructive written feedback/thank-you notes after each lesson,
  without a rating.
- Clearly show when required feedback blocks future bookings and link directly
  to the outstanding lesson.
- Do not require feedback for cancellations, unbooked slots, or incorrectly
  reported absence while an appeal is unresolved.
- Provide an absence/apology submission and correction-request route.

### 5.4 History

- Searchable personal lesson history with teacher, date, status, attendance,
  notes, feedback, and cancellation information.
- Show attended lessons, actual attended learning hours, feedback completion,
  and learning progress over a selected period.
- Recommended: private personal learning milestones without public leaderboards.

### 5.5 Notifications and settings

- Booking confirmations, changes/cancellations, reminders, feedback due/received,
  registration openings, policy decisions, restriction expiry, and project news.
- Same preference/accessibility controls as teachers, with role-appropriate categories.
- Show academic restrictions and their reason, start/end, and appeal contact
  privately and in understandable language.

## 6. Administrator dashboard

### 6.1 Web content

Subtabs: Landing page, About page, News, Media, Preview and publishing.

**Simplified 22 October 2026:** Web content is a collapsible sidebar group with
Landing page, About page, News, and Media links, including mobile navigation and
direct URLs. Remove the duplicate page tabs and large editor headings. Use a
compact sticky save/publish toolbar and full-width tables by default.

Landing exposes 23 major fields: welcome text/image, impact figures, purpose,
partner names/logos, and the closing invitation. About exposes 60 major fields:
introduction, story, mission/programme, founder, founding teachers and team
names/photos. Show one clearly labelled content group at a time with search
across the page's curated fields. Keep existing small labels, buttons, links,
decorative text, testimonials, journey/SDG details and section layout/order out
of the editor. Preserve all their saved values when saving/publishing; do not
reset hidden fields to defaults. Adding layout types or changing card counts
remains a source-code task. Header/footer and other public routes are not
edited here. News supports adding/editing/removing up to 100 articles, unique
slugs, dates, category choices, formatted article text, and Published/
Archived visibility. Save draft remains a separate private collection operation.
Public news lists, pagination, article pages and metadata
read published CMS content.

- News uses a compact article table with title/category/date/publisher/visibility and click-to-edit;
  media uses a thumbnail/file/actions table. Keep controls keyboard-accessible
  with at least 44px targets despite the denser layout.
- Search news by title or publisher name, combined with category, exact calendar
  day or inclusive From/To range and visibility filters. Use one date-filter
  box that opens One day/Date range choices, not separate permanent fields.
  Validate chronological ranges. Provide Clear filters and an explicit empty result.
  Filtering/sorting resets pagination without changing the article being edited.
- Place Add article in the sticky top action bar alongside preview/save/publish,
  not in a second row above the table. The all-articles view contains only the
  searchable table. Clicking a title opens a separately addressable editor page;
  replace Add article with Remove article and provide Back to all articles.
  Preserve unsaved content and the table's filters/page when navigating between
  these views. Support deep links, reload and browser Back/Forward.
  Show preview displays the news listing from the table view and the selected
  article from its editor, using the public components in both cases.
- All dashboard tables (news, media, page fields, teacher/student/account
  management) use shared pagination: 10 rows by default, selectable 10/25/50/100,
  row totals/range, page count, accessible Previous/Next controls, and correct
  empty/last-page behavior. Retain edits when changing pages.
- News refinements, 22 October: clicking Date toggles ascending/descending order,
  newest first by default, without changing which article is being edited.
  Category is a custom option menu (Announcements, Community, Events, Impact,
  Milestones, Partnerships, Volunteering); retain any previously saved custom
  category as an option rather than deleting it.
- Article visibility offers only Published/Archived. New articles start Archived.
  Old Draft articles become Archived without losing content; private Save draft
  and explicit Publish remain distinct. Archived articles stay off the public site.
- Combine image selection and local uploading in one thumbnail-library dialog,
  reused for cover images, page images and embedded article images. Upload and
  select in one step; include uploads in Media. Reuse private JPEG/PNG/WebP
  validation and the 2 MB cap. Remove the article alt-text field; default cover
  and embedded image descriptions to the article title.
- Use the established Quill editor with its standard Snow toolbar, not a
  hand-built visual-editor toolbar. Support normal text/heading styles, bold,
  italic, underline, strikethrough, bulleted/numbered lists, indentation, quotes,
  clear formatting, left/center/right/justified alignment, text color and
  undo/redo. Put Undo/Redo/Insert image/YouTube on the same wrapping Snow toolbar
  as the other formatting controls. Insert image is an icon-only button with an
  accessible name. Clicking an embedded image reveals corner handles for direct
  drag resizing (10–100%, preserving aspect ratio), not a separate width bar.
  Support keyboard resizing, cancellation and undo/redo. Persist alignment,
  hex text colors and percentage image widths through save/reopen and render
  them identically in preview/public pages. Provide familiar icons, accessible names,
  keyboard shortcuts, readable document spacing, and at least 44px controls.
  Store validated structured
  content, not arbitrary HTML. Render identical formatting in preview and public
  articles, with legacy plain-text content preserved. Verify format -> Save draft
  -> reload -> format retained -> repeated save, not just preview.
- Insert images at the current article cursor from the shared library/upload
  dialog. Insert a YouTube watch/share/Shorts/live/embed HTTPS link and normalize
  it to a privacy-enhanced playable embed. Reject arbitrary hosts, scripts,
  raw iframe HTML and remote image URLs. Support media-only article bodies,
  safe save/reload and matching preview/public rendering. Show a visible
  click-to-play panel with explicit 16:9 dimensions, not a blank lazy iframe.
  Load the external player only on Play, with inline/fullscreen support,
  origin/referrer information and no automatic playback before user interaction.
  Display loading and blocked/unavailable-video errors with a working
  Watch on YouTube fallback in both preview and public pages. Embedding can
  still be disallowed by YouTube, the video owner or the browser/network.
  Verify actual playback progress in a regular browser, not only iframe markup;
  explain integrated-editor browser restrictions when applicable.
  Inline uploaded images must exist before saving and become readable only when
  referenced in a Published article. Archived/draft inline images stay private.
- Use consistent decorative icons alongside descriptive action-button text;
  do not replace accessible labels with unexplained icons.
- Display each article's publisher in the admin table and public article byline.
  The database assigns the approved publishing admin's name, never an editable
  writer input. Record the latest admin to publish a changed article; publishing
  unrelated articles does not replace existing attribution. Backfill only from
  known publication records; do not invent a writer for initial sample content.
- Preview is closed by default and opened on demand, so the editor uses all
  available width. Unsaved changes update a private, admin-authenticated iframe using the exact
  public rendering components. Desktop (1024px) and mobile (390px) are real iframe
  viewport widths; interactive carousels still work and preview links cannot
  navigate away. Invalid/incomplete drafts show an explicit preview warning.
- Save draft does not affect the public website. Publish requires confirmation,
  validates all fields server-side/in PostgreSQL, and invalidates public routes.
  Concurrent saves use version checks to avoid overwriting another admin's work.
- Save reliability refinement: synchronize refreshed saved versions only when
  the corresponding local draft is clean. For stale versions, compare the
  original/local/latest drafts and retry once only for non-conflicting changes.
  Merge separate news articles or separate page fields; do not overwrite two
  different edits to the same article. Preserve the latest publisher metadata.
  For genuine conflicts, keep local work and show persistent recovery controls:
  Download my edits, Use latest saved draft, Keep editing my version.
  Schema/setup failures must state the required migration rather than imply a
  successful save. Validator-only upgrades must not bump content versions.
- Show success/failure notices for five seconds, restarting the timer for each
  new notice. Keep confirmation prompts and unsaved-change warnings visible
  until the admin decides. Warn before leaving with unsaved edits, and retain
  unsaved values while switching sidebar content pages. Do not show or fetch a
  published versions/restore interface. Keep internal concurrency checks and
  existing publication audit records; removing UI is not a request to erase data.
- Private media bucket: JPEG/PNG/WebP up to 2 MB, checked by MIME and signature.
  Only images referenced in published page content or published news articles
  are readable publicly. Draft/archived-news images stay private; signed URLs
  expire after 60 seconds. Gallery shows the latest 100 uploads plus site images.
  Admins may remove unused uploads, but saved drafts/publications/revisions
  protect referenced files for publication audit integrity.
- The additive migration imports existing public content without changing
  members, bookings, or feedback. Missing migration/load failures are explicit;
  configured deployments never silently fall back to sample content.

- Manage editable public text/images, impact figures, partner logos, page sections,
  ordering/visibility, and news articles with slugs, categories, dates, and banners.
- Separate draft, published, and archived content.
- Provide an authenticated live preview using the same rendering components as
  the public website. Unsaved draft changes update preview without publication.
- Offer desktop/mobile preview widths, save state, and explicit Publish.
- Never expose draft previews or uploaded recruitment documents through public URLs.
- Record who published what and when; support restoring a prior published version.
- Validate images, links, alt text, article slugs, and required content.
- Do not permit arbitrary executable HTML/JavaScript or editing authentication
  configuration through the CMS.
- Use saved CMS content for public pages, not a production fallback that silently
  hides failed saves behind hard-coded sample content.

### 6.2 Teacher management

Subtabs: Directory, Applications, Profile review, Statistics.

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
- Reject/request changes with a clear applicant-visible reason. Optional email
  delivery must not be reported as successful if it fails.
- Confirmed 21 October 2026: inactive teachers are hidden only from the public
  volunteer teacher directory. They retain login, Schedule, existing lessons,
  and publishing access. Successfully publishing their next lesson automatically
  restores Active; login alone and failed publishing do not. Guest teachers
  remain visible in the Guest tab and keep teaching access.
- Delivered management uses a table (12 accounts per page), name/numeric-ID
  search, membership and participation filters, and ID/name/newest sorting.
  Columns include numeric ID, name/email, membership, teaching status,
  country, joined date, and actions. Tables scroll internally on small screens.
- Edit opens an accessible dialog for name, country, time zone, biography,
  teaching focus, hobbies, English level, and participation status. Identity,
  email, role, member numbers, and uploaded photos are not changed by this editor.
  Membership decisions remain a separate form; full account suspension blocks
  the dashboard, unlike participation status.
- With Supabase configured, the public directory uses approved real members,
  not demo teachers; inactive/unapproved teachers are excluded. Sort by completed
  lesson count descending, then name. Unconfigured development retains the
  explicitly labelled sample directory. Load errors must be visible.

### 6.3 Student management

Subtabs: Directory, Applications, Programme enrollment, Restrictions, Statistics.

- Search/filter by name/ID, level, programme/cohort, approval, active/inactive,
  banned/suspended state, restriction expiry, and policy issues.
- Separate programme participation from access restrictions and account approval.
- Confirmed 21 October 2026: study status options are Active, Inactive, Banned,
  Suspended. Any non-active study status retains login, profile/settings, and
  read-only past lesson history, but removes Schedule, availability, classroom
  access, booking, cancellation, and feedback editing. Enforce this in database
  functions as well as navigation; direct legacy calls must not bypass it.
  Restrictions are manual and indefinite until an admin restores Active.
  Automatic bans and two-week expiry remain disabled.
- Use the same table/editor as teacher management, including English level.
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

### 6.4 Academic

Subtabs: Calendar, Class audit, Attendance and feedback, Policy cases, Analytics.

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

### 6.5 System settings

Subtabs: Programme policies, Notifications and templates, Accounts and access,
Audit log, Integrations and operations.

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
  Filter by role, verification/approval, status, and signup date.
- Prevent self-escalation and accidental removal of the last approved admin.
  Recommended: reauthentication and a trusted second approval for admin-role changes.
- Application settings must not expose Supabase secret/service keys, Google
  secrets, database passwords, or email-provider credentials.
- Show failed background tasks/integration health explicitly; never mark a queued
  or failed email as delivered.

## 7. Attendance, apologies, and booking restrictions

### 7.1 Requested policy outcomes

- Student booked and did not attend, without apology: banned.
- Student booked, did not attend, and submitted an accepted apology: banned from
  booking for two weeks.
- Teacher cancelled a booked lesson: distinct cancellation outcome; no student penalty.

### 7.2 Safe enforcement workflow

- Teacher marks attendance after the lesson and any attendance grace period ends.
- A reported absence opens a policy case with evidence, reporter, timestamps, and
  the policy version applicable to the lesson.
- Notify the student and provide an apology/correction submission.
- Record apology submission separately from acceptance; submission alone must not
  silently reclassify an absence as excused.
- Recommended: an administrator confirms the case before a disciplinary restriction.
  Any interim booking hold must be explicit, reversible, and time-bounded.
- For accepted apology cases, proposed duration is exactly 14 days from the
  administrator's decision instant, stored in UTC and displayed locally.
- Restrictions block new bookings but do not erase history or prevent sign-in,
  reading decisions, contacting ABVN, submitting an apology, or appealing.
- Do not automatically cancel unrelated future bookings without an explicit policy.
  Notify administrators to resolve affected bookings.
- Expiry is enforced from timestamps at booking time, even if a background job
  fails. Expired restrictions must not continue to block eligible users.
- Corrections/appeals can overturn a finding and restore access while preserving
  an auditable record of the original decision.

### 7.3 Decisions required before enabling enforcement

1. Does "banned" without apology mean permanent, fixed duration, or escalating penalties?
2. What counts as no-show: grace period, late arrival, connectivity issue, teacher absence?
3. How long can an apology be submitted, who accepts it, and what evidence is needed?
4. Is a timely advance apology handled differently from a post-lesson apology?
5. Is a restriction automatic or administrator-confirmed? How are appeals handled?
6. Does a restriction affect existing bookings, and can the student cancel them?
7. When does the 14-day period start, and how are repeat offences handled?

Until agreed, implement reporting/review visibility but do not infer a permanent
ban or silently activate automatic disciplinary enforcement.

## 8. Data, authorization, and reliability

- Add versioned schema migrations; preserve existing real profiles, bookings,
  feedback, and IDs during dashboard migration.
- Extend lesson slots with title/description, series linkage, creator/canceller,
  cancellation reason, and timestamps.
- Store recurring-series rules separately from generated occurrences; editing a
  series must not rewrite completed or booked history silently.
- Separate teacher/student participation, account approval, attendance, apologies,
  restrictions, feedback state, and lesson lifecycle.
- Add application snapshots/private attachments, programme enrollments,
  notifications/preferences/delivery attempts, CMS revisions, policy versions,
  policy cases/appeals, and administrative audit events.
- Enforce authorization in database policies/RPCs and every server mutation.
  Deny by default; never trust frontend role controls or OAuth metadata for roles.
- Public APIs expose only publishable teacher/content fields. Student academic
  APIs exclude identity documents, financial evidence, and private contact data.
- Classroom links are participant/admin-only and inaccessible after cancellation
  to a student whose booking no longer exists.
- Validate file content, type, size, ownership, and signed-URL expiry. Keep
  recruitment evidence and private profiles out of public storage.
- Use database transactions/constraints for booking uniqueness, overlapping
  schedules, quotas, and policy checks. Concurrent booking of different slots
  must not bypass a student's weekly quota.
- Make application approval, recurrence creation, reminders, and notification
  delivery idempotent. Handle retries without duplicate approvals/classes/messages.
- Query/filter/paginate directories and histories server-side. Show counts and
  clearly distinguish empty results from failed requests.
- Recommended: refresh visible schedule changes while open, with a bounded polling
  or realtime strategy; preserve focus and in-progress input during updates.
- Avoid paid-service assumptions: use free-tier-conscious storage, bounded queries,
  and optional email integrations. Expose when email is not configured; in-app
  notifications still work. Do not promise unlimited free hosting/email.
- Security logs must not contain access tokens, meeting secrets, or uploaded documents.
- Policy enforcement must survive stale tabs, direct RPC calls, and simultaneous requests.

## 9. Delivery plan

### Phase 1: Usable dashboard foundation

- Role-specific shell/sidebar and view routes.
- Profile forms, notification center foundation, user settings.
- Week/Day/Month/Agenda calendar, detail drawer, filters, status/privacy presentation.
- Preserve current booking/cancellation/feedback flows and real data.

### Phase 2: Scheduling and academic workflow

- Cell-based creation, series preview/recurrence, conflict resolution.
- Dedicated feedback queues, histories/statistics, teacher student-directory access.
- Server-side configurable booking rules and audited academic overrides.

### Phase 3: Recruitment, content, and operations

- Teacher/student application pipelines and profile synchronization.
- CMS/live preview with explicit publishing and rollback.
- Account management, versioned settings, analytics, notification templates/delivery.

### Phase 4: Confirmed policy automation

- Apology/review/appeal workflows and restrictions after Section 7 decisions.
- Reminders, escalation, operational monitoring, and expanded accessibility testing.

Each phase needs database tests, role/privacy tests, desktop/mobile interaction
checks, and a documented rollback/migration approach before production release.

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
| AC-04 | Teacher creates from grid and from button | Same form/validation; correct prefilled local time |
| AC-05 | Publish recurring times across daylight saving | Intended local time preserved; invalid/ambiguous times explicitly resolved |
| AC-06 | Recurrence contains conflicting dates | Conflicts listed; no silent partial publishing |
| AC-07 | Two students book one slot simultaneously | Exactly one live booking; loser gets actionable feedback |
| AC-08 | One student books different slots concurrently at quota | Weekly quota cannot be exceeded |
| AC-09 | Cancel exactly at cutoff, then just before/after | Server applies strict configured boundary consistently |
| AC-10 | Teacher/student inspects another upcoming/ongoing/past class or RPC | Shared names/IDs, title/description, pictures and times; Available/Booked only before lesson end; no past status, attendance/apology, feedback, student profile or meeting links |
| AC-11 | Student opens another student's profile URL | Access denied; approved teacher/admin access follows confirmed policy |
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

## 11. Other decisions to confirm

- Initial weekly quota, registration windows, programme ages/duration, and feedback deadline.
- Week boundary and whether quota applies to lesson week or booking week.
- Whether guests can publish availability and appear publicly, and the treatment
  of existing bookings when a teacher becomes inactive.
- All-student versus taught-student-only directory visibility for teachers.
- Which personal fields may be published, profile moderation, and applicant consent.
- Recurrence horizon, maximum occurrence count, and booked-lesson rescheduling policy.
- Required versus optional feedback, edit windows, and handling teacher non-response.
- Notification retention, upload/document retention, and who may view sensitive exports.
- Hosting/email providers and free-tier operational limits before public rollout.

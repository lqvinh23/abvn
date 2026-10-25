# Teacher workspace

> **Document ID:** ABVN-FR-003
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 4
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

## 4. Teacher dashboard

### 4.1 Profile

- Edit name, country, time zone, photo, biography, teaching focus/preferences,
  languages, hobbies, and introduction video URL.
- Distinguish public profile fields from private contact/account fields.
- Validate inputs and uploads, preview the public profile, and show save state.
- Teachers cannot change approval, account role, or active/inactive/guest status.
- Recommended: draft profile editing and an administrator publishability review.
- Profile design refinement, 22 October: retain the original portrait-led teacher
  header and two-column layout, with biography, teaching focus, interests and
  community milestones on the left and introduction/statistics on the right.
  Apply this presentation to real teacher member links from the directory and
  management tables, not only sample teacher pages. Use actual published profile
  data and completed-lesson counts; show honest initials and missing-data states
  rather than sample portraits, fabricated statistics or a demo video. Private
  recruitment videos/documents must not become public implicitly. Student profile
  presentation and access rules remain unchanged.

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

- Approved teachers can browse all approved student accounts and participation
  statuses, not only students they have taught. The Active status filter is
  selected by default; teachers can choose any status or all statuses.
- Use the administrator directory's data columns, search and filters, including
  student email, but omit Edit/View actions. Support search by name, email and ID,
  and filters for status and joined month/year. Keep the table read-only.
- Academic profiles show name, member ID, level, learning goals, relevant
  attendance history, and teacher progress feedback across lessons. Show email,
  age, CV and introduction video; do not show the all-lessons table.
- Do not expose income evidence, application answers, phone, date of birth,
  address, Facebook, restriction history, or administrator disciplinary notes.
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

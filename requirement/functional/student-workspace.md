# Student workspace

> **Document ID:** ABVN-FR-004
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 5
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

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
  Default cutoff: 24 hours (Systems > Settings). Inside the cutoff the student
  must email the teacher and CC the ABVN Education Affairs (EA) team; the error
  message says so and includes the configured EA email.
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

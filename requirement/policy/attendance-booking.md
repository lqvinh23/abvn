# Attendance, apologies, and booking rules

> **Document ID:** ABVN-POL-001
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 7
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

## 7. Attendance, apologies, and booking restrictions

### 7.1 Confirmed policy outcomes (24 October 2026)

These are the default values in Systems > Settings (see
[Administrative systems](../functional/administrative-systems.md#settings)); an
admin can change them without a deployment.

- **Weekly lessons.** Two standard lessons per week. A third and fourth lesson can
  be booked only if the lesson is still available 5 hours before it starts.
- **Different teachers.** Every lesson in a week is with a different teacher.
- **Booking window.** Next week's lessons open on Saturday at 09:00 (programme time)
  of the current week.
- **Cancellation.** A booked lesson cannot be cancelled within 24 hours of its
  start. To cancel inside that period the student emails the teacher and CCs the
  ABVN Education Affairs (EA) team.
- **Feedback first.** A student cannot book another lesson until they have left
  feedback for their previous lessons.
- **Inactivity.** A student who attends no lesson for 4 consecutive weeks becomes
  Inactive.
- **Absence without apology** (teacher records No): the student is banned until an
  admin restores access.
- **Absence with apology** (teacher records No but Apologize): the student is
  suspended for 14 days; the suspension ends automatically.
- **Teacher cancelled a booked lesson:** distinct cancellation outcome; no student penalty.
- **Study period.** A student approved through recruitment studies free for 6
  months. A further 6 months is paid at 30,000 VND per lesson in a package of 10
  to 50 lessons bought at one time, paid to the bank account configured in Settings.
- **Eligibility.** Student age 16 to 25.

### 7.2 Safe enforcement workflow

The current implementation applies the configured restriction automatically when
a teacher records the attendance (no case review, evidence or apology submission
yet). The workflow below is the target for review, apology and appeal handling.

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

### 7.3 Decisions still open

The following answered questions are now built in: "banned" without apology lasts
until an admin restores access (1); the 14-day period starts when the teacher
records the absence (7, first part); a restriction is applied automatically with a
recorded reason, and an admin restores access manually, which is how a finding is
corrected (5, partly); existing bookings are kept and admins resolve them (6,
partly).

Still to decide before the automation is treated as final policy:

1. What counts as no-show: grace period, late arrival, connectivity issue, teacher absence?
2. How long can an apology be submitted, who accepts it, and what evidence is needed?
   Today "No but Apologize" is the teacher's record; the student has no apology form.
3. Is a timely advance apology handled differently from a post-lesson apology?
4. Is there a formal appeal process, and should an admin confirm a case before it
   takes effect?
5. Can the student cancel bookings that already exist when a restriction starts?
6. How are repeat offences handled (for example escalating periods)?
7. Should students and teachers be notified when an automatic restriction is applied?

Until agreed, treat the automatic restrictions as the configured default, review
them in the student's status history, and do not publish them as formal disciplinary policy.

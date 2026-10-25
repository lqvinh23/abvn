# Open decisions

> **Document ID:** ABVN-DEC-001
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 11 and later confirmed user direction
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

## 11. Other decisions to confirm

- Initial weekly quota, registration windows, programme ages/duration — resolved;
  see Resolved direction below.
- Feedback deadline (today feedback is required before the next booking, with no
  fixed deadline).
- Week boundary — resolved: Monday to Sunday in the programme time zone, and the
  quota counts the week the lesson starts in.
- Whether guests can publish availability and appear publicly, and the treatment
  of existing bookings when a teacher becomes inactive.
- Which personal fields may be published, profile moderation, and applicant consent.
- Recurrence horizon, maximum occurrence count, and booked-lesson rescheduling policy.
- Required versus optional feedback, edit windows, and handling teacher non-response.
- Notification retention, upload/document retention, and who may view sensitive exports.
- Hosting/email providers and free-tier operational limits before public rollout.


## Resolved direction

- **Programme rules and defaults** (24 October 2026): weekly lessons, booking window,
  different-teacher rule, cancellation cut-off, feedback-before-booking, automatic
  absence restrictions, inactivation, study period, paid extension, receiving bank
  account and student age range are configured in Systems > Settings with the
  defaults listed in [Administrative systems](../functional/administrative-systems.md#settings)
  and [Attendance, apologies, and booking rules](../policy/attendance-booking.md).
  The bank account details must still be entered before launch.
- **Teacher student visibility** (later user direction; date not recorded): teachers can view all student accounts and all participation statuses. The directory is read-only, includes email, and has no Actions column. The limited profile exposes age, introduction video and CV; it excludes phone, date of birth, address, Facebook, application answers, restriction history and the all-lessons table. See [Administrator member operations](../functional/admin-member-operations.md).

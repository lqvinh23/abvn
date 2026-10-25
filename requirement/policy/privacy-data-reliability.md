# Privacy, authorization, and reliability

> **Document ID:** ABVN-NFR-001
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 8
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

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

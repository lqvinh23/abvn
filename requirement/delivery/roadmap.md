# Delivery plan and roadmap

> **Document ID:** ABVN-DEL-001
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 9
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

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

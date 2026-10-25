# ABVN Requirements and Product Documentation

**Purpose:** maintained product requirements and editorial sources for ABVN's website and learning platform.

> **Important:** These documents describe approved direction, proposals, and open decisions; they do not prove a feature is implemented or a policy is legally approved. The [platform setup guide](../supabase/SETUP.md) and the application source are the references for delivered behavior.

## Document governance

### Requirement status vocabulary

- **Confirmed** — explicitly decided product behavior. It may still require implementation.
- **Proposed** — a desired behavior or recommendation awaiting approval; do not present it as current policy.
- **Decision required** — unresolved; do not choose a production default without an owner decision.
- **Implemented** — use only when verified against the current application and operational setup. A specification alone cannot confer this status.
- **Editorial draft** — public copy or factual claims needing owner verification before publication.
- **Archived** — retained for history and not authoritative.

The topic-specific dashboard documents are evolving specifications. Inherited “must” statements are target requirements unless explicitly marked as confirmed; requirements that affect safety, eligibility, limits, access, data retention, or policy remain proposals until approved and implemented.

### Language and source of truth

“Must/shall” indicates a required outcome within the stated scope; “should” is a recommendation; “may” is optional. A confirmed user preference is not automatically an approved legal or operational policy. If documents conflict, use this order: (1) a later, explicit user/owner decision recorded in a topic document; (2) the topic-specific maintained specification; (3) the product overview; (4) archived material, which is never authoritative. Record unresolved conflicts in [Open decisions](./decisions/open-decisions.md).

### Change control

1. Update the narrowest relevant topic document and any related policy or acceptance criteria.
2. Record decisions with date/context and remove them from the open list only when resolved.
3. Review linked user journeys and authorization/privacy requirements when changing role access.
4. Confirm delivered status against implementation, database migrations, and setup procedures before updating user-facing help.
5. Keep editorial facts, public claims, and policy text owner-approved and dated.

### Generating user guides and policies

Generate user guides only from behavior confirmed as implemented and visible to the intended role. Use product requirements to inform the guide, but verify the current interface and operational setup first. Generate policies only from approved decisions; do not turn proposed quotas, eligibility rules, retention periods, or editorial commitments into policy by inference. Keep internal security controls, unresolved decisions, and private operational details out of public guides.

## Current product and implementation references

| Document | Purpose |
| --- | --- |
| [Product overview](./product/product-overview.md) | Goals and scope |
| [Organization profile and public content source](./product/organization-profile.md) | Editorial draft for public-facing ABVN content; verify before use |
| [Current technical architecture](./technical/architecture.md) | Verified dependency baseline and implementation boundaries |
| [Platform setup guide](../supabase/SETUP.md) | Backend setup, migrations, upgrades, and operational acceptance |

## Functional specifications

| Document | Scope |
| --- | --- |
| [Shared workspace experience](./functional/shared-experience.md) | Shared shell and cross-role experience |
| [Calendar and lesson workflows](./functional/calendar-and-lessons.md) | Shared calendar and lesson management |
| [Teacher workspace](./functional/teacher-workspace.md) | Teacher workflows and dashboard |
| [Student workspace](./functional/student-workspace.md) | Student workflows and dashboard |
| [Public web content management](./functional/public-content.md) | CMS and public content editing |
| [Administrator member operations](./functional/admin-member-operations.md) | Teacher/student directories and administration |
| [Academic statistics](./functional/academic-statistics.md) | Statistics and reporting |
| [Administrative systems](./functional/administrative-systems.md) | System administration |
| [Recruitment workflows](./functional/recruitment.md) | Student and teacher recruitment |

## Policies, delivery, and decisions

| Document | Scope |
| --- | --- |
| [Attendance, apologies, and booking rules](./policy/attendance-booking.md) | Attendance and booking requirements; proposals are not policy until approved |
| [Privacy, authorization, and reliability](./policy/privacy-data-reliability.md) | Security, data handling, and operational quality requirements |
| [Delivery plan](./delivery/roadmap.md) | Phasing and planned work |
| [Acceptance criteria](./delivery/acceptance-criteria.md) | Outcome-based verification criteria |
| [Open decisions](./decisions/open-decisions.md) | Unresolved items and recorded resolution context |

## Compatibility links

- [`REQUIREMENTS.md`](./REQUIREMENTS.md) redirects legacy links to this catalog.
- [`DASHBOARD_REQUIREMENTS.md`](./DASHBOARD_REQUIREMENTS.md) is a dashboard-specification index.
- The original mixed PRD is retained as [archived history](./archive/legacy-prd.md).

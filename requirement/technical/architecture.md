# Current Technical Architecture

> **Document ID:** ABVN-ARC-001  \
> **Status:** Implementation reference; verify against source and setup guide before changes  \
> **Sources:** [`package.json`](../../package.json), [`README.md`](../../README.md), and [`supabase/SETUP.md`](../../supabase/SETUP.md)

---

## Current technology baseline

| Area | Current implementation |
| --- | --- |
| Web framework | Next.js 16.4.2 with the App Router |
| UI | React 19.3.0 and Tailwind CSS 4 |
| Language | TypeScript 5 |
| Authentication and data | Supabase Auth and Supabase PostgreSQL via `@supabase/ssr` and `@supabase/supabase-js` |
| File storage | Supabase Storage; profile images are private |
| Date/time handling | Luxon 3.7.2 |
| Rich text | Quill 2.0.2 |
| Tests | Node.js test runner; database integration tests use PGlite |

Dependency versions are taken from the package manifest and may change. The setup guide is the operational source of truth for environment configuration, migrations, authentication, upgrades, and acceptance procedures.

## Architecture boundaries

- Product behavior and target capabilities belong in the topic-focused functional and policy specifications.
- Setup and migration instructions belong in [`supabase/SETUP.md`](../../supabase/SETUP.md), not in product requirements.
- Authentication and authorization must be enforced by trusted server/database paths; hiding a control in the UI alone is not an access-control boundary. See [Privacy, authorization, and reliability](../policy/privacy-data-reliability.md).
- Requirements are not evidence of delivery. Use the setup guide and implementation/tests to establish what is currently available.

## Superseded technology proposals

The archived PRD mentions Next.js 14+, Prisma, Neon, NextAuth/Auth.js, and shadcn. Those are historical proposals and are not the current project baseline.

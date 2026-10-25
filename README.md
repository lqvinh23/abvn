This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Learning platform

The authenticated teacher/student/admin workflow uses Supabase PostgreSQL,
Supabase Auth (Google), and private profile-image storage. Follow the
[platform setup and acceptance guide](./supabase/SETUP.md) to create the backend,
apply the migration, configure OAuth, and bootstrap the first administrator.
Environment variable placeholders are in [`.env.example`](./.env.example).

Already have a working account? Apply the
[dashboard upgrade](./supabase/SETUP.md#existing-project-dashboard-upgrade) once
to enable the new calendar, lesson titles, member profiles and sidebar views.
The upgrade preserves existing accounts and bookings. The
[requirements catalog](./requirement/README.md) organizes product and dashboard
requirements by topic; recurrence and configurable policies are not enabled yet.
For Month view, numeric member IDs and participant photos, also apply the
[schedule preferences upgrade](./supabase/SETUP.md#schedule-preferences-upgrade-21-october-2026).
Requirements are updated alongside confirmed user design and behaviour changes.
For teacher/student tables, admin profile editing, participation restrictions,
and the live public teacher directory, apply the
[member management upgrade](./supabase/SETUP.md#member-management-upgrade-21-october-2026).
For participant-local lesson times and four attendance choices, apply the
[calendar details upgrade](./supabase/SETUP.md#calendar-details-and-attendance-upgrade-21-october-2026).
For written-only student feedback without ratings, also apply the
[written feedback upgrade](./supabase/SETUP.md#written-feedback-upgrade-21-october-2026).
For the shared class calendar with private status/feedback and deletion of
never-booked cancelled slots, also apply the
[shared calendar upgrade](./supabase/SETUP.md#shared-calendar-and-unbooked-cancellation-upgrade-21-october-2026).
For shared descriptions, participant photos/times, and upcoming Available/Booked
status while keeping past-class outcomes private, apply the
[shared class details upgrade](./supabase/SETUP.md#shared-class-details-upgrade-21-october-2026).
For the admin page/news editor, private live preview, media uploads, explicit
publishing, apply the
[web content upgrade](./supabase/SETUP.md#web-content-upgrade-21-october-2026).
For article formatting, publisher attribution and the refined news editor, also
apply the [news editor upgrade](./supabase/SETUP.md#news-editor-upgrade-22-october-2026).
For the standard Quill editor, underline validation and reliable stale-version
recovery, apply the [editor reliability fix](./supabase/SETUP.md#standard-editor-and-save-reliability-fix-22-october-2026).
For inline article images, playable YouTube embeds, combined image selection/
upload, article filters and dashboard table pagination, follow the
[article media upgrade](./supabase/SETUP.md#article-media-and-table-refinement-22-october-2026).
The versions/restore interface has been removed; internal conflict protection
and existing publication audit records remain.
For the unified formatting toolbar, alignment/colors, resizable article images
and improved click-to-play YouTube preview, apply the
[article styles upgrade](./supabase/SETUP.md#article-toolbar-styles-and-date-ranges-22-october-2026).
The news date filter supports one day or an inclusive From/To range in one box.
For **Systems → Settings** and the enforced booking, cancellation, attendance,
inactivity, study-period and eligibility rules, apply the
[programme settings migration](./supabase/SETUP.md#programme-settings-and-enforced-rules-third-migration-24-october-2026).

The app deliberately shows a setup notice until the backend is configured;
it does not simulate successful login or bookings. The configured public teacher
directory now uses real approved members; sample teachers remain only in the
unconfigured preview and legacy sample profile pages. The CMS imports the existing
sample news as its initial content; review/replace it before launch.

Run all directory, scheduling, and database integration tests with `npm test`
(Node.js 24+). The database tests use embedded PostgreSQL; live Google OAuth and
Supabase Storage still require the configured project.

## Local development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Homepage

The homepage follows this flow: introduction and application links, impact
figures, purpose and how it works, community stories, partners, links to explore
ABVN, and a final invitation to volunteer or apply as a student. Content and
section order are maintained in [`src/app/page.tsx`](./src/app/page.tsx).

## About page

The About page introduces ABVN's story and mission before explaining the
programme, values, commitments, journey, and people. A single final invitation
offers student, volunteer, and partnership routes. Introductory section links
help visitors navigate the longer page. Sections are maintained in
[`src/app/about/page.tsx`](./src/app/about/page.tsx); the interactive timeline
and SDG explorer remain separate components.

## Teacher directory

Teacher data lives in [`src/lib/teacher-profiles.ts`](./src/lib/teacher-profiles.ts).
The Active and Guest tabs default to active teachers, sort each tab by lesson count
(descending) and then name (A–Z), and shows up to 12 teachers per page.
News pagination remains at six stories per page.
The preview includes six fictional teachers so the Active tab has a second page.
Portraits fill their frames with top-aligned cropping to keep faces in view.

Activity status and `sampleDetails` are demonstration data and are labeled in the
UI. Existing biographies and lesson counts are preserved; missing biographies
use labeled sample text. Portraits are placeholders. Set a teacher's
`introVideoUrl` to their verified YouTube or Vimeo embed URL to replace the
clearly labeled demo film. Replace sample details and statuses with verified
information before publishing.

Run the focused directory and pagination tests with Node.js 24 or newer:

```bash
node --test tests/teacher-directory.test.mjs
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

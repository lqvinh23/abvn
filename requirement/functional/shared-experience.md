# Shared workspace experience

> **Document ID:** ABVN-FR-001
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 2
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

## 2. Shared layout and design

### 2.1 Dashboard shell

- Use a persistent left sidebar with expand/collapse controls.
- Expanded mode shows icons and text; collapsed mode keeps accessible labels and
  tooltips. Remember the user's preference without mixing preferences between accounts.
- Highlight the active view and expose unread/action counts where useful.
- Show the account name, profile-synced avatar, and profile access in the shell.
- Use the ABVN logo in expanded mode and its leaf mark alone when collapsed.
- The public website control is an icon-and-text button when expanded and an
  icon-only control with an accessible name when collapsed. Sign out includes
  an icon and text. Teacher and Student navigation use distinct icons.
- When an account has Admin access and a Teacher or Student role, show a
  workspace switch below the account name. Label it for the destination
  workspace (for example, "Teacher switch" or "Student switch"); do not add
  "account" to role labels.
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
- Limit UI greens across public pages and workspaces to three shared tones:
  brand green `#176b4d`, dark green `#104d37`, and pale green `#eaf4ef`.
  Use brand/dark green for primary actions, accessible focus, and selected states;
  use the pale tint for selected or semantic status backgrounds. Routine buttons,
  secondary actions, hover states, and structural borders remain neutral.
  Preserve distinct destructive and warning colors and labeled lesson statuses.
  Use the shared primary/secondary button colors rather than introducing local
  shades. Photographs, logos, and authored article content are not UI palette tokens.
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

- Use sidebar navigation (or the mobile workspace menu) as the only
  Directory/Recruitment and All accounts navigation. Do not repeat these
  links as top-of-view buttons in any directory, recruitment or systems view.
  Retain unique workflow tabs, calendar view switches and contextual Back links.
- Keep unique subsection tabs visually consistent across dashboard views:
  one white bordered rounded toolbar, a neutral segmented tab group, a
  white/green active tab, shared typography and spacing, and a right-aligned
  contextual action where needed. Use the same reusable tab bar in Recruitment
  and Academic Statistics; do not duplicate primary sidebar navigation there.
- Use the shared compact filter bar in directories, accounts,
  recruitment applications, calendar filters, content/news tables and media
  pickers: white background, subtle border, 12px labels, 14px control text,
  aligned 44px targets and an icon-only Clear filters control with tooltip and
  accessible name. Apply filters immediately on option selection; debounce text
  search immediately for loaded collections without stealing focus; use a short
  150ms debounce only for server-backed search. Remove Apply and separate Sort boxes.
  Sort by clicking column headers, with an arrow only on the active column and
  aria-sort. Directories/accounts and recruitment lists filter, sort and
  paginate their entire authorized loaded collection locally, like News, without
  an RSC/database request on each interaction. Teacher statistics use all history.
  Keep Clear inside the bar, search wider than options,
  and wrap without overflow on mobile. Preserve query parameters, row size,
  sorting, pagination resets, accessible labels and keyboard dropdown behavior.
- Keep the dashboard fixed to the viewport on desktop and mobile. Never scroll
  the outer page; tables, calendars, editor panels, profiles and dialogs scroll
  independently. Keep table headers and pagination accessible while scrolling.
  Remove routine introductory notes above views, but retain actionable errors,
  migration warnings, privacy restrictions and destructive-action confirmations.
- Table actions are icon-only, with readable hover titles, accessible names,
  keyboard focus and 44px targets. Keep destructive confirmations.
- My profile is compact and responsive. Admins edit name, country, IANA time zone,
  private picture and interview meeting link, and see their read-only account
  email. Hide biography, hobbies, teaching/learning fields and English level for
  admins without clearing their stored values. English level is student-only.
  Store admin meeting links privately and prefill newly offered interview slots;
  changing the default must not alter already created slots or bookings.
- Fit table columns to the panel, wrap long text, and align cell contents.
  On narrow screens, use labeled two-column record layouts with accessible
  header sort controls instead of horizontally scrolling wide tables.

| Teacher | Student | Administrator |
| --- | --- | --- |
| Profile | Profile | Web content |
| Schedule | Schedule | Teacher management |
| Feedback | Feedback | Student management |
| History | History | Academic / Schedule |
| Student list | Notifications | Systems |
| Notifications | Settings | |
| Settings | | |

Recommended default views: Schedule for teachers, students and administrators.
For administrators, Academic is a sidebar group with Schedule and Statistics
subsections; retain old `view=academic` links by routing them to Schedule. Show a
compact summary of the next lesson, pending actions, and important notices rather
than making users search through every tab.

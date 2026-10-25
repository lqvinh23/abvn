# Public web content management

> **Document ID:** ABVN-FR-005
> **Status:** Maintained specification
> **Source:** Dashboard specification, section 6.1
> This is an evolving product specification, not proof that a feature is implemented. See the [requirements catalog](../README.md) for interpretation and governance.

---

### 6.1 Web content

Subtabs: Landing page, About page, News, Media, Preview and publishing.

**Simplified 22 October 2026:** Web content is a collapsible sidebar group with
Landing page, About page, News, and Media links, including mobile navigation and
direct URLs. Remove the duplicate page tabs and large editor headings. Use a
compact sticky save/publish toolbar and full-width tables by default.

Landing exposes 23 major fields: welcome text/image, impact figures, purpose,
partner names/logos, and the closing invitation. About exposes 60 major fields:
introduction, story, mission/programme, founder, founding teachers and team
names/photos. Show one clearly labelled content group at a time with search
across the page's curated fields. Keep existing small labels, buttons, links,
decorative text, testimonials, journey/SDG details and section layout/order out
of the editor. Preserve all their saved values when saving/publishing; do not
reset hidden fields to defaults. Adding layout types or changing card counts
remains a source-code task. Header/footer and other public routes are not
edited here. News supports adding/editing/removing up to 100 articles, unique
slugs, dates, category choices, formatted article text, and Published/
Archived visibility. Save draft remains a separate private collection operation.
Public news lists, pagination, article pages and metadata
read published CMS content.

- News uses a compact article table with title/category/date/publisher/visibility and click-to-edit;
  media uses a thumbnail/file/actions table. Keep controls keyboard-accessible
  with at least 44px targets despite the denser layout.
- Search news by title or publisher name, combined with category, exact calendar
  day or inclusive From/To range and visibility filters. Use one date-filter
  box that opens One day/Date range choices, not separate permanent fields.
  Validate chronological ranges. Provide Clear filters and an explicit empty result.
  Filtering/sorting resets pagination without changing the article being edited.
- Place Add article in the sticky top action bar alongside preview/save/publish,
  not in a second row above the table. The all-articles view contains only the
  searchable table. Clicking a title opens a separately addressable editor page;
  replace Add article with Remove article and provide Back to all articles.
  Preserve unsaved content and the table's filters/page when navigating between
  these views. Support deep links, reload and browser Back/Forward.
  Show preview displays the news listing from the table view and the selected
  article from its editor, using the public components in both cases.
- All dashboard tables (news, media, page fields, teacher/student/account/guest
  management and recruitment applications/questions/interview slots/decision history) use the
  News-table footer: row range on the left (for example, `1–10 of 12`); a custom
  `10 rows` selector (10/25/50/100), Previous chevron, `Page 1 of 2` and Next
  chevron on the right. Always render both chevrons and disable them at their
  respective boundaries. Default to 10 rows; show `0–0 of 0`, page 1 of 1 for
  empty results. Preserve search/filter/sort parameters during server pagination,
  reset to page 1 on row-size changes, retain row size when filtering, and clamp
  shortened result sets, including PostgREST out-of-range responses. Retain
  local content edits when changing pages. Public listing pagination is separate.
- News refinements, 22 October: clicking Date toggles ascending/descending order,
  newest first by default, without changing which article is being edited.
  Category is a custom option menu (Announcements, Community, Events, Impact,
  Milestones, Partnerships, Volunteering); retain any previously saved custom
  category as an option rather than deleting it.
- Article visibility offers only Published/Archived. New articles start Archived.
  Old Draft articles become Archived without losing content; private Save draft
  and explicit Publish remain distinct. Archived articles stay off the public site.
- Combine image selection and local uploading in one thumbnail-library dialog,
  reused for cover images, page images and embedded article images. Upload and
  select in one step; include uploads in Media. Reuse private JPEG/PNG/WebP
  validation and the 2 MB cap. Remove the article alt-text field; default cover
  and embedded image descriptions to the article title.
- Use the established Quill editor with its standard Snow toolbar, not a
  hand-built visual-editor toolbar. Support normal text/heading styles, bold,
  italic, underline, strikethrough, bulleted/numbered lists, indentation, quotes,
  clear formatting, left/center/right/justified alignment, text color and
  undo/redo. Put Undo/Redo/Insert image/YouTube on the same wrapping Snow toolbar
  as the other formatting controls. Insert image is an icon-only button with an
  accessible name. Clicking an embedded image reveals corner handles for direct
  drag resizing (10–100%, preserving aspect ratio), not a separate width bar.
  Support keyboard resizing, cancellation and undo/redo. Persist alignment,
  hex text colors and percentage image widths through save/reopen and render
  them identically in preview/public pages. Provide familiar icons, accessible names,
  keyboard shortcuts, readable document spacing, and at least 44px controls.
  Store validated structured
  content, not arbitrary HTML. Render identical formatting in preview and public
  articles, with legacy plain-text content preserved. Verify format -> Save draft
  -> reload -> format retained -> repeated save, not just preview.
- Insert images at the current article cursor from the shared library/upload
  dialog. Insert a YouTube watch/share/Shorts/live/embed HTTPS link and normalize
  it to a privacy-enhanced playable embed. Reject arbitrary hosts, scripts,
  raw iframe HTML and remote image URLs. Support media-only article bodies,
  safe save/reload and matching preview/public rendering. Show a visible
  click-to-play panel with explicit 16:9 dimensions, not a blank lazy iframe.
  Load the external player only on Play, with inline/fullscreen support,
  origin/referrer information and no automatic playback before user interaction.
  Display loading and blocked/unavailable-video errors with a working
  Watch on YouTube fallback in both preview and public pages. Embedding can
  still be disallowed by YouTube, the video owner or the browser/network.
  Verify actual playback progress in a regular browser, not only iframe markup;
  explain integrated-editor browser restrictions when applicable.
  Inline uploaded images must exist before saving and become readable only when
  referenced in a Published article. Archived/draft inline images stay private.
- Use readable labels for primary actions. Table actions use consistent
  icon-only buttons with hover titles and accessible names, never unexplained
  icons.
- Display each article's publisher in the admin table and public article byline.
  The database assigns the approved publishing admin's name, never an editable
  writer input. Record the latest admin to publish a changed article; publishing
  unrelated articles does not replace existing attribution. Backfill only from
  known publication records; do not invent a writer for initial sample content.
- Preview is closed by default and opened on demand, so the editor uses all
  available width. Unsaved changes update a private, admin-authenticated iframe using the exact
  public rendering components. Desktop (1024px) and mobile (390px) are real iframe
  viewport widths; interactive carousels still work and preview links cannot
  navigate away. Invalid/incomplete drafts show an explicit preview warning.
- Save draft does not affect the public website. Publish requires confirmation,
  validates all fields server-side/in PostgreSQL, and invalidates public routes.
  Concurrent saves use version checks to avoid overwriting another admin's work.
- Save reliability refinement: synchronize refreshed saved versions only when
  the corresponding local draft is clean. For stale versions, compare the
  original/local/latest drafts and retry once only for non-conflicting changes.
  Merge separate news articles or separate page fields; do not overwrite two
  different edits to the same article. Preserve the latest publisher metadata.
  For genuine conflicts, keep local work and show persistent recovery controls:
  Download my edits, Use latest saved draft, Keep editing my version.
  Schema/setup failures must state the required migration rather than imply a
  successful save. Validator-only upgrades must not bump content versions.
- Show success/failure notices for five seconds, restarting the timer for each
  new notice. Keep confirmation prompts and unsaved-change warnings visible
  until the admin decides. Warn before leaving with unsaved edits, and retain
  unsaved values while switching sidebar content pages. Do not show or fetch a
  published versions/restore interface. Keep internal concurrency checks and
  existing publication audit records; removing UI is not a request to erase data.
- Private media bucket: JPEG/PNG/WebP up to 2 MB, checked by MIME and signature.
  Only images referenced in published page content or published news articles
  are readable publicly. Draft/archived-news images stay private; signed URLs
  expire after 60 seconds. Gallery shows the latest 100 uploads plus site images.
  Admins may remove unused uploads, but saved drafts/publications/revisions
  protect referenced files for publication audit integrity.
- The additive migration imports existing public content without changing
  members, bookings, or feedback. Missing migration/load failures are explicit;
  configured deployments never silently fall back to sample content.

- Manage editable public text/images, impact figures, partner logos, page sections,
  ordering/visibility, and news articles with slugs, categories, dates, and banners.
- Separate draft, published, and archived content.
- Provide an authenticated live preview using the same rendering components as
  the public website. Unsaved draft changes update preview without publication.
- Offer desktop/mobile preview widths, save state, and explicit Publish.
- Never expose draft previews or uploaded recruitment documents through public URLs.
- Record who published what and when; support restoring a prior published version.
- Validate images, links, alt text, article slugs, and required content.
- Do not permit arbitrary executable HTML/JavaScript or editing authentication
  configuration through the CMS.
- Use saved CMS content for public pages, not a production fallback that silently
  hides failed saves behind hard-coded sample content.

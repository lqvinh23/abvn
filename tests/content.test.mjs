import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { articleCategories, defaultContent, definitions, upgradeNewsVisibility, validateContent, validImage, validLink } from "../src/lib/content/schema.ts";
import { imageExtension } from "../src/lib/platform/image-upload.ts";
import { contentPages, editorGroups, getContentPage, sortedArticleRows, filteredArticleRows } from "../src/lib/content/editor.ts";
import { articlePlainText, paragraphsToRichText, validArticleNode } from "../src/lib/content/rich-text.ts";
import { articleToDelta, deltaToArticle } from "../src/lib/content/quill.ts";
import { mergeContentDraft, sameContent } from "../src/lib/content/merge.ts";
import { youtubeEmbedUrl } from "../src/lib/content/media.ts";
import { loadTablePage, tablePage, tablePageHref } from "../src/lib/platform/table-pagination.ts";

test("Quill standard formatting converts to safe article nodes and reloads without losing marks, headings or nested lists", () => {
  const delta = [
    {insert:"Heading"}, {insert:"\n",attributes:{header:2}},
    {insert:"Emphasis",attributes:{bold:true,italic:true,underline:true,strike:true}}, {insert:"\n"},
    {insert:"First"}, {insert:"\n",attributes:{list:"ordered"}},
    {insert:"Nested"}, {insert:"\n",attributes:{list:"bullet",indent:1}},
    {insert:"Second"}, {insert:"\n",attributes:{list:"ordered"}},
    {insert:"A quote"}, {insert:"\n",attributes:{blockquote:true}},
  ];
  const doc=deltaToArticle(delta);
  assert.equal(validArticleNode(doc),true);
  assert.deepEqual(deltaToArticle(articleToDelta(doc)),doc);
  assert.deepEqual(articlePlainText(doc),["Heading","Emphasis","First","Nested","Second","A quote"]);
  assert.equal(doc.content[1].content[0].marks.length,4);
  const news=defaultContent("news");
  news.articles[0].richText=doc;
  news.articles[0].body=articlePlainText(doc);
  assert.doesNotThrow(()=>validateContent("news",news));
  assert.throws(()=>deltaToArticle([{insert:{image:"https://example.test/x"}}]),/library image/);
  assert.throws(()=>deltaToArticle([{insert:"bad",attributes:{onclick:"alert(1)"}}]),/unsupported/);
});

test("article filters combine title or publisher search, category, exact day and visibility without losing source indices", () => {
  const news = defaultContent("news");
  news.articles[0].publisher_name = "Kevin Parker";
  const article = news.articles[0];
  const empty = { query: "", category: "", date: "", visibility: "" };
  assert.equal(filteredArticleRows(news.articles, empty).length, news.articles.length);
  for (const query of ["  KEVIN  ", "parker", article.title.toLowerCase()]) {
    assert.equal(filteredArticleRows(news.articles, { ...empty, query })[0].index, 0);
  }
  assert.deepEqual(filteredArticleRows(news.articles, { query: "Kevin", category: article.category, date: article.date, visibility: article.status }).map(row => row.index), [0]);
  assert.equal(filteredArticleRows(news.articles, { ...empty, date: "1900-01-01" }).length, 0);
  assert.ok(filteredArticleRows(news.articles, { ...empty, visibility: "archived" }).every(row => row.article.status === "archived"));
});

test("table pagination uses exact row counts and clamps empty or shortened result sets", () => {
  assert.deepEqual(tablePage(26, 2, 10), { page: 2, pages: 3, start: 10, end: 20 });
  assert.deepEqual(tablePage(26, 3, 10), { page: 3, pages: 3, start: 20, end: 26 });
  assert.deepEqual(tablePage(26, 2, 25), { page: 2, pages: 2, start: 25, end: 26 });
  assert.deepEqual(tablePage(0, 5, 10), { page: 1, pages: 1, start: 0, end: 0 });
  assert.deepEqual(tablePage(2, 5, 10), { page: 1, pages: 1, start: 0, end: 2 });
  assert.equal(tablePage(100, 1, 100).end, 100);
  assert.deepEqual(tablePage(12, 2, 10), { page: 2, pages: 2, start: 10, end: 12 });
  assert.deepEqual(tablePage(12, 0, 10), { page: 1, pages: 2, start: 0, end: 10 });
});

test("server table pagination preserves filters and replaces page and row-size parameters", () => {
  const filters = new URLSearchParams({ view: "teachers", section: "recruitment", tab: "applications", status: "application_review", q: "Nguyễn & Alex? #1", page: "2", size: "10" });
  const href = `/dashboard/admin?${filters}`;
  const next = new URL(tablePageHref(href, 3, 10), "https://example.test");
  for (const key of ["view", "section", "tab", "status", "q"]) assert.equal(next.searchParams.get(key), filters.get(key));
  assert.deepEqual(next.searchParams.getAll("page"), ["3"]);
  assert.deepEqual(next.searchParams.getAll("size"), ["10"]);
  const resized = new URL(tablePageHref(next.pathname + next.search, 1, 25), next.origin);
  assert.equal(resized.searchParams.get("page"), "1");
  assert.equal(resized.searchParams.get("size"), "25");
  assert.equal(resized.searchParams.get("q"), filters.get("q"));
  assert.equal(tablePageHref("/dashboard/admin", 1, 10), "/dashboard/admin?page=1&size=10");
  const directory = new URL(tablePageHref("/dashboard/admin?view=students&section=directory&participation=active&sort=name", 2, 50), next.origin);
  assert.equal(directory.searchParams.get("participation"), "active");
  assert.equal(directory.searchParams.get("sort"), "name");
});

test("server pagination recovers PostgREST out-of-range responses using the filtered total", async () => {
  for (const [total, lastPage] of [[26, 3], [1, 1], [0, 1]]) {
    const ranges = [];
    await assert.rejects(loadTablePage(async (from, to) => {
      ranges.push([from, to]);
      return from ? { error: { code: "PGRST103" }, count: null } : { error: null, count: total };
    }, 999999, 10, page => {
      assert.equal(page, lastPage);
      throw new Error(`Redirect page ${page}`);
    }), new RegExp(`Redirect page ${lastPage}`));
    assert.deepEqual(ranges, [[9999980, 9999989], [0, 0]]);
  }
});

test("server pagination leaves normal responses and unrelated errors intact without extra requests", async () => {
  for (const response of [{ error: null, count: 26, data: [1, 2] }, { error: { code: "42501" }, count: null, data: null }]) {
    let calls = 0;
    const actual = await loadTablePage(async (from, to) => { calls++; assert.deepEqual([from, to], [10, 19]); return response; }, 2, 10, () => assert.fail("Unexpected redirect"));
    assert.equal(actual, response);
    assert.equal(calls, 1);
  }
  const failure = { error: { code: "42501" }, count: null };
  let calls = 0;
  assert.equal(await loadTablePage(async () => ++calls === 1 ? { error: { code: "PGRST103" }, count: null } : failure, 2, 10, () => assert.fail("Unexpected redirect")), failure);
  await assert.rejects(loadTablePage(async from => from ? { error: { code: "PGRST103" }, count: null } : { error: null, count: null }, 2, 10, () => assert.fail("Unexpected redirect")), /row count could not be loaded/);
});

test("article date range is inclusive and combines with search/category/visibility, with single-day mode unchanged", () => {
  const articles = ["2026-10-01", "2026-10-15", "2026-10-22", "2026-11-01"].map((date, index) => ({ ...defaultContent("news").articles[0], date, title: `Story ${index}`, publisher_name: "Kevin", status: index === 1 ? "archived" : "published" }));
  const filters = { query: "", category: "", date: "2026-10-01", dateTo: "2026-10-22", visibility: "" };
  assert.deepEqual(filteredArticleRows(articles, filters).map(row => row.index), [2, 1, 0]);
  assert.deepEqual(filteredArticleRows(articles, { ...filters, visibility: "archived", query: "kevin" }).map(row => row.index), [1]);
  assert.deepEqual(filteredArticleRows(articles, { ...filters, dateTo: "" }).map(row => row.index), [0]);
  assert.deepEqual(filteredArticleRows(articles, { ...filters, dateTo: "2026-10-01" }).map(row => row.index), [0]);
});

test("alignment, text colors and percentage image sizes survive editor reopening and reject unsafe style values", () => {
  const delta = [
    { insert: "Centered heading", attributes: { color: "#e60000", bold: true } },
    { insert: "\n", attributes: { header: 2, align: "center" } },
    { insert: "Right paragraph" }, { insert: "\n", attributes: { align: "right" } },
    { insert: { image: "/images/learning-community.jpg" }, attributes: { width: "50%" } }, { insert: "\n" },
    { insert: "List text", attributes: { color: "#008a00" } }, { insert: "\n", attributes: { list: "bullet", align: "justify" } },
  ];
  let doc = deltaToArticle(delta);
  const initial = structuredClone(doc);
  for (let i = 0; i < 3; i++) doc = deltaToArticle(articleToDelta(doc));
  assert.deepEqual(doc, initial);
  assert.equal(doc.content[0].attrs.align, "center");
  assert.equal(doc.content[2].attrs.width, 50);
  assert.equal(doc.content[0].content[0].marks[1].attrs.color, "#e60000");
  const mixed = deltaToArticle([{ insert: "Centered text" }, { insert: { image: "/images/test.jpg" }, attributes: { width: "50%" } }, { insert: "\n", attributes: { align: "center" } }]);
  assert.equal(mixed.content[0].attrs.align, "center");
  assert.equal(mixed.content[1].attrs.width, 50);
  for (const node of [
    { type: "paragraph", attrs: { align: "evil" } },
    { type: "heading", attrs: { align: "center" } },
    { type: "image", attrs: { src: "/images/test.jpg", width: 101 } },
    { type: "image", attrs: { src: "/images/test.jpg", width: "50%" } },
    { type: "image", attrs: { src: "/images/test.jpg", width: 9 } },
    { type: "text", text: "Unsafe", marks: [{ type: "color", attrs: { color: "url(javascript:alert(1))" } }] },
  ]) assert.equal(validArticleNode({ type: "doc", content: node.type === "text" ? [{ type: "paragraph", content: [node] }] : [node] }), false);
});

test("YouTube links normalize only real video URLs to privacy-enhanced playable embeds", () => {
  const expected = "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ";
  for (const link of ["https://youtu.be/aqz-KE-bpKQ?si=test", "https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=10", "https://m.youtube.com/shorts/aqz-KE-bpKQ", expected]) {
    assert.equal(youtubeEmbedUrl(link), expected);
  }
  for (const link of ["javascript:alert(1)", "http://youtube.com/watch?v=aqz-KE-bpKQ", "https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ", "https://youtube.com/playlist?list=test", "https://youtube.com/watch?v=x", "https://user@youtube.com/watch?v=aqz-KE-bpKQ"]) assert.equal(youtubeEmbedUrl(link), null);
});

test("article media round trips repeatedly without extra paragraphs or executable embeds", () => {
  let doc = { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Before" }] },
    { type: "image", attrs: { src: "/images/learning-community.jpg" } },
    { type: "youtube", attrs: { src: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" } },
    { type: "paragraph", content: [{ type: "text", text: "After" }] },
  ] };
  const original = structuredClone(doc);
  for (let i = 0; i < 4; i++) doc = deltaToArticle(articleToDelta(doc));
  assert.deepEqual(doc, original);
  assert.deepEqual(articlePlainText(doc), ["Before", "Image", "YouTube video", "After"]);
  for (const node of [
    { type: "image", attrs: { src: "https://external.test/photo.jpg" } },
    { type: "image", attrs: { src: "/images/test.jpg", onerror: "alert(1)" } },
    { type: "youtube", attrs: { src: "https://www.youtube.com/watch?v=aqz-KE-bpKQ" } },
    { type: "youtube", attrs: { src: "javascript:alert(1)" } },
  ]) assert.equal(validArticleNode({ type: "doc", content: [node] }), false);
});

test("legacy article text, headings and empty paragraphs can open in Quill without HTML interpretation", () => {
  const doc=paragraphsToRichText(["<script>alert(1)</script>","Two"]);
  assert.deepEqual(deltaToArticle(articleToDelta(doc)),doc);
  const legacy={type:"doc",content:[{type:"paragraph"}, {type:"heading",attrs:{level:3},content:[{type:"text",text:"Heading",marks:[{type:"bold"}]}]}]};
  assert.deepEqual(deltaToArticle(articleToDelta(legacy)),legacy);
  const divider={type:"doc",content:[{type:"horizontalRule"}]};
  assert.deepEqual(deltaToArticle(articleToDelta(divider)),divider);
});

test("stale editor versions merge only non-conflicting changes, including publisher-only updates", () => {
  const base=defaultContent("news");
  const local=structuredClone(base), remote=structuredClone(base);
  local.articles[0].title="My edits";
  remote.articles[1].title="Other article edits";
  remote.articles[0].publisher_name="Admin";
  const merged=mergeContentDraft(base,local,remote);
  assert.equal(merged.articles[0].title,"My edits");
  assert.equal(merged.articles[0].publisher_name,"Admin");
  assert.equal(merged.articles[1].title,"Other article edits");
  assert.ok(mergeContentDraft(base,local,structuredClone(base)));
  remote.articles[0].title="Conflicting edits";
  assert.equal(mergeContentDraft(base,local,remote),null);
  remote.articles.shift();
  assert.equal(mergeContentDraft(base,local,remote),null);
  assert.equal(sameContent({a:1,b:{c:2}}, {b:{c:2},a:1}),true);
});

test("page version recovery preserves hidden fields and rejects overlapping edits or section changes", () => {
  const base=defaultContent("home"),local=structuredClone(base),remote=structuredClone(base);
  local.fields["home-099"]="New title";
  remote.fields["home-130"]="Changed hidden label";
  const merged=mergeContentDraft(base,local,remote);
  assert.equal(merged.fields["home-099"],"New title");
  assert.equal(merged.fields["home-130"],"Changed hidden label");
  remote.fields["home-099"]="Other title";
  assert.equal(mergeContentDraft(base,local,remote),null);
});

test("news date sorting defaults to latest, reverses, and preserves selection indices and source order", () => {
  const news = defaultContent("news");
  const original = JSON.stringify(news);
  assert.deepEqual(sortedArticleRows(news.articles).map(row => row.article.date), news.articles.map(a => a.date).sort().reverse());
  assert.deepEqual(sortedArticleRows(news.articles,false).map(row => row.article.date), news.articles.map(a => a.date).sort());
  for (const row of sortedArticleRows(news.articles,false)) assert.equal(news.articles[row.index],row.article);
  assert.equal(JSON.stringify(news),original);
  assert.ok(news.articles.every(article => articleCategories.includes(article.category)));
});

test("legacy private visibility upgrades without changing article text, categories or public visibility", () => {
  const news = defaultContent("news");
  news.articles[0].status = "draft";
  const upgraded = upgradeNewsVisibility(news);
  assert.equal(upgraded.articles[0].status,"archived");
  assert.deepEqual(upgraded.articles[0].body,news.articles[0].body);
  assert.equal(upgraded.articles[1].status,"published");
  assert.throws(() => validateContent("news",news),/Published or Archived/);
  assert.doesNotThrow(() => validateContent("news",upgraded));
});

test("article formatting permits safe structured text, lists and marks, not HTML, scripts, unknown attributes or extreme nesting", () => {
  const doc = paragraphsToRichText(["Plain <script>alert(1)</script> text"]);
  doc.content[0].content[0].marks = [{type:"bold"},{type:"italic"}];
  doc.content.push({type:"orderedList",attrs:{start:2,type:null},content:[{type:"listItem",content:[{type:"paragraph",content:[{type:"text",text:"Item"}]}]}]});
  assert.equal(validArticleNode(doc),true);
  const news=defaultContent("news");
  news.articles[0].richText=doc;
  assert.doesNotThrow(() => validateContent("news",news));
  for (const unsafe of [
    {type:"doc",content:[{type:"script",text:"alert(1)"}]},
    {type:"doc",content:[{type:"paragraph",attrs:{onclick:"alert(1)"}}]},
    {type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Link",marks:[{type:"link",attrs:{href:"javascript:alert(1)"}}]}]}]},
    {type:"doc",content:[{type:"heading",attrs:{level:99}}]},
    {type:"doc",content:[{type:"text",text:"Invalid document child"}]},
    {type:"doc",content:[{type:"bulletList",content:[{type:"paragraph"}]}]},
  ]) assert.equal(validArticleNode(unsafe),false);
  let deep={type:"paragraph"};
  for(let i=0;i<20;i++) deep={type:"blockquote",content:[deep]};
  assert.equal(validArticleNode({type:"doc",content:[deep]}),false);
});

test("content sidebar links have stable direct-link keys and safe defaults", () => {
  assert.deepEqual(contentPages.map(page => page.id), ["home", "about", "news", "media"]);
  for (const { id } of contentPages) assert.equal(getContentPage(id), id);
  for (const invalid of [null, "", "unknown", "2"]) assert.equal(getContentPage(invalid), "home");
});

test("compact editors expose only curated major fields with clear labels and valid image mappings", () => {
  for (const key of ["home", "about"]) {
    const fields = editorGroups[key].flatMap(group => group.fields);
    assert.equal(new Set(fields.map(field => field.id)).size, fields.length);
    assert.ok(fields.length < Object.keys(definitions[key].fields).length / 2);
    for (const { id, label } of fields) {
      assert.ok(definitions[key].fields[id], id);
      assert.ok(label.trim());
      assert.ok(!["→", "Image", ""].includes(label));
      if (/photo|logo|image$/i.test(label)) assert.equal(definitions[key].fields[id].type, "image", id);
    }
  }
  assert.equal(editorGroups.home.flatMap(group => group.fields).some(field => field.id === "home-130"), false);
  assert.equal(editorGroups.about.flatMap(group => group.fields).some(field => field.id === "about-075"), false);
});

test("all existing page fields, safe links and articles validate without changing initial content", () => {
  for (const key of ["home","about","news"]) assert.doesNotThrow(() => validateContent(key, defaultContent(key)));
  assert.equal(Object.keys(defaultContent("home").fields).length, 140);
  assert.equal(Object.keys(defaultContent("about").fields).length, 192);
  assert.equal(defaultContent("home").sections.length, 7);
  const copy = defaultContent("home"); copy.fields["home-001"] = "Changed";
  assert.notEqual(defaultContent("home").fields["home-001"], "Changed");
});

test("CMS rejects invalid fields, unsafe URLs, duplicate sections, slugs, dates and empty paragraphs", () => {
  const home = defaultContent("home");
  delete home.fields["home-001"];
  assert.throws(() => validateContent("home", home), /fields/);
  const page = defaultContent("home");
  page.sections.push(page.sections[0]);
  assert.throws(() => validateContent("home", page), /duplicate/);
  for (const url of ["javascript:alert(1)","//example.com","data:text/html,hi","https://x.test/\"onerror="]) assert.equal(validLink(url), false);
  for (const url of ["/about","#our-story","https://example.test","mailto:abvn@example.test"]) assert.equal(validLink(url), true);
  assert.equal(validImage("/api/content-media/00000000-0000-4000-8000-000000000000.png"), true);
  assert.equal(validImage("/images/../secret.png"), false);
  assert.equal(validImage("https://example.test/tracking.svg"), false);
  for (const patch of [{ slug:"page" }, { date:"2026-02-30" }, { body:[""] }, { status:"injected" }, { image:"javascript:alert(1)" }]) {
    const news = defaultContent("news");
    Object.assign(news.articles[0], patch);
    assert.throws(() => validateContent("news", news));
  }
  const news = defaultContent("news");
  news.articles.push(news.articles[0]);
  assert.throws(() => validateContent("news", news), /unique/);
});

test("extracted renderers contain every declared CMS field and no missing references", async () => {
  const sources = {
    home: ["../src/components/content/HomeContent.tsx"],
    about: ["../src/components/content/AboutContent.tsx","../src/components/about/JourneyTimeline.tsx","../src/components/about/SdgExplorer.tsx"],
  };
  for (const key of ["home","about"]) {
    const text = (await Promise.all(sources[key].map(path => readFile(new URL(path, import.meta.url),"utf8")))).join("\n");
    const references = new Set([...text.matchAll(/fields\["([^"]+)"\]/g)].map(match => match[1]));
    assert.deepEqual([...references].sort(), Object.keys(definitions[key].fields).sort());
  }
});

test("media upload signature checks reject spoofed file types", () => {
  assert.equal(imageExtension(Uint8Array.from([255,216,255]),"image/jpeg"), "jpg");
  assert.equal(imageExtension(Uint8Array.from([137,80,78,71,13,10,26,10]),"image/png"), "png");
  assert.equal(imageExtension(new TextEncoder().encode("RIFF0000WEBP"),"image/webp"), "webp");
  assert.equal(imageExtension(new TextEncoder().encode("<svg onload='alert(1)'>"),"image/png"), null);
  assert.equal(imageExtension(Uint8Array.from([255,216,255]),"image/svg+xml"), null);
});

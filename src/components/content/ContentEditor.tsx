"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { writeContent, uploadContentMedia, deleteContentMedia } from "@/src/app/dashboard/content-actions";
import { articleCategories, definitions, type ContentBody, type ContentDocument, type ContentKey, type EditableArticle } from "@/src/lib/content/schema";
import { Field, Select, TextArea } from "@/src/components/platform/Fields";
import { editorGroups, getContentPage, filteredArticleRows, type ArticleFilters } from "@/src/lib/content/editor";
import ArticleEditor from "./ArticleEditor";
import { sameContent } from "@/src/lib/content/merge";
import PaginatedTable from "@/src/components/platform/PaginatedTable";
import ActionIcon from "@/src/components/platform/ActionIcon";
import ImagePicker from "./ImagePicker";
import ArticleDateFilter from "./ArticleDateFilter";

const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50";
const button = `${buttonBase} border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
const primary = `${buttonBase} border-green-800 bg-green-800 text-white hover:bg-green-900`;
const labels = { home: "Landing page", about: "About page", news: "News" };
const cellInput = "block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:outline-2 focus:outline-green-800";

function MediaImage({ path }: { path: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p role="status" className="p-2 text-xs text-red-800">Image unavailable. Refresh to retry.</p> : <Image src={path} alt="Content library image" width={80} height={56} unoptimized onError={() => setFailed(true)} className="h-14 w-20 rounded bg-slate-100 object-contain" />;
}

export default function ContentEditor({ documents, media }: {
  documents: ContentDocument[]; media: string[];
}) {
  const [drafts, setDrafts] = useState(() => Object.fromEntries(documents.map(doc => [doc.key, doc.draft])));
  const [versions, setVersions] = useState(() => Object.fromEntries(documents.map(doc => [doc.key, doc.version])));
  const [saved, setSaved] = useState(() => Object.fromEntries(documents.map(doc => [doc.key, JSON.stringify(doc.draft)])));
  const [loadedDocuments, setLoadedDocuments] = useState(documents);
  const [conflict, setConflict] = useState<{ key: ContentKey; body: ContentBody; version: number } | null>(null);
  const searchParams = useSearchParams();
  const selectedPage = getContentPage(searchParams.get("page"));
  const active: ContentKey = selectedPage === "media" ? "home" : selectedPage;
  const tab = selectedPage === "media" ? "media" : "editor";
  const [groupLabel, setGroupLabel] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [search, setSearch] = useState("");
  const articleSlug = searchParams.get("article");
  const newsDraft = drafts.news;
  const articleIndex = "articles" in newsDraft ? newsDraft.articles.findIndex(article => article.slug === articleSlug) : -1;
  const editingArticle = active === "news" && articleSlug !== null;
  function articleLocation(slug?: string, replace = false) {
    const url = new URL(location.href);
    if (slug === undefined) url.searchParams.delete("article");
    else url.searchParams.set("article", slug);
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    setConfirm(null);
  }
  const [articleFilters, setArticleFilters] = useState<ArticleFilters>({ query: "", category: "", date: "", visibility: "" });
  const [editorRevision, setEditorRevision] = useState(0);
  if (documents !== loadedDocuments) {
    setLoadedDocuments(documents);
    for (const document of documents) {
      if (document.version === versions[document.key] || !sameContent(drafts[document.key], JSON.parse(saved[document.key]))) continue;
      setDrafts(previous => ({ ...previous, [document.key]: document.draft }));
      setVersions(previous => ({ ...previous, [document.key]: document.version }));
      setSaved(previous => ({ ...previous, [document.key]: JSON.stringify(document.draft) }));
      if (document.key === "news") {
        setEditorRevision(value => value + 1);
      }
    }
  }
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState<{ page: typeof selectedPage; result: { ok: boolean; message: string } } | null>(null);
  const message = notice?.page === selectedPage ? notice.result : null;
  function setMessage(result: { ok: boolean; message: string } | null) {
    setNotice(result ? { page: selectedPage, result } : null);
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [confirmation, setConfirmation] = useState<{ key: ContentKey; type: "publish" | "remove" } | null>(null);
  const confirm = confirmation?.key === active ? confirmation.type : null;
  function setConfirm(type: "publish" | "remove" | null) {
    setConfirmation(type ? { key: active, type } : null);
  }
  const [pending, startTransition] = useTransition();
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [removedMedia, setRemovedMedia] = useState<string[]>([]);
  const [removeMedia, setRemoveMedia] = useState<string | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const allowLeave = useRef(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  const body = drafts[active];
  const dirty = JSON.stringify(body) !== saved[active];
  const hasUnsaved = Object.entries(drafts).some(([key, value]) => JSON.stringify(value) !== saved[key]);
  const previewArticle = editingArticle ? articleIndex : null;
  const preview = useRef({ key: active, body, article: previewArticle });
  useEffect(() => {
    preview.current = { key: active, body, article: previewArticle };
    iframe.current?.contentWindow?.postMessage({ type: "abvn-content-preview", ...preview.current }, location.origin);
  }, [active, body, previewArticle]);
  useEffect(() => {
    function ready(event: MessageEvent) {
      if (event.origin === location.origin && event.source === iframe.current?.contentWindow && event.data?.type === "abvn-preview-ready") {
        iframe.current.contentWindow?.postMessage({ type: "abvn-content-preview", ...preview.current }, location.origin);
      }
    }
    addEventListener("message", ready);
    return () => removeEventListener("message", ready);
  }, []);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (hasUnsaved && !allowLeave.current) event.preventDefault(); }
    function navigate(event: MouseEvent) {
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a") : null;
      if (!hasUnsaved || !anchor || anchor.target === "_blank" || anchor.href === location.href || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const destination = new URL(anchor.href);
      if (destination.origin === location.origin && destination.pathname === "/dashboard/admin" && destination.searchParams.get("view") === "content") return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveHref(anchor.href);
    }
    addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    return () => { removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [hasUnsaved]);
  const images = [...new Set([...uploaded, ...media, ...Object.values(definitions).flatMap(def => Object.values(def.fields).filter(field => field.type === "image").map(field => field.value))])].filter(path => !removedMedia.includes(path));
  function update(next: ContentBody) {
    setDrafts(previous => ({ ...previous, [active]: next }));
    setMessage(null);
    setConfirm(null);
  }
  function updateField(id: string, value: string) {
    if ("fields" in body) update({ ...body, fields: { ...body.fields, [id]: value } });
  }
  function updateArticle(patch: Partial<EditableArticle>) {
    if (patch.slug !== undefined) articleLocation(patch.slug, true);
    setDrafts(previous => {
      const news = previous.news;
      return "articles" in news ? { ...previous, news: { articles: news.articles.map((article, index) => index === articleIndex ? { ...article, ...patch, imageAlt: patch.title ?? article.title } : article) } } : previous;
    });
    setMessage(null);
    setConfirm(null);
  }
  function addArticle() {
    if (!("articles" in body)) return;
    const slug = `new-story-${crypto.randomUUID().slice(0,8)}`;
    update({ articles: [...body.articles, { slug, title: "New community story", category: "Community", date: new Date().toISOString().slice(0,10), summary: "Add a short introduction to your story.", image: "/images/learning-community.jpg", imageAlt: "New community story", body: ["Write your article here."], status: "archived" }] });
    articleLocation(slug);
  }
  function save(publish: boolean) {
    const key = active;
    const snapshot = "articles" in body ? { articles: body.articles.map(article => ({ ...article, imageAlt: article.title })) } : body;
    startTransition(async () => {
      const result = await writeContent(key, snapshot, versions[key], publish, JSON.parse(saved[key]));
      setMessage(result);
      if (result.ok && result.version !== undefined) {
        setVersions(previous => ({ ...previous, [key]: result.version }));
        setSaved(previous => ({ ...previous, [key]: JSON.stringify(result.body) }));
        setDrafts(previous => ({ ...previous, [key]: result.body }));
        setConflict(null);
        if (key === "news" && "articles" in snapshot && "articles" in result.body) {
          if (!sameContent(snapshot, result.body)) setEditorRevision(value => value + 1);
        }
      }
      if (result.conflict) setConflict(result.conflict);
      setConfirm(null);
    });
  }
  function imagePicker(value: string, change: (path: string) => void, label = "Choose image", id?: string) {
    return <ImagePicker iconOnly={Boolean(id)} id={id} label={label} value={value} images={images} onSelect={change} onUploaded={path => setUploaded(previous => [path, ...previous])} />;
  }
  const article = "articles" in body ? body.articles[articleIndex] : undefined;
  const groups = active === "news" ? [] : editorGroups[active];
  const currentGroup = groups.find(group => group.label === groupLabel) ?? groups[0];
  return <div className="workspace-stack">
    {conflict && conflict.key === active ? <section role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3"><p className="text-sm">This article or page was also changed in the saved draft. Your unsaved edits are still in the editor. Download them before loading the latest saved version.</p><div className="flex flex-wrap gap-2"><button className={button} onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(body,null,2)], {type:"application/json"})); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `abvn-${active}-unsaved.json`; anchor.click(); URL.revokeObjectURL(url); }}>Download my edits</button><button className={button} onClick={() => { setDrafts(previous => ({...previous,[active]:conflict.body})); setVersions(previous => ({...previous,[active]:conflict.version})); setSaved(previous => ({...previous,[active]:JSON.stringify(conflict.body)})); setEditorRevision(value => value+1); setConflict(null); }}>Use latest saved draft</button><button className={button} onClick={() => setConflict(null)}>Keep editing my version</button></div></section> : null}
    {leaveHref ? <section role="alert" className="sticky top-0 z-40 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="flex-1 text-sm">You have unsaved content. Leave without saving?</p><button className={button} onClick={() => setLeaveHref(null)}>Keep editing</button><button className={button} onClick={() => { allowLeave.current = true; location.assign(leaveHref); }}>Leave without saving</button></section> : null}
    {message ? <p role={message.ok ? "status" : "alert"} className={`rounded-xl border p-4 ${message.ok ? "border-green-200 bg-green-50 text-green-950" : "border-red-200 bg-red-50 text-red-900"}`}>{message.message}</p> : null}
    {tab === "media" ? <section aria-label="Website media library" className="workspace-stack rounded-xl border border-slate-200 bg-white p-3">
      <form action={form => { startTransition(async () => { const result = await uploadContentMedia(form); setMessage(result); if (result.ok && result.path) setUploaded(previous => [result.path!, ...previous]); }); }} className="flex flex-wrap items-end gap-3"><Field compact label="Upload image (JPEG, PNG, WebP · 2 MB)" name="image" type="file" accept="image/jpeg,image/png,image/webp" required /><button disabled={pending} className={primary}><ActionIcon name="upload" />{pending ? "Uploading..." : "Upload image"}</button></form>
      <PaginatedTable caption="Website images" columns={3} headers={<tr><th className="p-2">Image</th><th className="p-2">File</th><th className="p-2">Actions</th></tr>}>{images.map(path => <tr key={path}><td className="w-24 p-2"><MediaImage path={path} /></td><td className="max-w-40 break-all p-2 text-xs text-slate-600">{path.replace("/images/", "").replace("/api/content-media/", "")}</td><td className="p-2">{path.startsWith("/api/content-media/") ? removeMedia === path ? <div className="space-y-2"><p className="text-xs text-red-800">Permanently remove this unused upload?</p><button disabled={pending} className="workspace-icon-action" title="Confirm removal" aria-label="Confirm removal" onClick={() => {
        if (Object.values(drafts).some(draft => JSON.stringify(draft).includes(path))) { setMessage({ ok:false, message:"This image is used in an open draft. Replace it there first." }); setRemoveMedia(null); return; }
        startTransition(async () => { const result = await deleteContentMedia(path); setMessage(result); if(result.ok) setRemovedMedia(previous => [...previous,path]); setRemoveMedia(null); });
      }}><ActionIcon name="trash" /></button><button className="workspace-icon-action" title="Keep image" aria-label="Keep image" onClick={() => setRemoveMedia(null)}><ActionIcon name="close" /></button></div> : <button className="workspace-icon-action" title="Remove unused upload" aria-label="Remove unused upload" onClick={() => setRemoveMedia(path)}><ActionIcon name="trash" /></button> : <span className="text-xs text-slate-500">Built-in</span>}</td></tr>)}</PaginatedTable>
    </section> : <>
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <p role="status" className="px-1 text-sm font-medium text-slate-600">{labels[active]} · {dirty ? "Unsaved changes" : "Draft saved"}</p>
        <div className="flex flex-wrap gap-2">{active === "news" && "articles" in body ? editingArticle ? <><button type="button" className={button} onClick={() => articleLocation()}><ActionIcon name="left" />Back to all articles</button>{article ? <button type="button" className={`${button} text-red-800`} disabled={pending} onClick={() => setConfirm("remove")}><ActionIcon name="trash" />Remove article</button> : null}</> : <button type="button" className={button} disabled={pending || body.articles.length >= 100} onClick={addArticle}><ActionIcon name="plus" />Add article</button> : null}<a href={active === "home" ? "/" : editingArticle && article ? `/news/${article.slug}` : `/${active}`} target="_blank" rel="noreferrer" className={button}><ActionIcon name="external" />View website</a><button className={button} aria-expanded={showPreview} onClick={() => setShowPreview(value => !value)}><ActionIcon name="eye" />{showPreview ? "Hide preview" : "Show preview"}</button><button disabled={pending} className={button} onClick={() => save(false)}><ActionIcon name="save" />{pending ? "Saving..." : "Save draft"}</button><button disabled={pending} className={primary} onClick={() => setConfirm("publish")}><ActionIcon name="publish" />Publish changes</button></div>
      </div>
      {confirm === "publish" ? <section role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="flex-1 text-sm">Publish {labels[active]} now? This replaces the live version. Archived news stays hidden.</p><button disabled={pending} className={primary} onClick={() => save(true)}>Confirm publish</button><button className={button} onClick={() => setConfirm(null)}>Keep editing</button></section> : null}
      {confirm === "remove" && editingArticle && "articles" in body && article ? <section role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4"><p className="flex-1 text-sm text-red-900">Remove this article from the draft? It disappears from the live website only after publishing.</p><button disabled={pending} className={button} onClick={() => { update({ articles: body.articles.filter((_, index) => index !== articleIndex) }); articleLocation(); }}><ActionIcon name="trash" />Confirm remove article</button><button className={button} onClick={() => setConfirm(null)}>Keep article</button></section> : null}
      <div className={`workspace-cms-grid grid items-stretch gap-3 ${showPreview ? "2xl:grid-cols-[minmax(360px,1fr)_minmax(0,1fr)]" : ""}`}>
        <section aria-label="Content editor" className={`workspace-stack rounded-xl border border-slate-200 bg-white p-3 ${editingArticle ? "workspace-article-editor" : ""}`}>
          <fieldset disabled={pending} className={editingArticle ? "min-w-0 space-y-3" : "workspace-cms-fields"}>
          {"fields" in body && active !== "news" ? <>
            <div role="group" aria-label="Page content filters" className="workspace-filter-bar"><Field compact label="Find content" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search major content across groups" /><Select compact label="Content group" value={currentGroup.label} onValueChange={value => { setGroupLabel(value); setSearch(""); }}>{groups.map(group => <option key={group.label} value={group.label}>{group.label}</option>)}</Select><button type="button" className="workspace-filter-clear" title="Clear filters" aria-label="Clear filters" onClick={() => { setSearch(""); setGroupLabel(""); }}><ActionIcon name="close" /></button></div>
            <PaginatedTable caption={`${labels[active]} major content`} columns={2} resetKey={`${active}:${currentGroup.label}:${search}`} tableClassName="table-fixed border-collapse" headers={<tr><th className="w-[30%] px-3 py-2">Content</th><th className="px-3 py-2">Edit value</th></tr>}>
              {(search ? groups : [currentGroup]).flatMap(group => group.fields).filter(field => `${field.label} ${body.fields[field.id]}`.toLowerCase().includes(search.toLowerCase())).map(({id, label}) => <tr key={id}><th scope="row" className="break-words px-3 py-2 align-top font-medium"><label htmlFor={`edit-${id}`}>{label}</label></th><td className="px-2 py-2">{definitions[active].fields[id].type === "image" ? <div className="flex flex-wrap items-center gap-2"><Image src={body.fields[id]} alt="" width={64} height={48} unoptimized className="h-12 w-16 rounded object-contain" /><div className="min-w-0 flex-1">{imagePicker(body.fields[id], value => updateField(id, value), label, `edit-${id}`)}</div></div> : <textarea id={`edit-${id}`} aria-label={label} value={body.fields[id]} onChange={event => updateField(id,event.target.value)} rows={body.fields[id].length > 100 ? 3 : 1} maxLength={6000} className={cellInput} />}</td></tr>)}
            </PaginatedTable>
          </> : "articles" in body ? <>
            <div hidden={editingArticle} className={editingArticle ? "" : "workspace-stack"}>
            <div role="group" aria-label="Article filters" className="workspace-filter-bar">
              <Field compact label="Search title or publisher" type="search" placeholder="Title or name..." value={articleFilters.query} onChange={event => setArticleFilters(previous => ({ ...previous, query: event.target.value }))} />
              <Select compact label="Filter category" value={articleFilters.category} onValueChange={category => setArticleFilters(previous => ({ ...previous, category }))}><option value="">All categories</option>{[...new Set([...articleCategories, ...body.articles.map(item => item.category)])].map(category => <option key={category} value={category}>{category}</option>)}</Select>
              <ArticleDateFilter from={articleFilters.date} to={articleFilters.dateTo ?? ""} onChange={(date, dateTo) => setArticleFilters(previous => ({ ...previous, date, dateTo }))} />
              <Select compact label="Filter visibility" value={articleFilters.visibility} onValueChange={visibility => setArticleFilters(previous => ({ ...previous, visibility }))}><option value="">All visibility</option><option value="published">Published</option><option value="archived">Archived</option></Select>
              <button type="button" className="workspace-filter-clear" title="Clear filters" aria-label="Clear filters" onClick={() => setArticleFilters({ query: "", category: "", date: "", visibility: "" })}><ActionIcon name="close" /></button>
            </div>
            <PaginatedTable caption="News articles" columns={5} initialSort={{index:2,descending:true}} tableClassName="min-w-[760px]" resetKey={JSON.stringify(articleFilters)} headers={<tr><th className="w-[40%] p-2">Article</th><th className="p-2">Category</th><th className="p-2">Date</th><th className="p-2">Publisher</th><th className="p-2">Visibility</th></tr>}>{filteredArticleRows(body.articles,articleFilters).map(({article:item,index}) => <tr key={index}><td className="p-2"><a href={`/dashboard/admin?view=content&page=news&article=${encodeURIComponent(item.slug)}`} className="inline-flex min-h-11 items-center text-left font-medium text-green-900 underline decoration-green-200 underline-offset-4" onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); articleLocation(item.slug); }}>{item.title}</a></td><td className="p-2 text-xs">{item.category}</td><td className="whitespace-nowrap p-2 text-xs">{item.date}</td><td className="p-2 text-xs">{item.publisher_name || (item.status === "published" ? "Not recorded" : "Not published yet")}</td><td className="p-2 capitalize">{item.status}</td></tr>)}</PaginatedTable>
            </div>
            {editingArticle ? article ? <>
              <div className="grid gap-3 sm:grid-cols-2">
              <Field compact label="Article title" value={article.title} maxLength={200} onChange={event => updateArticle({ title: event.target.value })} />
              <Field compact label="URL slug" title="Lowercase words and hyphens. Changing a published slug changes its URL." value={article.slug} maxLength={100} onChange={event => updateArticle({ slug: event.target.value })} />
              <Select compact label="Category" value={article.category} onValueChange={category => updateArticle({ category })}>{[...new Set([...articleCategories,article.category])].map(category => <option key={category} value={category}>{category}</option>)}</Select><Field compact label="Article date" type="date" value={article.date} onChange={event => updateArticle({ date: event.target.value })} />
              <Select compact label="Article visibility when collection is published" value={article.status} onValueChange={value => { if (value === "published" || value === "archived") updateArticle({ status: value }); }}><option value="published">Published</option><option value="archived">Archived</option></Select>
              {imagePicker(article.image, value => updateArticle({ image: value }))}
              </div>
              <p className="text-xs text-slate-600">Publisher: {article.publisher_name || "Assigned when an admin publishes this article."}</p>
              <TextArea compact label="Summary" value={article.summary} maxLength={1000} rows={2} onChange={event => updateArticle({ summary: event.target.value })} />
              <ArticleEditor key={`${articleIndex}:${editorRevision}`} content={article.richText} paragraphs={article.body} title={article.title} images={images} onUploaded={path => setUploaded(previous => [path, ...previous])} disabled={pending} onValidation={message => setMessage({ok:false,message})} onChange={(richText, body) => updateArticle({richText,body})} />
            </> : <p role="alert">This article is not in the current draft. Return to all articles to select another story.</p> : null}
          </> : null}
          </fieldset>
        </section>
        {showPreview ? <section aria-label="Private live preview" className="workspace-stack">
          <div className="flex flex-wrap items-center justify-end gap-2"><button className={!mobile ? primary : button} aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button><button className={mobile ? primary : button} aria-pressed={mobile} onClick={() => setMobile(true)}>Mobile</button></div>
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-300 bg-slate-100 p-2"><iframe ref={iframe} src="/dashboard/content-preview" title="Private website content preview" className="mx-auto h-full min-h-[300px] border-0 bg-white" style={{ width: mobile ? 390 : 1024 }} /></div>
        </section> : null}
      </div>
    </>}
  </div>;
}

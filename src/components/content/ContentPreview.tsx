"use client";

import { useEffect, useState } from "react";
import HomeContent from "./HomeContent";
import AboutContent from "./AboutContent";
import NewsArticleContent from "./NewsArticleContent";
import NewsPageHeader from "@/src/components/news/NewsPageHeader";
import NewsListingContent from "@/src/components/news/NewsListingContent";
import { sortedArticleRows } from "@/src/lib/content/editor";
import { validateContent, type ContentBody, type ContentKey } from "@/src/lib/content/schema";

export default function ContentPreview() {
  const [preview, setPreview] = useState<{ key: ContentKey; body: ContentBody; article: number | null } | null>(null);
  const [newsPage, setNewsPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== parent || event.data?.type !== "abvn-content-preview") return;
      const { key, body, article } = event.data;
      if (!["home","about","news"].includes(key)) return;
      try { validateContent(key, body); }
      catch (failure) {
        setError(failure instanceof Error ? failure.message : "Invalid preview content.");
        return;
      }
      setError("");
      setPreview({ key, body, article: Number.isInteger(article) ? article : null });
    }
    addEventListener("message", receive);
    parent.postMessage({ type: "abvn-preview-ready" }, location.origin);
    return () => removeEventListener("message", receive);
  }, []);
  if (error) return <p role="alert" className="p-6 text-red-800">Preview paused: {error}</p>;
  if (!preview) return <p className="p-6 text-slate-600">Preparing private preview...</p>;
  const { key, body, article } = preview;
  return <div onClickCapture={event => { const link = event.target instanceof Element ? event.target.closest("a") : null; if (link && link.target !== "_blank") event.preventDefault(); }}>
    {"fields" in body ? key === "home" ? <HomeContent content={body} /> : <AboutContent content={body} /> : article === null ? <main><NewsPageHeader /><NewsListingContent articles={sortedArticleRows(body.articles).map(row => row.article).filter(item => item.status === "published")} page={newsPage} onPageChange={setNewsPage} /></main> : body.articles[article] ? <NewsArticleContent article={body.articles[article]} /> : <p className="p-6">Select or create an article to preview.</p>}
  </div>;
}

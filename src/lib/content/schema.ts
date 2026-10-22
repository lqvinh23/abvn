import { pageDefinitions } from "./page-definitions.ts";
import type { NewsArticle } from "../news-articles.ts";
import { newsArticles } from "../news-articles.ts";
import { validArticleNode, type ArticleNode } from "./rich-text.ts";
import { validImage } from "./media.ts";
export { validImage } from "./media.ts";

export const articleCategories = ["Announcements", "Community", "Events", "Impact", "Milestones", "Partnerships", "Volunteering"] as const;
export type ContentKey = "home" | "about" | "news";
export type PageContent = { fields: Record<string, string>; sections: string[] };
export type EditableArticle = NewsArticle & { imageAlt: string; status: "published" | "archived"; publisher_name?: string; richText?: ArticleNode };
export type NewsContent = { articles: EditableArticle[] };
export type ContentBody = PageContent | NewsContent;
export type ContentDocument = {
  key: ContentKey; draft: ContentBody; version: number; published_at: string | null;
};
export type ContentRevision = {
  id: number; key: ContentKey; body: ContentBody; published_at: string; publisher_name: string;
};
export type FieldDefinition = { value: string; type: string; group: string; label: string };
export class ContentValidationError extends Error {}
export const definitions: Record<"home" | "about", { fields: Record<string, FieldDefinition>; sections: readonly { id: string; label: string }[] }> = pageDefinitions;

export function upgradeNewsVisibility(body: ContentBody): ContentBody {
  return "articles" in body ? { articles: body.articles.map(article => String(article.status) === "draft" ? { ...article, status: "archived" } : article) } : body;
}

export function defaultContent(key: ContentKey): ContentBody {
  if (key === "news") return { articles: newsArticles.map(article => ({ ...article, body: [...article.body], imageAlt: article.title, status: "published" })) };
  return {
    fields: Object.fromEntries(Object.entries(definitions[key].fields).map(([id, field]) => [id, field.value])),
    sections: definitions[key].sections.map(section => section.id),
  };
}

export function validLink(value: string) {
  return /^\/[a-zA-Z0-9/_-]*$/.test(value) || /^#[a-zA-Z0-9_-]+$/.test(value)
    || /^mailto:[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
    || /^https:\/\/[^\s<>"\\]+$/.test(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateContent(key: ContentKey, value: unknown): asserts value is ContentBody {
  if (!record(value)) throw new ContentValidationError("Content must be an object.");
  if (JSON.stringify(value).length > 400000) throw new ContentValidationError("Content is too large.");
  if (key !== "news") {
    if (!record(value.fields) || !Array.isArray(value.sections)) throw new ContentValidationError("Invalid page content.");
    const expected = definitions[key];
    if (Object.keys(value.fields).length !== Object.keys(expected.fields).length) throw new ContentValidationError("Page fields have changed. Refresh the editor.");
    for (const [id, field] of Object.entries(expected.fields)) {
      const text = value.fields[id];
      if (typeof text !== "string" || (field.value.trim() !== "" && !text.trim()) || text.length > 6000) throw new ContentValidationError(`Check "${field.label}" (required, maximum 6,000 characters).`);
      if (field.type === "image" && !validImage(text)) throw new ContentValidationError("Choose a library image or a valid existing site image.");
      if (field.type === "link" && !validLink(text)) throw new ContentValidationError("Use a site path, page anchor, HTTPS link, or email link.");
    }
    const ids = expected.sections.map(section => section.id);
    if (!value.sections.length || value.sections.some(id => typeof id !== "string" || !ids.includes(id)) || new Set(value.sections).size !== value.sections.length) throw new ContentValidationError("Choose at least one section, with no duplicate sections.");
  } else {
    if (!Array.isArray(value.articles) || value.articles.length > 100) throw new ContentValidationError("A maximum of 100 articles is supported.");
    const slugs = new Set<string>();
    for (const article of value.articles) {
      if (!record(article)) throw new ContentValidationError("Invalid news article.");
      for (const [field, max] of [["slug", 100], ["title", 200], ["category", 60], ["summary", 1000], ["imageAlt", 250]] as const) {
        if (typeof article[field] !== "string" || !article[field].trim() || article[field].length > max) throw new ContentValidationError(`Check article ${field} (required, maximum ${max} characters).`);
      }
      const slug = String(article.slug);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === "page" || slugs.has(slug)) throw new ContentValidationError("Article slugs must be unique, lowercase, hyphen-separated, and not 'page'.");
      slugs.add(slug);
      if (typeof article.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(article.date) || !Number.isFinite(Date.parse(article.date)) || new Date(article.date).toISOString().slice(0,10) !== article.date) throw new ContentValidationError("Choose a valid article date.");
      if (typeof article.image !== "string" || !validImage(article.image)) throw new ContentValidationError("Choose a valid article image.");
      if (!["published", "archived"].includes(String(article.status))) throw new ContentValidationError("Choose Published or Archived.");
      if (article.publisher_name !== undefined && (typeof article.publisher_name !== "string" || article.publisher_name.length > 200)) throw new ContentValidationError("Invalid publisher name.");
      if (article.richText !== undefined && !validArticleNode(article.richText)) throw new ContentValidationError("The article contains unsupported formatting.");
      if (!Array.isArray(article.body) || !article.body.length || article.body.length > 100 || article.body.some(p => typeof p !== "string" || !p.trim() || p.length > 10000)) throw new ContentValidationError("Add article paragraphs (maximum 10,000 characters each).");
    }
  }
}

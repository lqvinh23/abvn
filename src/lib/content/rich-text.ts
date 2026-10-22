import { validImage, youtubeEmbedUrl } from "./media.ts";

export type ArticleNode = {
  type: "doc" | "paragraph" | "heading" | "bulletList" | "orderedList" | "listItem" | "blockquote" | "hardBreak" | "horizontalRule" | "text" | "image" | "youtube";
  content?: ArticleNode[];
  text?: string;
  attrs?: { level?: number; start?: number; type?: null; src?: string; width?: number; align?: "center" | "right" | "justify" };
  marks?: { type: "bold" | "italic" | "underline" | "strike" | "color"; attrs?: { color: string } }[];
};

const blocks = ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "image", "youtube"];
const inline = ["text", "hardBreak"];

export function validArticleNode(value: unknown, depth = 0, parent?: string): value is ArticleNode {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 12) return false;
  const node = value as Record<string, unknown>;
  if (Object.keys(node).some(key => !["type", "content", "text", "attrs", "marks"].includes(key))) return false;
  const allowed = !parent ? ["doc"] : ["paragraph", "heading"].includes(parent) ? inline
    : ["bulletList", "orderedList"].includes(parent) ? ["listItem"] : blocks;
  if (typeof node.type !== "string" || !allowed.includes(node.type)) return false;
  if (node.type === "image" || node.type === "youtube") {
    if (node.content !== undefined || node.text !== undefined || node.marks !== undefined || !node.attrs || typeof node.attrs !== "object" || Array.isArray(node.attrs)) return false;
    const attrs = node.attrs as Record<string, unknown>;
    return Object.keys(attrs).every(key => key === "src" || (node.type === "image" && key === "width"))
      && (attrs.width === undefined || (Number.isInteger(attrs.width) && Number(attrs.width) >= 10 && Number(attrs.width) <= 100))
      && typeof attrs.src === "string"
      && (node.type === "image" ? validImage(attrs.src) : youtubeEmbedUrl(attrs.src) === attrs.src);
  }
  if (node.type === "text") {
    if (typeof node.text !== "string" || !node.text.length || node.text.length > 10000 || node.content !== undefined || node.attrs !== undefined) return false;
    return node.marks === undefined || (Array.isArray(node.marks) && node.marks.length <= 5 && node.marks.every(mark =>
      mark && typeof mark === "object" && (mark.type === "color"
        ? Object.keys(mark).length === 2 && mark.attrs && typeof mark.attrs === "object" && Object.keys(mark.attrs).length === 1 && typeof mark.attrs.color === "string" && /^#[0-9a-fA-F]{6}$/.test(mark.attrs.color)
        : Object.keys(mark).length === 1 && ["bold", "italic", "underline", "strike"].includes(mark.type))));
  }
  if (node.text !== undefined || node.marks !== undefined) return false;
  if (node.attrs !== undefined) {
    if (!node.attrs || typeof node.attrs !== "object" || Array.isArray(node.attrs)) return false;
    const attrs = node.attrs as Record<string, unknown>;
    if (node.type === "paragraph" || node.type === "heading") {
      if (Object.keys(attrs).some(key => key !== "align" && !(node.type === "heading" && key === "level"))) return false;
      if (attrs.align !== undefined && !["center", "right", "justify"].includes(String(attrs.align))) return false;
      if (node.type === "heading" && (!Number.isInteger(attrs.level) || ![2, 3].includes(Number(attrs.level)))) return false;
    } else if (node.type === "orderedList") {
      if (Object.keys(attrs).some(key => key !== "start" && !(key === "type" && attrs.type === null)) || !Number.isInteger(attrs.start) || Number(attrs.start) < 1 || Number(attrs.start) > 10000) return false;
    } else return false;
  }
  if (node.type === "heading" && node.attrs === undefined) return false;
  if (["hardBreak", "horizontalRule"].includes(node.type)) return node.content === undefined;
  if (node.content === undefined) return node.type === "paragraph";
  return Array.isArray(node.content) && node.content.length <= 200
    && (node.type === "paragraph" || node.type === "heading" || node.content.length > 0)
    && node.content.every(child => validArticleNode(child, depth + 1, String(node.type)));
}

export function paragraphsToRichText(paragraphs: string[]): ArticleNode {
  return { type: "doc", content: paragraphs.map(text => ({ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) })) };
}

export function articlePlainText(node: ArticleNode): string[] {
  if (node.type === "image") return ["Image"];
  if (node.type === "youtube") return ["YouTube video"];
  if (node.type === "text") return [node.text ?? ""];
  if (node.type === "hardBreak") return ["\n"];
  if (node.type === "paragraph" || node.type === "heading") {
    return [(node.content ?? []).flatMap(articlePlainText).join("")];
  }
  return (node.content ?? []).flatMap(articlePlainText).filter(text => text.trim());
}

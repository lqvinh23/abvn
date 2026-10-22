import { validArticleNode, type ArticleNode } from "./rich-text.ts";

export type ArticleDeltaOp = {
  insert: string | { divider: true } | { image: string } | { video: string };
  attributes?: Record<string, string | number | boolean>;
};
export class ArticleFormatError extends Error {}

export function articleToDelta(doc: ArticleNode): ArticleDeltaOp[] {
  const ops: ArticleDeltaOp[] = [];
  function inline(node: ArticleNode) {
    if (node.type === "text") {
      const attributes = Object.fromEntries((node.marks ?? []).map(mark => [mark.type, mark.type === "color" ? mark.attrs!.color : true]));
      ops.push({ insert: node.text ?? "", ...(Object.keys(attributes).length ? { attributes } : {}) });
    } else if (node.type === "hardBreak") ops.push({ insert: "\n" });
    else node.content?.forEach(inline);
  }
  function block(node: ArticleNode, attributes: ArticleDeltaOp["attributes"] = {}, depth = 0) {
    if (node.type === "bulletList" || node.type === "orderedList") {
      node.content?.forEach(item => item.content?.forEach(child => {
        block(child, { ...attributes, list: node.type === "bulletList" ? "bullet" : "ordered", ...(depth ? { indent: depth } : {}) }, child.type === "bulletList" || child.type === "orderedList" ? depth + 1 : depth);
      }));
    } else if (node.type === "blockquote") {
      node.content?.forEach(child => block(child, { ...attributes, blockquote: true }, depth));
    } else if (node.type === "paragraph" || node.type === "heading") {
      inline(node);
      ops.push({ insert: "\n", attributes: { ...attributes, ...(node.attrs?.align ? { align: node.attrs.align } : {}), ...(node.type === "heading" ? { header: node.attrs?.level ?? 2 } : {}) } });
    } else if (node.type === "horizontalRule") ops.push({ insert: { divider: true } }, { insert: "\n" });
    else if (node.type === "image" || node.type === "youtube") ops.push({ insert: node.type === "image" ? { image: node.attrs!.src! } : { video: node.attrs!.src! }, ...(node.attrs?.width ? { attributes: { width: `${node.attrs.width}%` } } : {}) }, { insert: "\n" });
    else node.content?.forEach(child => block(child, attributes, depth));
  }
  block(doc);
  return ops.length ? ops : [{ insert: "\n" }];
}

export function deltaToArticle(ops: { insert?: string | Record<string, unknown>; attributes?: Record<string, unknown> }[]): ArticleNode {
  const content: ArticleNode[] = [];
  let inline: ArticleNode[] = [];
  let dividerBreak = false;
  const lists: { list: ArticleNode; item: ArticleNode; indent: number }[] = [];
  function line(attributes: Record<string, unknown> = {}) {
    const align = attributes.align;
    if (align !== undefined && align !== "center" && align !== "right" && align !== "justify") throw new ArticleFormatError("Choose a supported text alignment.");
    const paragraph: ArticleNode = { type: "paragraph", ...(align ? { attrs: { align } } : {}), ...(inline.length ? { content: inline } : {}) };
    inline = [];
    if (attributes.list) {
      const indent = Number(attributes.indent ?? 0);
      const type = attributes.list === "ordered" ? "orderedList" : "bulletList";
      while (lists.length && lists[lists.length - 1].indent > indent) lists.pop();
      let current = lists[lists.length - 1];
      if (!current || current.indent !== indent || current.list.type !== type) {
        const list: ArticleNode = { type, content: [] };
        if (current && current.indent < indent) current.item.content!.push(list);
        else {
          if (current) lists.pop();
          const parent = lists[lists.length - 1];
          if (parent) parent.item.content!.push(list);
          else content.push(list);
        }
        current = { list, item: { type: "listItem", content: [] }, indent };
        lists.push(current);
      }
      current.item = { type: "listItem", content: [paragraph] };
      current.list.content!.push(current.item);
    } else {
      lists.length = 0;
      if (attributes.header) content.push({ ...paragraph, type: "heading", attrs: { ...paragraph.attrs, level: Number(attributes.header) } });
      else if (attributes.blockquote) content.push({ type: "blockquote", content: [paragraph] });
      else content.push(paragraph);
    }
  }
  for (const [opIndex, op] of ops.entries()) {
    if (op.insert === undefined || Object.keys(op.attributes ?? {}).some(key => !["bold","italic","underline","strike","header","list","indent","blockquote","align","color","width"].includes(key))) {
      throw new ArticleFormatError("This content uses unsupported formatting. Paste it as plain text and apply formatting with the toolbar.");
    }
    if (typeof op.insert !== "string") {
      if (Object.keys(op.insert).length !== 1 || !(op.insert.divider === true || typeof op.insert.image === "string" || typeof op.insert.video === "string")) throw new ArticleFormatError("Only library images and YouTube videos are supported inside articles.");
      if (inline.length) line(ops.slice(opIndex + 1).find(next => typeof next.insert === "string" && next.insert.includes("\n"))?.attributes);
      lists.length = 0;
      const width = op.attributes?.width;
      if (width !== undefined && (typeof op.insert.image !== "string" || typeof width !== "string" || !/^(?:[1-9][0-9]|100)%$/.test(width))) throw new ArticleFormatError("Resize article images between 10% and 100%.");
      const node: ArticleNode = op.insert.divider === true ? { type: "horizontalRule" }
        : { type: typeof op.insert.image === "string" ? "image" : "youtube", attrs: { src: String(op.insert.image ?? op.insert.video), ...(width ? { width: Number(String(width).slice(0, -1)) } : {}) } };
      if (!validArticleNode({ type: "doc", content: [node] })) throw new ArticleFormatError("Choose a library image or a valid YouTube video using the insert buttons.");
      content.push(node);
      dividerBreak = true;
      continue;
    }
    const pieces = op.insert.split("\n");
    pieces.forEach((text, index) => {
      if (index) {
        if (dividerBreak && !inline.length) dividerBreak = false;
        else line(op.attributes);
      }
      if (text) {
        dividerBreak = false;
        const marks: NonNullable<ArticleNode["marks"]> = (["bold", "italic", "underline", "strike"] as const).filter(type => op.attributes?.[type]).map(type => ({ type }));
        if (op.attributes?.color !== undefined) marks.push({ type: "color", attrs: { color: String(op.attributes.color) } });
        inline.push({ type: "text", text, ...(marks.length ? { marks } : {}) });
      }
    });
  }
  if (inline.length) line();
  const doc: ArticleNode = { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
  if (!validArticleNode(doc)) throw new ArticleFormatError("This edit is too long or deeply nested. Use shorter paragraphs or fewer nested list levels.");
  return doc;
}

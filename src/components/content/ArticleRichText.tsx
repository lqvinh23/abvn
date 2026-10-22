import { Fragment, type ReactNode } from "react";
import type { ArticleNode } from "@/src/lib/content/rich-text";
import YouTubePlayer from "./YouTubePlayer";

export default function ArticleRichText({ node, title = "Article image" }: { node: ArticleNode; title?: string }): ReactNode {
  const children = node.content?.map((child, index) => <ArticleRichText key={index} node={child} title={title} />);
  switch (node.type) {
    case "text": return (node.marks ?? []).reduce<ReactNode>((text, mark) => mark.type === "bold" ? <strong>{text}</strong> : mark.type === "italic" ? <em>{text}</em> : mark.type === "underline" ? <u>{text}</u> : mark.type === "color" ? <span style={{ color: mark.attrs?.color }}>{text}</span> : <s>{text}</s>, node.text);
    case "paragraph": return <p style={{ textAlign: node.attrs?.align }}>{children ?? <br />}</p>;
    case "heading": return node.attrs?.level === 3 ? <h3 style={{ textAlign: node.attrs?.align }} className="text-xl font-semibold text-slate-950">{children}</h3> : <h2 style={{ textAlign: node.attrs?.align }} className="text-2xl font-semibold text-slate-950">{children}</h2>;
    case "bulletList": return <ul className="list-disc space-y-2 pl-6">{children}</ul>;
    case "orderedList": return <ol start={node.attrs?.start} className="list-decimal space-y-2 pl-6">{children}</ol>;
    case "listItem": return <li>{children}</li>;
    case "blockquote": return <blockquote className="border-l-4 border-green-700 pl-4 italic">{children}</blockquote>;
    case "hardBreak": return <br />;
    case "horizontalRule": return <hr className="border-slate-200" />;
    // Uploaded media is served through the permission-checked signed URL route.
    // eslint-disable-next-line @next/next/no-img-element
    case "image": return <figure><img src={node.attrs?.src} alt={title} loading="lazy" style={{ width: node.attrs?.width ? `${node.attrs.width}%` : undefined }} className="mx-auto h-auto max-w-full rounded-xl" /></figure>;
    case "youtube": return <YouTubePlayer key={node.attrs!.src} src={node.attrs!.src!} title={title} />;
    case "doc": return <Fragment>{children}</Fragment>;
  }
}

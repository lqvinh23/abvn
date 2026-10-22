"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type Quill from "quill";
import { articlePlainText, paragraphsToRichText, type ArticleNode } from "@/src/lib/content/rich-text";
import { ArticleFormatError, articleToDelta, deltaToArticle } from "@/src/lib/content/quill";
import "quill/dist/quill.snow.css";
import "./article-editor.css";
import ImagePicker from "./ImagePicker";
import ActionIcon from "@/src/components/platform/ActionIcon";
import { Field } from "@/src/components/platform/Fields";
import { youtubeEmbedUrl } from "@/src/lib/content/media";

export default function ArticleEditor({ content, paragraphs, title, images, onUploaded, disabled, onChange, onValidation }: {
  content?: ArticleNode;
  paragraphs: string[];
  title: string;
  images: string[];
  onUploaded: (path: string) => void;
  disabled: boolean;
  onChange: (richText: ArticleNode, body: string[]) => void;
  onValidation: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<Quill | null>(null);
  const position = useRef(0);
  const videoDialog = useRef<HTMLDialogElement>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLSpanElement | null>(null);
  const selectedImage = useRef<HTMLImageElement | null>(null);
  const [imageFrame, setImageFrame] = useState<{ left: number; top: number; width: number; height: number; percent: number; viewport: { left: number; top: number; width: number; height: number } } | null>(null);
  const resizeImage = useRef<(width: number, preview?: boolean) => void>(() => {});
  const drag = useRef<{ x: number; pixels: number; percent: number; nextPercent: number; direction: number } | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const initial = useRef(content ?? paragraphsToRichText(paragraphs));
  const callbacks = useRef({ onChange, onValidation });
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { callbacks.current = { onChange, onValidation }; }, [onChange, onValidation]);
  useEffect(() => {
    let cancelled = false;
    const container = host.current;
    if (!container) return;
    function syncImageFrame() {
      const image = selectedImage.current;
      if (!image || !container?.contains(image)) { setImageFrame(null); return; }
      const bounds = image.getBoundingClientRect();
      const parent = container.getBoundingClientRect();
      const viewport = image.closest(".ql-editor")?.getBoundingClientRect();
      if (!viewport || bounds.bottom <= viewport.top || bounds.top >= viewport.bottom) { setImageFrame(null); return; }
      setImageFrame({ left: bounds.left - viewport.left, top: bounds.top - viewport.top, width: bounds.width, height: bounds.height, percent: Number.parseInt(image.style.width || image.getAttribute("width") || "100"), viewport: { left: viewport.left - parent.left, top: viewport.top - parent.top, width: viewport.width, height: viewport.height } });
    }
    const observer = new ResizeObserver(syncImageFrame);
    async function mount() {
      const [{ default: Quill }, { BlockEmbed }] = await Promise.all([
        import("quill"), import("quill/blots/block.js"),
      ]);
      if (cancelled || !container) return;
      class Divider extends BlockEmbed {
        static blotName = "divider";
        static tagName = "hr";
        static value() { return true; }
      }
      Quill.register(Divider, true);
      const element = document.createElement("div");
      container.append(element);
      const editor = new Quill(element, {
        theme: "snow",
        formats: ["header", "bold", "italic", "underline", "strike", "blockquote", "list", "indent", "divider", "image", "video", "align", "color"],
        modules: {
          toolbar: [
            [{ header: [2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ indent: "-1" }, { indent: "+1" }],
            [{ align: [] }, { color: [] }],
            ["blockquote", "clean"],
          ],
          history: { delay: 500, maxStack: 100, userOnly: true },
        },
        placeholder: "Write your article here...",
      });
      const Delta = Quill.import("delta");
      editor.setContents(new Delta(articleToDelta(initial.current)), "silent");
      editor.history.clear();
      instance.current = editor;
      editor.root.addEventListener("click", event => {
        const image = event.target instanceof HTMLImageElement ? event.target : null;
        if (selectedImage.current) observer.unobserve(selectedImage.current);
        selectedImage.current?.removeAttribute("data-selected");
        selectedImage.current = image;
        image?.setAttribute("data-selected", "true");
        if (image) observer.observe(image);
        syncImageFrame();
      });
      editor.root.addEventListener("scroll", syncImageFrame);
      observer.observe(editor.root);
      resizeImage.current = (width, preview = false) => {
        const image = selectedImage.current;
        const blot = image && Quill.find(image);
        if (!blot || blot instanceof Quill || !image || !editor.root.contains(image)) return;
        // Commit once on release so even a long drag is one undo step.
        if (preview) image.style.width = `${width}%`;
        else {
          image.style.removeProperty("width");
          editor.formatText(editor.getIndex(blot), 1, "width", `${width}%`, "user");
        }
        syncImageFrame();
      };
      editor.on("selection-change", range => { if (range) position.current = range.index; });
      editor.root.setAttribute("role", "textbox");
      editor.root.setAttribute("aria-label", "Article text");
      editor.root.setAttribute("aria-multiline", "true");
      const toolbar = container.querySelector(".ql-toolbar");
      toolbar?.setAttribute("role", "group");
      toolbar?.setAttribute("aria-label", "Text formatting");
      const labels: Record<string, string> = {
        bold: "Bold", italic: "Italic", underline: "Underline", strike: "Strikethrough",
        blockquote: "Quote", clean: "Clear formatting", "list:ordered": "Numbered list",
        "list:bullet": "Bullet list", "indent:-1": "Decrease indent", "indent:+1": "Increase indent",
      };
      toolbar?.querySelectorAll("button").forEach(button => {
        const format = [...button.classList].find(name => name.startsWith("ql-"))?.slice(3) ?? "";
        const label = labels[button.value ? `${format}:${button.value}` : format] ?? format;
        button.setAttribute("aria-label", label);
        button.title = label;
      });
      toolbar?.querySelectorAll(".ql-picker").forEach(picker => {
        const name = picker.classList.contains("ql-header") ? "Paragraph style" : picker.classList.contains("ql-align") ? "Text alignment" : "Text color";
        picker.querySelector(".ql-picker-label")?.setAttribute("aria-label", name);
        picker.querySelectorAll(".ql-picker-item").forEach(item => {
          const value = item.getAttribute("data-value");
          item.setAttribute("aria-label", name === "Paragraph style" ? value ? `Heading ${value}` : "Normal text" : name === "Text alignment" ? value || "left" : value || "Default color");
        });
      });
      const extraControls = document.createElement("span");
      extraControls.className = "article-extra-controls";
      toolbar?.append(extraControls);
      setToolbarHost(extraControls);
      let lastValid = editor.getContents();
      editor.on("text-change", (_delta, _old, source) => {
        if (source !== "user") return;
        let richText: ArticleNode;
        try { richText = deltaToArticle(editor.getContents().ops); }
        catch (error) {
          if (!(error instanceof ArticleFormatError)) throw error;
          editor.setContents(lastValid, "silent");
          callbacks.current.onValidation(error.message);
          return;
        }
        lastValid = editor.getContents();
        initial.current = richText;
        if (selectedImage.current && !editor.root.contains(selectedImage.current)) {
          selectedImage.current = null;
          setImageFrame(null);
        } else if (selectedImage.current) {
          syncImageFrame();
        }
        callbacks.current.onChange(richText, articlePlainText(richText));
      });
      setLoading(false);
    }
    mount().catch(error => {
      if (cancelled) return;
      console.error("Article editor load failed:", error);
      setLoadError("The article editor could not load. Reload this page to retry; your saved article has not changed.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
      instance.current = null;
      observer.disconnect();
      container.replaceChildren();
    };
  }, []);
  useEffect(() => { instance.current?.enable(!disabled); }, [disabled, loading]);
  function insertMedia(type: "image" | "video", src: string) {
    const editor = instance.current;
    if (!editor) return;
    // Use one change so undo and validation treat the embed and its newline together.
    const change = editor.getContents().slice(0, 0);
    const index = Math.min(position.current, editor.getLength() - 1);
    change.retain(index).insert({ [type]: src }).insert("\n");
    editor.updateContents(change, "user");
    editor.setSelection(Math.min(index + 2, editor.getLength() - 1), 0, "silent");
    editor.focus();
  }
  return <div className="space-y-2">
    <span className="text-sm font-medium">Article text</span>
    {toolbarHost ? createPortal(<fieldset disabled={disabled || loading} className="article-toolbar-actions">
      <button type="button" aria-label="Undo" title="Undo" onClick={() => instance.current?.history.undo()}><ActionIcon name="undo" /></button>
      <button type="button" aria-label="Redo" title="Redo" onClick={() => instance.current?.history.redo()}><ActionIcon name="redo" /></button>
      <ImagePicker triggerOnly iconOnly label="Insert image" images={images} onUploaded={onUploaded} onSelect={path => insertMedia("image", path)} />
      <button type="button" aria-label="Insert YouTube video" title="Insert YouTube video" onClick={() => { setVideoError(""); videoDialog.current?.showModal(); }}><ActionIcon name="video" /></button>
    </fieldset>, toolbarHost) : null}
    <dialog ref={videoDialog} aria-label="Insert YouTube video" className="fixed inset-0 m-auto w-[min(520px,95vw)] rounded-xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-slate-950/50">
      <form className="space-y-3" onSubmit={event => {
        event.preventDefault();
        const src = youtubeEmbedUrl(videoUrl.trim());
        if (!src) { setVideoError("Enter a valid HTTPS YouTube video link (watch, share, Shorts, or embed)."); return; }
        insertMedia("video", src); setVideoUrl(""); videoDialog.current?.close();
      }}>
        <h2 className="font-semibold">Insert YouTube video</h2>
        <Field compact label="YouTube link" type="url" required value={videoUrl} onChange={event => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        {videoError ? <p role="alert" className="text-sm text-red-800">{videoError}</p> : null}
        <div className="flex gap-2"><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-green-800 px-3 text-sm font-semibold text-white"><ActionIcon name="plus" />Insert video</button><button type="button" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" onClick={() => videoDialog.current?.close()}>Cancel</button></div>
      </form>
    </dialog>
    {loadError ? <p role="alert" className="text-sm text-red-800">{loadError}</p> : null}
    {loading ? <p role="status" className="text-sm text-slate-500">Loading article editor...</p> : null}
    <div className="article-editor-shell">
      <div ref={host} className={`article-editor ${disabled ? "pointer-events-none opacity-60" : ""}`} />
      {imageFrame && !disabled ? <div className="article-image-viewport" style={imageFrame.viewport}><div className="article-image-frame" style={{ left: imageFrame.left, top: imageFrame.top, width: imageFrame.width, height: imageFrame.height }}>
        {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(corner => <button key={corner} type="button" role="slider" aria-label={`Resize image ${corner}`} aria-valuemin={10} aria-valuemax={100} aria-valuenow={imageFrame.percent} aria-valuetext={`${imageFrame.percent}% width`} className={`article-resize-handle ${corner}`} onPointerDown={event => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          instance.current?.history.cutoff();
          drag.current = { x: event.clientX, pixels: imageFrame.width, percent: imageFrame.percent, nextPercent: imageFrame.percent, direction: corner.endsWith("left") ? -1 : 1 };
        }} onPointerMove={event => {
          const start = drag.current;
          if (!start) return;
          const percent = Math.round(start.percent * (start.pixels + (event.clientX - start.x) * start.direction) / start.pixels);
          start.nextPercent = Math.max(10, Math.min(100, percent));
          resizeImage.current(start.nextPercent, true);
        }} onPointerUp={() => { if (drag.current) resizeImage.current(drag.current.nextPercent); drag.current = null; instance.current?.history.cutoff(); }} onPointerCancel={() => { if (drag.current) resizeImage.current(drag.current.percent); drag.current = null; instance.current?.history.cutoff(); }} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          resizeImage.current(event.key === "Home" ? 10 : event.key === "End" ? 100 : Math.max(10, Math.min(100, imageFrame.percent + (event.key === "ArrowRight" ? 5 : -5))));
        }} />)}
        <span className="article-resize-label">{imageFrame.percent}%</span>
      </div></div> : null}
    </div>
    <p className="text-xs text-slate-500">Select text to format it. Click an image and drag a corner to resize; arrow keys on a corner also work. Images use the article title ({title}) as their description.</p>
  </div>;
}

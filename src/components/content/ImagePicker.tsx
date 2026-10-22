"use client";

import Image from "next/image";
import { useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { uploadContentMedia } from "@/src/app/dashboard/content-actions";
import { Field } from "@/src/components/platform/Fields";
import ActionIcon from "@/src/components/platform/ActionIcon";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";

export default function ImagePicker({ value, images, onSelect, onUploaded, label = "Choose image", id, triggerOnly = false, iconOnly = false }: {
  value?: string; images: string[]; onSelect: (path: string) => void; onUploaded: (path: string) => void;
  label?: string; id?: string; triggerOnly?: boolean; iconOnly?: boolean;
}) {
  const titleId = useId();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  return <>
    <button id={id} type="button" aria-label={label} title={label} className={button} onClick={() => { setError(""); setOpen(true); }}>
      {!triggerOnly && value ? <Image src={value} alt="" width={40} height={28} unoptimized className="h-7 w-10 rounded object-cover" /> : <ActionIcon name="image" />}
      {iconOnly ? null : label}
    </button>
    {open ? createPortal(<dialog ref={element => { if (element && !element.open) element.showModal(); }} aria-labelledby={titleId} onCancel={event => { if (pending) event.preventDefault(); else setOpen(false); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(720px,95vw)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl backdrop:bg-slate-950/50">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 id={titleId} className="font-semibold">Choose or upload an image</h2><button type="button" disabled={pending} className={button} onClick={() => setOpen(false)}><ActionIcon name="close" />Close</button></div>
      <p className="mb-3 text-xs text-slate-500">JPEG, PNG or WebP, up to 2 MB. Uploads are saved to Media and stay private until published.</p>
      <Field compact label={pending ? "Uploading..." : "Upload from your device"} type="file" disabled={pending} accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const form = new FormData(); form.set("image", file);
        const select = onSelect;
        startTransition(async () => {
          const result = await uploadContentMedia(form);
          if (!result.ok || !result.path) { setError(result.message); return; }
          setError("");
          onUploaded(result.path);
          select(result.path);
          setOpen(false);
        });
      }} />
      {error ? <p role="alert" className="mt-2 text-sm text-red-800">{error}</p> : null}
      <div className="my-3"><Field compact label="Search media" type="search" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[...new Set([...(value ? [value] : []), ...images])].filter(path => path.toLowerCase().includes(search.toLowerCase())).map(path =>
        <button type="button" disabled={pending} key={path} aria-pressed={value === path} className={`min-w-0 rounded-lg border p-2 text-left hover:border-green-700 ${value === path ? "border-green-800 bg-green-50" : "border-slate-200"}`} onClick={() => { onSelect(path); setOpen(false); }}>
          <Image src={path} alt="" width={140} height={90} unoptimized className="h-24 w-full rounded object-contain" />
          <span className="mt-2 block truncate text-xs">{path.split("/").at(-1)}</span>
        </button>)}</div>
    </dialog>, document.body) : null}
  </>;
}

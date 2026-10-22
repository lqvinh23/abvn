"use client";

import { useRef, type ReactNode } from "react";
import ActionIcon from "./ActionIcon";

export default function EditorDialog({ title, icon = "edit", children, label = title }: {
  title: string; label?: string; icon?: Parameters<typeof ActionIcon>[0]["name"]; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="workspace-icon-action" title={label} aria-label={label} onClick={() => dialog.current?.showModal()}><ActionIcon name={icon} /></button>
    <dialog ref={dialog} aria-label={title} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(640px,95vw)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl backdrop:bg-slate-950/50">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"><h2 className="font-semibold">{title}</h2><button type="button" className="workspace-icon-action" title="Close" aria-label="Close" onClick={() => dialog.current?.close()}><ActionIcon name="close" /></button></header>
      <div className="p-4">{children}</div>
    </dialog>
  </>;
}

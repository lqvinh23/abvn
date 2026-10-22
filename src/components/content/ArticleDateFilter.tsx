"use client";

import { useRef, useState } from "react";
import { Field } from "@/src/components/platform/Fields";
import ActionIcon from "@/src/components/platform/ActionIcon";

export default function ArticleDateFilter({ from, to, onChange }: {
  from: string; to: string; onChange: (from: string, to: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [range, setRange] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  function updateDates(nextStart: string, nextEnd: string, isRange: boolean) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(nextStart) && (!isRange || /^\d{4}-\d{2}-\d{2}$/.test(nextEnd) && nextEnd >= nextStart))
      onChange(nextStart, isRange ? nextEnd : "");
    else if (!nextStart && !nextEnd) onChange("", "");
  }
  return <div>
    <span className="text-xs font-medium text-slate-600">Filter day</span>
    <button type="button" className="mt-1 flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm" onClick={() => {
      setStart(from); setEnd(to); setRange(Boolean(to && to !== from)); dialog.current?.showModal();
    }} aria-label="Filter day or date range">
      <span>{from ? to && to !== from ? `${from} – ${to}` : from : "Any day or date range"}</span>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 5h16v16H4zM8 3v4m8-4v4M4 10h16" /></svg>
    </button>
    <dialog ref={dialog} aria-label="Filter article dates" className="fixed inset-0 m-auto w-[min(440px,95vw)] rounded-xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-slate-950/50">
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); dialog.current?.close(); }}>
        <h2 className="font-semibold">Filter article dates</h2>
        <div className="flex gap-4 text-sm"><label className="flex min-h-11 items-center gap-2"><input type="radio" name="date-mode" checked={!range} onChange={() => { setRange(false); updateDates(start, end, false); }} />One day</label><label className="flex min-h-11 items-center gap-2"><input type="radio" name="date-mode" checked={range} onChange={() => { setRange(true); updateDates(start, end, true); }} />Date range</label></div>
        <div className="grid gap-3 sm:grid-cols-2"><Field compact label={range ? "From" : "Day"} type="date" value={start} onChange={event => { setStart(event.target.value); updateDates(event.target.value, end, range); }} />{range ? <Field compact label="To" type="date" min={start} value={end} onChange={event => { setEnd(event.target.value); updateDates(start, event.target.value, true); }} /> : null}</div>
        {range && start && end && end < start ? <p role="alert" className="text-sm text-red-800">The To date must not be before From.</p> : null}
        <div className="flex flex-wrap gap-2"><button type="button" className="workspace-filter-clear" title="Clear dates" aria-label="Clear dates" onClick={() => { setStart(""); setEnd(""); onChange("", ""); }}><ActionIcon name="close" /></button><button type="button" className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" onClick={() => dialog.current?.close()}>Close</button></div>
      </form>
    </dialog>
  </div>;
}

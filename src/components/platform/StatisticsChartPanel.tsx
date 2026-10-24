"use client";

import { useState, type ReactNode } from "react";

type View = "column" | "line";
const views: { id: View; label: string }[] = [{ id: "column", label: "Column" }, { id: "line", label: "Line" }];

export default function StatisticsChartPanel({ title, note, column, line }: { title: string; note?: string; column: ReactNode; line: ReactNode }) {
  const [view, setView] = useState<View>("column");
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-slate-800">{title}{note ? <span className="font-normal text-slate-500"> · {note}</span> : null}</h2>
      <div role="group" aria-label={`${title} chart type`} className="flex gap-0.5 rounded-lg bg-slate-100 p-1">
        {views.map(option => <button key={option.id} type="button" aria-pressed={view === option.id} onClick={() => setView(option.id)} className={`inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium ${view === option.id ? "bg-white text-green-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{option.label}</button>)}
      </div>
    </div>
    {view === "column" ? column : line}
  </section>;
}

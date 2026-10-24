"use client";

import { useMemo, useState } from "react";
import { studyTrendPoints, type TrendRange } from "@/src/lib/platform/study-trend";
import { ColumnChart, LineChart } from "./StatisticsCharts";

const ranges: { id: TrendRange; label: string; note: string }[] = [
  { id: "6m", label: "6 months", note: "per month" },
  { id: "3m", label: "3 months", note: "per week" },
  { id: "1m", label: "1 month", note: "per day" },
];
const metrics = [{ key: "attended", label: "Lessons attended", color: "#176b4d" }];

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (value: T) => void }) {
  return <div role="group" aria-label={label} className="flex gap-0.5 rounded-lg bg-slate-100 p-1">
    {options.map(option => <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)} className={`inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium ${value === option.id ? "bg-white text-green-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{option.label}</button>)}
  </div>;
}

export default function StudentStudyTrend({ attendedAt, timeZone, now }: { attendedAt: string[]; timeZone: string; now: number }) {
  const [range, setRange] = useState<TrendRange>("6m");
  const [view, setView] = useState<"column" | "line">("column");
  const points = useMemo(() => studyTrendPoints(attendedAt, range, timeZone, now), [attendedAt, range, timeZone, now]);
  const current = ranges.find(option => option.id === range)!;
  const title = `Lessons attended ${current.note}, last ${current.label}`;
  const total = points.reduce((sum, point) => sum + point.values.attended, 0);
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-slate-800">Study trend<span className="font-normal text-slate-500"> · {total} lesson{total === 1 ? "" : "s"} in the last {current.label}</span></h2>
      <div className="flex flex-wrap gap-2">
        <Segmented label="Period" value={range} options={ranges} onChange={setRange} />
        <Segmented label="Chart type" value={view} options={[{ id: "column", label: "Column" }, { id: "line", label: "Line" }]} onChange={setView} />
      </div>
    </div>
    <div className="mx-auto max-w-[44rem]">{view === "column" ? <ColumnChart compact showValues={range !== "1m"} title={title} points={points} metrics={metrics} /> : <LineChart compact title={title} points={points} metrics={metrics} />}</div>
  </section>;
}

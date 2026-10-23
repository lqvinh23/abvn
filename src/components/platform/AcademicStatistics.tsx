import Link from "next/link";
import { DateTime } from "luxon";
import type { ActivityLeader, ActivitySeriesPoint, ActivityStatistics } from "@/src/lib/platform/types";
import { formatUtcOffset } from "@/src/lib/platform/calendar";
import PaginatedTable from "./PaginatedTable";
import StatisticsPeriodPicker from "./StatisticsPeriodPicker";
import WorkspaceTabBar from "./WorkspaceTabBar";

type Tab = "lesson" | "teacher" | "student";
type Period = ActivityStatistics["granularity"];
const tabs: { id: Tab; label: string }[] = [
  { id: "lesson", label: "Lessons" },
  { id: "teacher", label: "Teachers" },
  { id: "student", label: "Students" },
];
const periods: { id: Period; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];
const panel = "min-w-0 rounded-xl border border-slate-200 bg-white p-3";
const colors = { completed: "#15803d", booked: "#6366f1", cancelled: "#e11d48", unbooked: "#94a3b8", students: "#d97706", attended: "#0f766e" };
const number = (value: number) => value.toLocaleString("en-US");
const percentage = (value: number, total: number) => total > 0 ? `${Math.round(value / total * 100)}%` : "—";
const average = (value: number, total: number) => total > 0 ? (value / total).toFixed(1) : "—";

function TrendChart({ points, metrics, title, stacked = true }: {
  points: ActivitySeriesPoint[];
  metrics: { key: keyof ActivitySeriesPoint; label: string; color: string }[];
  title: string;
  stacked?: boolean;
}) {
  const max = Math.max(1, ...points.map(point => {
    const values = metrics.map(metric => Number(point[metric.key]) || 0);
    return stacked ? values.reduce((sum, value) => sum + value, 0) : Math.max(...values);
  }));
  const chartHeight = 108;
  const chartWidth = 840;
  const gap = 3;
  const slotWidth = chartWidth / Math.max(points.length, 1);
  const interBarGap = stacked ? 0 : 2;
  const barWidth = Math.max(2, Math.min(20, (slotWidth - gap * 2 - interBarGap * (metrics.length - 1)) / metrics.length));
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  return <div className="min-w-0">
    <div className="flex flex-wrap gap-x-3 gap-y-1" aria-label={`${title} chart legend`}>{metrics.map(metric => <span key={metric.key} className="inline-flex items-center gap-1.5 text-sm text-slate-600"><span aria-hidden="true" className="size-2 rounded-sm" style={{ backgroundColor: metric.color }} />{metric.label}</span>)}</div>
    <svg role="img" aria-label={title} viewBox={`0 0 ${chartWidth} 152`} className="mt-1 h-36 w-full overflow-visible">
      <title>{title}</title>
      {[0, 1, 2, 3].map(line => {
        const y = 8 + line * (chartHeight / 3);
        return <g key={line}><line x1="0" x2={chartWidth} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={line ? "3 4" : undefined} /><text x="0" y={Math.max(y - 2, 9)} fontSize="10" fill="#64748b">{Math.round(max * (1 - line / 3))}</text></g>;
      })}
      {points.map((point, index) => {
        let stackedHeight = 0;
        const groupWidth = metrics.length * barWidth + (metrics.length - 1) * interBarGap;
        const groupX = index * slotWidth + (slotWidth - groupWidth) / 2;
        const bars = metrics.map((metric, metricIndex) => {
          const value = Number(point[metric.key]) || 0;
          const height = value / max * chartHeight;
          const x = stacked ? groupX : groupX + metricIndex * (barWidth + interBarGap);
          const y = 8 + chartHeight - (stacked ? stackedHeight + height : height);
          if (stacked) stackedHeight += height;
          return value > 0 ? <rect key={metric.key} x={x} y={y} width={barWidth} height={height} fill={metric.color}><title>{`${point.label}: ${metric.label} ${value}`}</title></rect> : null;
        });
        return <g key={`${point.label}-${index}`}>{bars}{index % labelEvery === 0 || index === points.length - 1 ? <text x={groupX + groupWidth / 2} y="142" textAnchor="middle" fontSize="10" fill="#475569">{point.label}</text> : null}</g>;
      })}
    </svg>
    <table className="sr-only"><caption>{title} data</caption><thead><tr><th scope="col">Period</th>{metrics.map(metric => <th scope="col" key={metric.key}>{metric.label}</th>)}</tr></thead><tbody>{points.map((point, index) => <tr key={`${point.label}-${index}`}><th scope="row">{point.label}</th>{metrics.map(metric => <td key={metric.key}>{Number(point[metric.key]) || 0}</td>)}</tr>)}</tbody></table>
  </div>;
}

function MetricCards({ values }: { values: { label: string; value: number | string; detail?: string }[] }) {
  return <dl className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${values.length === 6 ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>{values.map(value => <div className={`${panel} px-3 py-2.5`} key={value.label}><dt className="text-sm font-medium leading-5 text-slate-600">{value.label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{typeof value.value === "number" ? number(value.value) : value.value}</dd>{value.detail ? <p className="mt-0.5 text-xs leading-4 text-slate-500">{value.detail}</p> : null}</div>)}</dl>;
}

function StatusBreakdown({ totals }: { totals: ActivityStatistics["lesson_totals"] }) {
  const rows = [
    { label: "Completed", value: totals.completed, color: colors.completed },
    { label: "Booked", value: totals.booked, color: colors.booked },
    { label: "Cancelled", value: totals.cancelled, color: colors.cancelled },
    { label: "Open", value: totals.unbooked, color: colors.unbooked },
  ];
  return <section className={panel}>
    <h2 className="text-sm font-semibold text-slate-800">Slot status mix</h2>
    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={rows.map(row => `${row.label} ${number(row.value)}`).join(", ")}>
      {rows.map(row => <span key={row.label} style={{ width: `${totals.total ? row.value / totals.total * 100 : 0}%`, backgroundColor: row.color }} />)}
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{rows.map(row => <div key={row.label} className="flex min-w-0 items-center justify-between gap-2 text-sm"><dt className="flex min-w-0 items-center gap-1.5 text-slate-600"><span aria-hidden="true" className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} />{row.label}</dt><dd className="shrink-0 font-semibold tabular-nums text-slate-800">{number(row.value)} <span className="font-normal text-slate-500">{percentage(row.value, totals.total)}</span></dd></div>)}</dl>
  </section>;
}

function LeaderTable({ rows, tab }: { rows: ActivityLeader[]; tab: Exclude<Tab, "lesson"> }) {
  const teacher = tab === "teacher";
  return <section className={`${panel} min-w-0`}>
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><h2 className="text-sm font-semibold text-slate-800">{teacher ? "Top teachers" : "Top students"}</h2><p className="text-xs text-slate-500">{teacher ? "Completed lessons · unique learners" : "Attended lessons"}</p></div>
    <PaginatedTable caption={teacher ? "Top teachers" : "Top students"} columns={teacher ? 4 : 3} tableClassName="min-w-[480px]" emptyMessage="No activity recorded in this period." headers={<tr><th scope="col" aria-sort="none" className="whitespace-nowrap px-4 py-3 font-semibold">Rank</th><th scope="col" aria-sort="none" className="whitespace-nowrap px-4 py-3 font-semibold">Member</th><th scope="col" aria-sort="none" className="whitespace-nowrap px-4 py-3 text-right font-semibold">{teacher ? "Lessons" : "Attended"}</th>{teacher ? <th scope="col" aria-sort="none" className="whitespace-nowrap px-4 py-3 text-right font-semibold">Students taught</th> : null}</tr>}>
      {rows.map((row, index) => <tr key={row.member_code} className="align-top hover:bg-slate-50/70"><td className="px-4 py-3 tabular-nums text-slate-500">{index + 1}</td><th scope="row" className="px-4 py-3 font-medium text-slate-900">{row.full_name}<span className="ml-2 text-xs font-normal text-slate-500">ID {row.member_number ?? "—"}</span></th><td className="px-4 py-3 text-right font-medium tabular-nums">{number(teacher ? row.completed_lessons ?? 0 : row.lessons_attended ?? 0)}</td>{teacher ? <td className="px-4 py-3 text-right tabular-nums">{number(row.students_taught ?? 0)}</td> : null}</tr>)}
    </PaginatedTable>
  </section>;
}

export default function AcademicStatistics({ data, tab, period, timeZone }: { data: ActivityStatistics; tab: Tab; period: Period; timeZone: string }) {
  const periodLabel = periods.find(option => option.id === period)?.label ?? "Month";
  const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
  const start = dateFormat.format(new Date(`${data.period_start}T00:00:00Z`));
  const endDate = new Date(`${data.period_end}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const end = dateFormat.format(endDate);
  const localStart = DateTime.fromISO(data.period_start, { zone: timeZone });
  const timeZoneOffset = formatUtcOffset(timeZone, localStart.toMillis());
  const link = (nextTab: Tab, nextPeriod = period, nextAnchor: string | null = data.period_start) => {
    const params = new URLSearchParams({ view: "statistics", tab: nextTab, period: nextPeriod });
    if (nextAnchor) params.set("anchor", nextAnchor);
    return `/dashboard/admin?${params}`;
  };
  const lessons = data.lesson_totals;
  const fillRate = percentage(lessons.completed + lessons.booked, lessons.total - lessons.cancelled);
  const cancellationRate = percentage(lessons.cancelled, lessons.total);
  const lessonMetrics = [
    { key: "completed" as const, label: "Completed", color: colors.completed },
    { key: "booked" as const, label: "Booked", color: colors.booked },
    { key: "cancelled" as const, label: "Cancelled", color: colors.cancelled },
    { key: "unbooked" as const, label: "Open", color: colors.unbooked },
  ];
  return <div className="workspace-stack">
    <WorkspaceTabBar label="Academic statistics views" tabs={tabs.map(option => ({ id: option.id, label: option.label, href: link(option.id), active: tab === option.id }))}>
      <p className="mx-1 text-sm text-slate-600">{start} – {end} <span className="text-slate-500">{timeZoneOffset}</span></p>
      <Link href={link(tab, period, null)} aria-label="Return to current period" className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Current</Link>
      <StatisticsPeriodPicker tab={tab} period={period} anchor={data.period_start} timeZone={timeZone} />
      <nav aria-label="Reporting period" className="flex flex-wrap gap-0.5 rounded-lg bg-slate-100 p-1">{periods.map(option => <Link key={option.id} href={link(tab, option.id)} aria-current={period === option.id ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md px-2.5 text-sm font-medium ${period === option.id ? "bg-white text-green-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{option.label}</Link>)}</nav>
    </WorkspaceTabBar>
    {tab === "lesson" ? <>
      <MetricCards values={[
        { label: "Lesson slots", value: lessons.total },
        { label: "Completed", value: lessons.completed, detail: `${percentage(lessons.completed, lessons.total)} of all slots` },
        { label: "Booked now", value: lessons.booked },
        { label: "Open availability", value: lessons.unbooked },
        { label: "Cancelled", value: lessons.cancelled, detail: `${cancellationRate} of all slots` },
        { label: "Slot fill rate", value: fillRate, detail: "(completed + booked) / non-cancelled" },
      ]} />
      <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
        <section className={panel}><h2 className="mb-1 text-sm font-semibold text-slate-800">Lesson activity <span className="font-normal text-slate-500">· {periodLabel.toLowerCase()} trend</span></h2><TrendChart points={data.lesson_series} metrics={lessonMetrics} title={`${periodLabel} lesson totals and status breakdown`} /></section>
        <StatusBreakdown totals={lessons} />
      </div>
    </> : tab === "teacher" ? <>
      <MetricCards values={[
        { label: "Active teachers", value: data.teacher_totals.active },
        { label: "New this period", value: data.teacher_totals.new },
        { label: "Completed lessons", value: data.teacher_totals.completed_lessons },
        { label: "Unique students taught", value: data.teacher_totals.students_taught },
        { label: "Lessons per student", value: average(data.teacher_totals.completed_lessons, data.teacher_totals.students_taught), detail: "Completed lessons / unique students" },
      ]} />
      <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(480px,1fr)]">
        <section className={panel}><h2 className="mb-1 text-sm font-semibold text-slate-800">Teaching activity <span className="font-normal text-slate-600">· {periodLabel.toLowerCase()}</span></h2><TrendChart points={data.teacher_series} metrics={[{ key: "completed", label: "Completed lessons", color: colors.completed }, { key: "students", label: "Unique students", color: colors.students }]} title={`${periodLabel} teacher activity`} stacked={false} /></section>
        <LeaderTable rows={data.top_teachers} tab="teacher" />
      </div>
    </> : <>
      <MetricCards values={[
        { label: "Active students", value: data.student_totals.active },
        { label: "New this period", value: data.student_totals.new },
        { label: "Lessons attended", value: data.student_totals.lessons_attended },
        { label: "Engaged students", value: data.student_totals.engaged },
        { label: "Lessons per engaged student", value: average(data.student_totals.lessons_attended, data.student_totals.engaged), detail: "Attended lessons / engaged students" },
      ]} />
      <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(480px,1fr)]">
        <section className={panel}><h2 className="mb-1 text-sm font-semibold text-slate-800">Student attendance <span className="font-normal text-slate-600">· {periodLabel.toLowerCase()}</span></h2><TrendChart points={data.student_series} metrics={[{ key: "lessons_attended", label: "Lessons attended", color: colors.attended}]} title={`${periodLabel} student attendance`} /></section>
        <LeaderTable rows={data.top_students} tab="student" />
      </div>
    </>}
  </div>;
}

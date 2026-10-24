import Link from "next/link";
import type { ReactNode } from "react";
import { DateTime } from "luxon";
import type { AcademicStatistics as AcademicStatisticsData, LessonCounts } from "@/src/lib/platform/types";
import { formatUtcOffset } from "@/src/lib/platform/calendar";
import { monthWeekAxis, percentOf, sharePercents } from "@/src/lib/platform/statistics-chart";
import PaginatedTable from "./PaginatedTable";
import StatisticsChartPanel from "./StatisticsChartPanel";
import StatisticsPeriodPicker from "./StatisticsPeriodPicker";
import WorkspaceTabBar from "./WorkspaceTabBar";
import { ColumnChart, LineChart, PieChart, type ChartPoint } from "./StatisticsCharts";

type Tab = "lesson" | "teacher" | "student";
type Period = AcademicStatisticsData["granularity"];
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
const bucketNames: Record<Period, string> = { week: "day", month: "week", quarter: "month", year: "quarter" };
const panel = "min-w-0 rounded-xl border border-slate-200 bg-white p-3";
const colors = {
  total: "#475569", completed: "var(--primary)", booked: "#6366f1", unbooked: "#94a3b8",
  absent: "#e11d48", apologized: "#d97706", cancelled: "#7c3fa3",
  lightLessons: "#cbd5e1", lightTeachers: "#c7d2fe",
};
const number = (value: number) => value.toLocaleString("en-US");
const th = "whitespace-nowrap px-4 py-3 font-semibold";
const td = "px-4 py-3 tabular-nums";

function MetricBox({ title, items, columns = "grid-cols-1" }: { title: string; items: { label: string; value: number; percent?: number; detail?: string; color?: string; wide?: boolean }[]; columns?: string }) {
  return <section className={panel} aria-label={title}>
    <h2 className="sr-only">{title}</h2>
    <dl className={`grid gap-x-4 gap-y-3 ${columns}`}>
      {items.map(item => <div key={item.label} className={item.wide ? "col-span-full border-b border-slate-100 pb-3" : ""}>
        <dt className="flex items-center gap-1.5 text-sm font-medium leading-5 text-slate-600">
          {item.color ? <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} /> : null}{item.label}
        </dt>
        <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-950">{number(item.value)}{item.percent === undefined ? null : <span className="ml-1.5 text-sm font-medium text-slate-500">({item.percent}%)</span>}</dd>
        {item.detail ? <p className="text-xs leading-4 text-slate-500">{item.detail}</p> : null}
      </div>)}
    </dl>
  </section>;
}

function Panel({ title, note, children, className = "" }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return <section className={`${panel} ${className}`}>
    <h2 className="mb-2 text-sm font-semibold text-slate-800">{title}{note ? <span className="font-normal text-slate-500"> · {note}</span> : null}</h2>
    {children}
  </section>;
}

function lessonPoint(label: string, counts: LessonCounts, sublabel?: string): ChartPoint {
  return { label, sublabel, values: { ...counts, absentCombined: counts.absent + counts.apologized } };
}

export default function AcademicStatistics({ data, tab, period, timeZone, isCurrentPeriod }: { data: AcademicStatisticsData; tab: Tab; period: Period; timeZone: string; isCurrentPeriod: boolean }) {
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
  const bucket = bucketNames[period];
  const resetKey = `${tab}:${period}:${data.period_start}`;
  const reportTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone });
  const { lessons, teachers, students } = data;
  const totals = lessons.totals;
  const weekAxis = period === "month" ? monthWeekAxis(data.period_start, data.period_end) : [];
  const axis = (index: number, label: string) => weekAxis.length === lessons.series.length ? weekAxis[index] : { label, sublabel: undefined };
  const lessonShares = sharePercents([totals.completed, totals.booked, totals.unbooked, totals.absent, totals.apologized, totals.cancelled]);
  const teacherBase = teachers.totals.total;
  const studentBase = students.totals.active;
  const lessonPoints = lessons.series.map((point, index) => lessonPoint(axis(index, point.label).label, point, axis(index, point.label).sublabel));
  const lessonMetrics = [
    { key: "total", label: "Total", color: colors.total },
    { key: "completed", label: "Completed", color: colors.completed },
    { key: "unbooked", label: "Unbooked", color: colors.unbooked },
    { key: "absentCombined", label: "Absent + absent with apology", color: colors.absent },
  ];
  const teacherPoints = teachers.series.map((point, index) => ({ ...axis(index, point.label), values: { total_lessons: point.total_lessons, completed_lessons: point.completed_lessons, engaged: point.engaged, new: point.new } }));
  const teacherAxisTitles = { left: "Lessons", right: "Teachers" };

  return <div className="workspace-stack">
    <div className="statistics-toolbar-container">
      <WorkspaceTabBar className="statistics-toolbar" label="Academic statistics views" tabs={tabs.map(option => ({ id: option.id, label: option.label, href: link(option.id), active: tab === option.id }))}>
        {period === "week" ? <p className="statistics-date-range mx-1 text-sm text-slate-600">{start} – {end} <span className="text-slate-500">{timeZoneOffset}</span></p> : null}
        <Link href={link(tab, period, null)} aria-current={isCurrentPeriod ? "date" : undefined} aria-label="Return to current period" className={`statistics-now-button inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium ${isCurrentPeriod ? "border-green-700 bg-green-50 text-green-900 hover:bg-green-100" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>Now</Link>
        <StatisticsPeriodPicker tab={tab} period={period} anchor={data.period_start} timeZone={timeZone} periodOptions={periods} />
      </WorkspaceTabBar>
    </div>
    <div className="workspace-panel-scroll space-y-2">
      {tab === "lesson" ? <>
        <div className="grid min-w-0 gap-2 xl:grid-cols-2">
          <MetricBox title="Lesson totals" columns="grid-cols-2 sm:grid-cols-3" items={[
            { label: "Total lessons", value: totals.total, percent: lessonShares.some(Boolean) ? 100 : 0, wide: true },
            { label: "Completed", value: totals.completed, percent: lessonShares[0], color: colors.completed },
            { label: "Booked", value: totals.booked, percent: lessonShares[1], color: colors.booked },
            { label: "Unbooked", value: totals.unbooked, percent: lessonShares[2], color: colors.unbooked },
            { label: "Absent", value: totals.absent, percent: lessonShares[3], color: colors.absent },
            { label: "Absent with apology", value: totals.apologized, percent: lessonShares[4], color: colors.apologized },
            { label: "Cancelled", value: totals.cancelled, percent: lessonShares[5], color: colors.cancelled },
          ]} />
          <Panel title="Lesson status mix" note="share of all lessons">
            <PieChart title="Lesson status mix" emptyLabel="No lessons" slices={[
              { label: "Completed", value: totals.completed, color: colors.completed },
              { label: "Booked", value: totals.booked, color: colors.booked },
              { label: "Unbooked", value: totals.unbooked, color: colors.unbooked },
              { label: "Absent", value: totals.absent, color: colors.absent },
              { label: "Absent with apology", value: totals.apologized, color: colors.apologized },
              { label: "Cancelled", value: totals.cancelled, color: colors.cancelled },
            ]} />
          </Panel>
        </div>
        <StatisticsChartPanel title="Lessons" note={`by ${bucket}`}
          column={<ColumnChart title={`Lessons by ${bucket}`} points={lessonPoints} metrics={lessonMetrics} />}
          line={<LineChart title={`Lesson trend by ${bucket}`} points={lessonPoints} metrics={lessonMetrics} />} />
      </> : tab === "teacher" ? <>
        <div className="grid min-w-0 gap-2 xl:grid-cols-[15rem_minmax(0,1fr)]">
          <MetricBox title="Teacher totals" items={[
            { label: "Total teachers", value: teachers.totals.total, percent: percentOf(teacherBase, teacherBase), detail: "Approved and active now" },
            { label: "Engaged teachers", value: teachers.totals.engaged, percent: percentOf(teachers.totals.engaged, teacherBase), detail: "Published a non-cancelled lesson" },
            { label: "New teachers", value: teachers.totals.new, percent: percentOf(teachers.totals.new, teacherBase), detail: "Approved in this period" },
          ]} />
          <StatisticsChartPanel title="Teaching activity" note={`by ${bucket}`}
            column={<ColumnChart title={`Teaching activity by ${bucket}`} points={teacherPoints} axisTitles={teacherAxisTitles} metrics={[
              { key: "total_lessons", label: "Total lessons", color: colors.lightLessons },
              { key: "completed_lessons", label: "Completed lessons", color: colors.completed, overlayOf: "total_lessons" },
              { key: "engaged", label: "Engaged teachers", color: colors.lightTeachers, axis: "right" },
              { key: "new", label: "New teachers", color: colors.booked, overlayOf: "engaged", axis: "right" },
            ]} />}
            line={<LineChart title={`Teaching activity trend by ${bucket}`} points={teacherPoints} axisTitles={teacherAxisTitles} metrics={[
              { key: "total_lessons", label: "Total lessons", color: colors.total },
              { key: "completed_lessons", label: "Completed lessons", color: colors.completed },
              { key: "engaged", label: "Engaged teachers", color: colors.booked, axis: "right" },
              { key: "new", label: "New teachers", color: colors.cancelled, axis: "right" },
            ]} />} />
        </div>
        <Panel title="Engaged teachers" note="most lessons first" className="statistics-table statistics-table-tall">
          <PaginatedTable caption="Engaged teachers" columns={5} tableClassName="min-w-[560px]" initialPageSize={25} resetKey={resetKey} initialSort={{ index: 2, descending: true }} emptyMessage="No teacher published a lesson in this period."
            headers={<tr><th scope="col" className={th}>Name</th><th scope="col" className={th}>ID</th><th scope="col" className={th}>Total lessons</th><th scope="col" className={th}>Completed lessons</th><th scope="col" className={th}>Students taught</th></tr>}>
            {teachers.rows.map(row => <tr key={row.member_code} className="hover:bg-slate-50/70">
              <th scope="row" className="px-4 py-3 font-medium text-slate-900">{row.full_name}</th>
              <td className={td}>{row.member_number ?? "-"}</td>
              <td className={td}>{number(row.total_lessons)}</td>
              <td className={td}>{number(row.completed_lessons)}</td>
              <td className={td}>{number(row.students_taught)}</td>
            </tr>)}
          </PaginatedTable>
        </Panel>
      </> : <>
        <div className="grid min-w-0 gap-2 xl:grid-cols-[15rem_minmax(0,1fr)]">
          <MetricBox title="Student totals" items={[
            { label: "Total active students", value: students.totals.active, percent: percentOf(studentBase, studentBase), detail: "Approved and active now" },
            { label: "Total engaged students", value: students.totals.engaged, percent: percentOf(students.totals.engaged, studentBase), detail: "Attended a lesson in this period" },
            { label: "Banned / suspended students", value: students.totals.restricted, percent: percentOf(students.totals.restricted, studentBase), detail: "Current status" },
          ]} />
          <Panel title="Banned / suspended students" note="current status" className="statistics-table">
            <PaginatedTable caption="Banned and suspended students" columns={5} tableClassName="min-w-[640px]" resetKey={resetKey} initialSort={{ index: 0, descending: false }} emptyMessage="No students are banned or suspended."
              headers={<tr><th scope="col" className={th}>ID</th><th scope="col" className={th}>Name</th><th scope="col" className={th}>Status</th><th scope="col" className={th}>Teacher reported</th><th scope="col" className={th}>Date/Time</th></tr>}>
              {students.restricted_rows.map(row => <tr key={row.member_code} className="hover:bg-slate-50/70">
                <td className={td}>{row.member_number ?? "-"}</td>
                <th scope="row" className="px-4 py-3 font-medium text-slate-900">{row.full_name}</th>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${row.status === "banned" ? "bg-rose-50 text-rose-900" : "bg-amber-50 text-amber-900"}`}>{row.status}</span></td>
                <td className="px-4 py-3">{row.teacher_name ?? "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums" data-sort-value={row.reported_at ?? ""}>{row.reported_at ? reportTime.format(new Date(row.reported_at)) : "-"}</td>
              </tr>)}
            </PaginatedTable>
          </Panel>
        </div>
        <Panel title="Engaged students" note="most attended lessons first" className="statistics-table statistics-table-tall">
          <PaginatedTable caption="Engaged students" columns={4} tableClassName="min-w-[480px]" initialPageSize={25} resetKey={resetKey} initialSort={{ index: 3, descending: true }} emptyMessage="No student attended a lesson in this period."
            headers={<tr><th scope="col" className={th}>Rank</th><th scope="col" className={th}>Name</th><th scope="col" className={th}>ID</th><th scope="col" className={th}>Total attended lessons</th></tr>}>
            {students.engaged_rows.map((row, index) => <tr key={row.member_code} className="hover:bg-slate-50/70">
              <td className={`${td} text-slate-500`}>{index + 1}</td>
              <th scope="row" className="px-4 py-3 font-medium text-slate-900">{row.full_name}</th>
              <td className={td}>{row.member_number ?? "-"}</td>
              <td className={td}>{number(row.lessons_attended)}</td>
            </tr>)}
          </PaginatedTable>
        </Panel>
        <div className="grid min-w-0 gap-2 xl:grid-cols-2">
          <Panel title="Students by lessons attended" note={`this ${period}`}>
            <ColumnChart title="Number of students by lessons attended" showValues compact points={students.distribution.map(bin => ({ label: bin.label, values: { students: bin.students } }))} metrics={[{ key: "students", label: "Students", color: colors.completed }]} />
          </Panel>
          <Panel title="Study trend" note={`by ${bucket}`}>
            <LineChart compact title={`Study trend by ${bucket}`} points={students.series.map((point, index) => ({ ...axis(index, point.label), values: { lessons_attended: point.lessons_attended, engaged: point.engaged } }))} metrics={[
              { key: "lessons_attended", label: "Lessons attended", color: colors.completed },
              { key: "engaged", label: "Engaged students", color: colors.booked },
            ]} />
          </Panel>
        </div>
      </>}
    </div>
  </div>;
}

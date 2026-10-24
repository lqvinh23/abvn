"use client";

import { useRouter } from "next/navigation";
import { statisticsAnchorForSelection, statisticsSelection, statisticsWeeksInIsoYear, type StatisticsPeriod } from "@/src/lib/platform/dashboard";
import { Select } from "./Fields";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function StatisticsPeriodPicker({ tab, period, anchor, timeZone, periodOptions }: {
  tab: "lesson" | "teacher" | "student";
  period: StatisticsPeriod;
  anchor: string;
  timeZone: string;
  periodOptions: { id: StatisticsPeriod; label: string }[];
}) {
  const router = useRouter();
  const selection = statisticsSelection(anchor, period);
  if (!selection) throw new Error("The selected statistics period is invalid. Refresh and try again.");
  const localYear = Number(new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(new Date()));
  const availableYears = new Set(Array.from({ length: 102 }, (_, index) => Math.max(1, localYear - 100 + index)));
  availableYears.add(selection.year);
  availableYears.add(localYear + 1);
  const years = [...availableYears].filter(year => year <= 9999).sort((left, right) => right - left);
  const bucketCount = period === "week" ? statisticsWeeksInIsoYear(selection.year) : period === "month" ? 12 : period === "quarter" ? 4 : 1;
  const bucketLabel = period === "week" ? "Week of year" : period === "month" ? "Month" : "Quarter";

  function navigate(year: number, bucket: number) {
    const nextAnchor = statisticsAnchorForSelection(period, year, bucket);
    if (!nextAnchor) throw new Error("The selected statistics period is invalid.");
    const params = new URLSearchParams({ view: "statistics", tab, period, anchor: nextAnchor });
    router.push(`/dashboard/admin?${params}`, { scroll: false });
  }

  function navigatePeriod(nextPeriod: StatisticsPeriod) {
    const params = new URLSearchParams({ view: "statistics", tab, period: nextPeriod });
    router.push(`/dashboard/admin?${params}`, { scroll: false });
  }

  return <>
    <div data-workspace-navigation className="statistics-period-date-selects">
      {period !== "year" ? <div className={`statistics-period-bucket-select statistics-period-bucket-${period}`}>
        <Select compact hideLabel label={bucketLabel} value={selection.bucket} onValueChange={value => navigate(selection.year, Number(value))}>
          {(period === "week"
            ? Array.from({ length: bucketCount }, (_, index) => ({ value: index + 1, label: `Week ${index + 1}` }))
            : period === "month"
              ? months.map((label, index) => ({ value: index + 1, label }))
              : Array.from({ length: 4 }, (_, index) => ({ value: index + 1, label: `Quarter ${index + 1}` }))
          ).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div> : null}
      <div className="statistics-period-year-select">
        <Select compact hideLabel label="Year" value={selection.year} onValueChange={value => {
          const year = Number(value);
          const maxBucket = period === "week" ? statisticsWeeksInIsoYear(year) : bucketCount;
          navigate(year, Math.min(selection.bucket, maxBucket));
        }}>
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </Select>
      </div>
    </div>
    <nav aria-label="Reporting period" className="statistics-period-tabs flex flex-nowrap gap-0.5 rounded-lg bg-slate-100 p-1">
      {periodOptions.map(option => <button key={option.id} type="button" data-workspace-navigation aria-current={period === option.id ? "page" : undefined} onClick={() => navigatePeriod(option.id)} className={`inline-flex min-h-11 shrink-0 items-center rounded-md px-2.5 text-sm font-medium ${period === option.id ? "bg-white text-green-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{option.label}</button>)}
    </nav>
    <div data-workspace-navigation className="statistics-period-select">
      <Select compact hideLabel label="Reporting period" value={period} onValueChange={value => {
        const nextPeriod = periodOptions.find(option => option.id === value)?.id;
        if (!nextPeriod) throw new Error("The selected reporting period is invalid.");
        navigatePeriod(nextPeriod);
      }}>
        {periodOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </Select>
    </div>
  </>;
}

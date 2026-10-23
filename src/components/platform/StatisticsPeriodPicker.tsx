"use client";

import { useRouter } from "next/navigation";
import { statisticsAnchorForSelection, statisticsSelection, statisticsWeeksInIsoYear, type StatisticsPeriod } from "@/src/lib/platform/dashboard";
import { Select } from "./Fields";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function StatisticsPeriodPicker({ tab, period, anchor, timeZone }: {
  tab: "lesson" | "teacher" | "student";
  period: StatisticsPeriod;
  anchor: string;
  timeZone: string;
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
  const bucketOptions = period === "week"
    ? Array.from({ length: bucketCount }, (_, index) => ({ value: index + 1, label: `Week ${index + 1}` }))
    : period === "month"
      ? months.map((label, index) => ({ value: index + 1, label }))
      : period === "quarter"
        ? Array.from({ length: 4 }, (_, index) => ({ value: index + 1, label: `Quarter ${index + 1}` }))
        : [];

  function navigate(year: number, bucket: number) {
    const nextAnchor = statisticsAnchorForSelection(period, year, bucket);
    if (!nextAnchor) throw new Error("The selected statistics period is invalid.");
    const params = new URLSearchParams({ view: "statistics", tab, period, anchor: nextAnchor });
    router.push(`/dashboard/admin?${params}`, { scroll: false });
  }

  return <div className="flex flex-wrap items-center gap-2">
    {period !== "year" ? <div className="w-36">
      <Select compact hideLabel label={period === "week" ? "Week of year" : period === "month" ? "Month" : "Quarter"} value={selection.bucket} onValueChange={value => navigate(selection.year, Number(value))}>
        {bucketOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    </div> : null}
    <div className="w-28">
      <Select compact hideLabel label="Year" value={selection.year} onValueChange={value => {
        const year = Number(value);
        const maxBucket = period === "week" ? statisticsWeeksInIsoYear(year) : bucketCount;
        navigate(year, Math.min(selection.bucket, maxBucket));
      }}>
        {years.map(year => <option key={year} value={year}>{year}</option>)}
      </Select>
    </div>
  </div>;
}

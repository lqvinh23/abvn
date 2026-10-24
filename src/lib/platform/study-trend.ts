import { DateTime } from "luxon";
import type { ChartPoint } from "../../components/platform/StatisticsCharts";

export type TrendRange = "6m" | "3m" | "1m";

// Months for 6 months, weeks (Monday start) for 3 months and days for 1 month.
export function studyTrendPoints(attendedAt: string[], range: TrendRange, timeZone: string, now: number): ChartPoint[] {
  const today = DateTime.fromMillis(now, { zone: timeZone }).startOf("day");
  const unit = range === "6m" ? "month" : range === "3m" ? "week" : "day";
  const count = range === "6m" ? 6 : range === "3m" ? 13 : 30;
  const first = today.startOf(unit).minus({ [`${unit}s`]: count - 1 });
  const buckets = Array.from({ length: count }, (_, index) => first.plus({ [`${unit}s`]: index }));
  const counts = new Map<number, number>();
  for (const iso of attendedAt) {
    const started = DateTime.fromISO(iso, { zone: timeZone });
    if (!started.isValid || started.toMillis() > now) continue;
    const key = started.startOf(unit).toMillis();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((bucket, index) => ({
    label: range === "6m" ? bucket.toFormat("LLL") : range === "3m" ? bucket.toFormat("d/M") : bucket.toFormat("d"),
    sublabel: range === "6m" ? bucket.toFormat("yyyy") : range === "3m" ? undefined : index === 0 || bucket.day === 1 ? bucket.toFormat("LLL") : undefined,
    values: { attended: counts.get(bucket.toMillis()) ?? 0 },
  }));
}

export function niceScale(max: number) {
  const peak = Math.max(1, Math.ceil(max));
  const rough = peak / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map(multiplier => multiplier * magnitude).find(value => value >= rough) ?? 10 * magnitude);
  const top = Math.ceil(peak / step) * step;
  return { step, top, ticks: Array.from({ length: top / step + 1 }, (_, index) => index * step) };
}

export function pieSegments(values: number[]) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  let offset = 0;
  return values.map(value => {
    const fraction = total ? Math.max(0, value) / total : 0;
    const segment = { fraction, offset };
    offset += fraction;
    return segment;
  });
}

// Scales for two y axes that share the same grid lines, so each axis labels the same number of intervals.
export function alignedScales(maxima: number[]) {
  const steps = [1, 2, 3, 4, 5, 6, 8, 10];
  const stepFor = (max: number, intervals: number) => {
    const raw = Math.max(1, Math.ceil(max / intervals));
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    return steps.map(multiplier => multiplier * magnitude).find(value => value >= raw) ?? 10 * magnitude;
  };
  const waste = (intervals: number) => maxima.reduce((sum, max) => sum + stepFor(max, intervals) * intervals / Math.max(1, max), 0);
  const intervals = [4, 5, 3, 6].reduce((best, candidate) => waste(candidate) < waste(best) ? candidate : best);
  return {
    intervals,
    scales: maxima.map(max => {
      const step = stepFor(max, intervals);
      return { step, top: step * intervals, ticks: Array.from({ length: intervals + 1 }, (_, index) => index * step) };
    }),
  };
}

// Whole-number percentages that always add up to exactly 100 when there is any data.
export function sharePercents(values: number[]) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (!total) return values.map(() => 0);
  const exact = values.map(value => Math.max(0, value) / total * 100);
  const percents = exact.map(Math.floor);
  let remaining = 100 - percents.reduce((sum, value) => sum + value, 0);
  exact.map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index)
    .forEach(({ index }) => { if (remaining-- > 0) percents[index] += 1; });
  return percents;
}

export function percentOf(value: number, base: number) {
  return base > 0 ? Math.round(value / base * 100) : 0;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Whole Monday-Sunday ISO weeks touching a month: "Week 43" with "(Oct, 19-25)",
// or "Week 40" with "(Sep 28 - Oct 4)" when the week spans two months.
export function monthWeekAxis(periodStart: string, periodEnd: string) {
  const end = new Date(`${periodEnd}T00:00:00Z`);
  const axis: { label: string; sublabel: string }[] = [];
  const first = new Date(`${periodStart}T00:00:00Z`);
  first.setUTCDate(first.getUTCDate() + 1 - (first.getUTCDay() || 7));
  for (let monday = first; monday < end;) {
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    const thursday = new Date(monday);
    thursday.setUTCDate(thursday.getUTCDate() + 3);
    const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - (firstThursday.getUTCDay() || 7));
    const week = Math.round((thursday.getTime() - firstThursday.getTime()) / 604_800_000) + 1;
    const startMonth = monthNames[monday.getUTCMonth()];
    const endMonth = monthNames[sunday.getUTCMonth()];
    axis.push({
      label: `Week ${week}`,
      sublabel: startMonth === endMonth
        ? `(${startMonth}, ${monday.getUTCDate()}-${sunday.getUTCDate()})`
        : `(${startMonth} ${monday.getUTCDate()} - ${endMonth} ${sunday.getUTCDate()})`,
    });
    monday = new Date(monday);
    monday.setUTCDate(monday.getUTCDate() + 7);
  }
  return axis;
}

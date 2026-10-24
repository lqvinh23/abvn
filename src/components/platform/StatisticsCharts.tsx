import { alignedScales, niceScale, pieSegments, sharePercents } from "@/src/lib/platform/statistics-chart";

export type ChartMetric = {
  key: string;
  label: string;
  color: string;
  // Drawn as a narrower bar on top of another metric instead of taking its own column.
  overlayOf?: string;
  // Measured against the right-hand axis; lines on that axis are dashed.
  axis?: "right";
};
export type ChartPoint = { label: string; sublabel?: string; values: Record<string, number> };
export type AxisTitles = { left: string; right: string };

const pointName = (point: ChartPoint) => point.sublabel ? `${point.label} ${point.sublabel}` : point.label;

const number = (value: number) => value.toLocaleString("en-US");
const fullWidth = 840;
const compactWidth = 480;
const height = 220;
const left = 34;

function layout(points: ChartPoint[], metrics: ChartMetric[], width: number) {
  const peak = (selected: ChartMetric[]) => Math.max(1, ...points.flatMap(point => selected.map(metric => point.values[metric.key] ?? 0)));
  const dual = metrics.some(metric => metric.axis === "right");
  const scales = dual
    ? alignedScales([peak(metrics.filter(metric => metric.axis !== "right")), peak(metrics.filter(metric => metric.axis === "right"))]).scales
    : [niceScale(peak(metrics))];
  const top = dual ? 24 : 12;
  const right = dual ? 34 : 0;
  const plotHeight = height - top - (points.some(point => point.sublabel) ? 46 : 30);
  const slotWidth = (width - left - right) / Math.max(points.length, 1);
  const scaleFor = (metric: ChartMetric) => metric.axis === "right" ? scales[1] : scales[0];
  const yFor = (metric: ChartMetric, value: number) => top + plotHeight - value / scaleFor(metric).top * plotHeight;
  return { dual, scales, top, right, plotHeight, slotWidth, scaleFor, yFor };
}
type Layout = ReturnType<typeof layout>;

function Legend({ metrics, title }: { metrics: ChartMetric[]; title: string }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-1" aria-label={`${title} legend`}>
    {metrics.map(metric => <span key={metric.key} className="inline-flex items-center gap-1.5 text-sm text-slate-600"><span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: metric.color }} />{metric.label}</span>)}
  </div>;
}

function DataTable({ title, points, metrics }: { title: string; points: ChartPoint[]; metrics: ChartMetric[] }) {
  return <table className="sr-only">
    <caption>{title} data</caption>
    <thead><tr><th scope="col">Period</th>{metrics.map(metric => <th scope="col" key={metric.key}>{metric.label}</th>)}</tr></thead>
    <tbody>{points.map((point, index) => <tr key={`${point.label}-${index}`}><th scope="row">{pointName(point)}</th>{metrics.map(metric => <td key={metric.key}>{point.values[metric.key] ?? 0}</td>)}</tr>)}</tbody>
  </table>;
}

function Axes({ geometry, points, width, titles }: { geometry: Layout; points: ChartPoint[]; width: number; titles?: AxisTitles }) {
  const { scales, top, right, plotHeight, slotWidth, dual } = geometry;
  const twoLines = points.some(point => point.sublabel);
  const labelEvery = Math.max(1, Math.ceil(points.length / 12));
  const [primary, secondary] = scales;
  return <>
    {dual && titles ? <>
      <text x={0} y={10} fontSize="10" fontWeight="600" fill="#475569">{titles.left}</text>
      <text x={width} y={10} textAnchor="end" fontSize="10" fontWeight="600" fill="#475569">{titles.right}</text>
    </> : null}
    {primary.ticks.map((tick, index) => {
      const y = top + plotHeight - tick / primary.top * plotHeight;
      return <g key={tick}>
        <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={tick ? "3 4" : undefined} />
        <text x={left - 6} y={y + 3.5} textAnchor="end" fontSize="11" fill="#64748b">{tick}</text>
        {dual && secondary ? <text x={width - right + 6} y={y + 3.5} fontSize="11" fill="#64748b">{secondary.ticks[index]}</text> : null}
      </g>;
    })}
    {points.map((point, index) => index % labelEvery === 0 || index === points.length - 1
      ? <text key={`${point.label}-${index}`} x={left + slotWidth * (index + 0.5)} y={twoLines ? height - 22 : height - 9} textAnchor="middle" fontSize="11" fill="#475569">
        {point.label}
        {point.sublabel ? <tspan x={left + slotWidth * (index + 0.5)} dy="14" fontSize="10" fill="#64748b">{point.sublabel}</tspan> : null}
      </text>
      : null)}
  </>;
}

export function ColumnChart({ points, metrics, title, showValues = false, compact = false, axisTitles }: { points: ChartPoint[]; metrics: ChartMetric[]; title: string; showValues?: boolean; compact?: boolean; axisTitles?: AxisTitles }) {
  const width = compact ? compactWidth : fullWidth;
  const columns = metrics.filter(metric => !metric.overlayOf);
  const geometry = layout(points, metrics, width);
  const { slotWidth, plotHeight, top } = geometry;
  const gap = 3;
  const barWidth = Math.max(3, Math.min(34, (slotWidth * 0.78 - gap * (columns.length - 1)) / columns.length));
  const groupWidth = columns.length * barWidth + (columns.length - 1) * gap;
  const barHeight = (metric: ChartMetric, value: number) => value / geometry.scaleFor(metric).top * plotHeight;
  return <div className="min-w-0">
    <Legend metrics={metrics} title={title} />
    <div className="overflow-x-auto">
      <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className={`mt-2 w-full ${compact ? "min-w-[360px]" : "min-w-[560px]"}`}>
        <title>{title}</title>
        <Axes geometry={geometry} points={points} width={width} titles={axisTitles} />
        {points.map((point, pointIndex) => {
          const groupX = left + slotWidth * pointIndex + (slotWidth - groupWidth) / 2;
          const summary = metrics.map(metric => `${metric.label} ${point.values[metric.key] ?? 0}`).join(", ");
          return <g key={`${point.label}-${pointIndex}`}>
            <title>{`${pointName(point)}: ${summary}`}</title>
            {columns.map((metric, columnIndex) => {
              const value = point.values[metric.key] ?? 0;
              const x = groupX + columnIndex * (barWidth + gap);
              const h = barHeight(metric, value);
              const y = top + plotHeight - h;
              const overlay = metrics.find(candidate => candidate.overlayOf === metric.key);
              const overlayValue = overlay ? point.values[overlay.key] ?? 0 : 0;
              const overlayWidth = barWidth * 0.55;
              const overlayHeight = overlay ? barHeight(overlay, overlayValue) : 0;
              return <g key={metric.key}>
                {value > 0 ? <rect x={x} y={y} width={barWidth} height={h} rx="2" fill={metric.color} /> : null}
                {overlay && overlayValue > 0 ? <rect x={x + (barWidth - overlayWidth) / 2} y={top + plotHeight - overlayHeight} width={overlayWidth} height={overlayHeight} rx="2" fill={overlay.color} /> : null}
                {showValues && value > 0 ? <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155">{number(value)}</text> : null}
              </g>;
            })}
          </g>;
        })}
      </svg>
    </div>
    <DataTable title={title} points={points} metrics={metrics} />
  </div>;
}

export function LineChart({ points, metrics, title, compact = false, axisTitles }: { points: ChartPoint[]; metrics: ChartMetric[]; title: string; compact?: boolean; axisTitles?: AxisTitles }) {
  const width = compact ? compactWidth : fullWidth;
  const geometry = layout(points, metrics, width);
  const { slotWidth } = geometry;
  const position = (metric: ChartMetric, index: number, value: number) => ({ x: left + slotWidth * (index + 0.5), y: geometry.yFor(metric, value) });
  return <div className="min-w-0">
    <Legend metrics={metrics} title={title} />
    <div className="overflow-x-auto">
      <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className={`mt-2 w-full ${compact ? "min-w-[360px]" : "min-w-[560px]"}`}>
        <title>{title}</title>
        <Axes geometry={geometry} points={points} width={width} titles={axisTitles} />
        {metrics.map(metric => {
          const coordinates = points.map((point, index) => position(metric, index, point.values[metric.key] ?? 0));
          return <g key={metric.key}>
            <polyline fill="none" stroke={metric.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={metric.axis === "right" ? "7 4" : undefined} points={coordinates.map(({ x, y }) => `${x},${y}`).join(" ")} />
            {coordinates.map(({ x, y }, index) => <circle key={`${points[index].label}-${index}`} cx={x} cy={y} r="3.5" fill="#fff" stroke={metric.color} strokeWidth="2"><title>{`${pointName(points[index])}: ${metric.label} ${points[index].values[metric.key] ?? 0}`}</title></circle>)}
          </g>;
        })}
      </svg>
    </div>
    <DataTable title={title} points={points} metrics={metrics} />
  </div>;
}

export function PieChart({ slices, title, emptyLabel }: { slices: { label: string; value: number; color: string }[]; title: string; emptyLabel: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const segments = pieSegments(slices.map(slice => slice.value));
  const percents = sharePercents(slices.map(slice => slice.value));
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  return <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-8 gap-y-3">
    <svg role="img" aria-label={title} viewBox="0 0 100 100" className="size-44 shrink-0 sm:size-48">
      <title>{title}</title>
      {total === 0
        ? <circle cx="50" cy="50" r="50" fill="#f1f5f9" />
        : slices.map((slice, index) => segments[index].fraction > 0
          ? <circle key={slice.label} cx="50" cy="50" r={radius} fill="none" stroke={slice.color} strokeWidth={radius * 2} strokeDasharray={`${segments[index].fraction * circumference} ${circumference}`} strokeDashoffset={-segments[index].offset * circumference} transform="rotate(-90 50 50)"><title>{`${slice.label}: ${number(slice.value)} (${percents[index]}%)`}</title></circle>
          : null)}
      {total === 0 ? <text x="50" y="52" textAnchor="middle" fontSize="6" fill="#64748b">{emptyLabel}</text> : null}
    </svg>
    <ul className="min-w-0 space-y-1.5 text-sm">
      {slices.map((slice, index) => <li key={slice.label} className="flex items-center justify-between gap-6">
        <span className="inline-flex items-center gap-2 text-slate-700"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: slice.color }} />{slice.label}</span>
        <span className="tabular-nums text-slate-600">{total ? `${percents[index]}%` : "-"}</span>
      </li>)}
    </ul>
  </div>;
}

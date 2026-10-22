"use client";

import { Children, Fragment, cloneElement, isValidElement, useState, type ReactNode } from "react";
import { tablePage } from "@/src/lib/platform/table-pagination";
import TablePagination from "./TablePagination";

function cellText(node: ReactNode): string {
  return Children.toArray(node).map(child => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (!isValidElement<{ children?: ReactNode; value?: string | number; "data-sort-value"?: string | number }>(child)) return "";
    if (child.props["data-sort-value"] !== undefined) return String(child.props["data-sort-value"]);
    return child.props.value !== undefined ? String(child.props.value) : cellText(child.props.children);
  }).join(" ");
}

function tableCells(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap(child => isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? tableCells(child.props.children) : [child]);
}

export default function PaginatedTable({ caption, headers, children, columns, resetKey = "", tableClassName = "", emptyMessage = "No matching records.", paginate = true, initialSort }: {
  caption: string; headers: ReactNode; children: ReactNode; columns: number;
  resetKey?: string; tableClassName?: string; emptyMessage?: string; paginate?: boolean;
  initialSort?: { index: number; descending: boolean };
}) {
  const rows = Children.toArray(children);
  const [size, setSize] = useState(10);
  const [requestedPage, setPage] = useState(1);
  const [previousKey, setPreviousKey] = useState(resetKey);
  const [sort, setSort] = useState<{ index: number; descending: boolean } | null>(initialSort ?? null);
  if (resetKey !== previousKey) {
    setPreviousKey(resetKey);
    setPage(1);
  }
  const { page, start, end } = tablePage(rows.length, requestedPage, size);
  const orderedRows = sort ? rows.toSorted((a, b) => {
    const value = (row: ReactNode) => isValidElement<{ children?: ReactNode }>(row) ? cellText(tableCells(row.props.children)[sort.index]) : "";
    return value(a).localeCompare(value(b), undefined, { numeric: true, sensitivity: "base" }) * (sort.descending ? -1 : 1);
  }) : rows;
  const labels = Children.toArray(headers).flatMap(row => isValidElement<{ children?: ReactNode }>(row) ? tableCells(row.props.children).map(cellText) : []);
  const displayRows = (paginate ? orderedRows.slice(start, end) : orderedRows).map(row => isValidElement<{ children?: ReactNode }>(row)
    ? cloneElement(row, {}, tableCells(row.props.children).map((cell, index) => isValidElement<{ "data-label"?: string }>(cell) ? cloneElement(cell, { key: index, "data-label": labels[index] }) : cell))
    : row);
  const sortableHeaders = paginate ? Children.map(headers, row => isValidElement<{ children?: ReactNode }>(row) ? cloneElement(row, {}, Children.map(row.props.children, (cell, index) => {
    if (!isValidElement<{ children?: ReactNode; "aria-sort"?: string }>(cell) || cell.type !== "th" || ["Actions", "Image"].includes(cellText(cell)) || cell.props["aria-sort"]) return cell;
    const selected = sort?.index === index;
    return cloneElement(cell, { "aria-sort": selected ? sort.descending ? "descending" : "ascending" : "none" }, <button type="button" className="inline-flex min-h-11 items-center gap-2 text-left hover:text-green-800" onClick={() => { setSort({ index, descending: selected && !sort.descending }); setPage(1); }}>{cell.props.children}{selected ? <span aria-hidden="true" className="text-green-800">{sort.descending ? "↓" : "↑"}</span> : null}</button>);
  })) : row) : headers;
  return <div className="workspace-table">
    <div role="region" aria-label={`${caption} rows`} tabIndex={0} className="workspace-table-scroll rounded-lg border border-slate-200">
      <table className={`w-full text-left text-sm ${tableClassName}`}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">{sortableHeaders}</thead>
        <tbody className="divide-y divide-slate-100">{rows.length ? displayRows : <tr><td colSpan={columns} className="p-6 text-center text-slate-500">{emptyMessage}</td></tr>}</tbody>
      </table>
    </div>
    {paginate ? <TablePagination label={`${caption} pagination`} total={rows.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={value => { setSize(value); setPage(1); }} /> : null}
  </div>;
}

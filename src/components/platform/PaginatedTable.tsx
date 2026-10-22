"use client";

import { Children, useState, type ReactNode } from "react";
import { tablePage } from "@/src/lib/platform/table-pagination";
import { Select } from "./Fields";
import ActionIcon from "./ActionIcon";

export default function PaginatedTable({ caption, headers, children, columns, resetKey = "", tableClassName = "", emptyMessage = "No matching records." }: {
  caption: string; headers: ReactNode; children: ReactNode; columns: number;
  resetKey?: string; tableClassName?: string; emptyMessage?: string;
}) {
  const rows = Children.toArray(children);
  const [size, setSize] = useState(10);
  const [requestedPage, setPage] = useState(1);
  const [previousKey, setPreviousKey] = useState(resetKey);
  if (resetKey !== previousKey) {
    setPreviousKey(resetKey);
    setPage(1);
  }
  const { page, pages, start, end } = tablePage(rows.length, requestedPage, size);
  return <div className="min-w-0">
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className={`w-full text-left text-sm ${tableClassName}`}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">{headers}</thead>
        <tbody className="divide-y divide-slate-100">{rows.length ? rows.slice(start, end) : <tr><td colSpan={columns} className="p-6 text-center text-slate-500">{emptyMessage}</td></tr>}</tbody>
      </table>
    </div>
    <nav aria-label={`${caption} pagination`} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm text-slate-600">
      <span role="status">{rows.length ? start + 1 : 0}–{end} of {rows.length}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Select compact label="Rows per page" hideLabel value={String(size)} onValueChange={value => { setSize(Number(value)); setPage(1); }}>{[10, 25, 50, 100].map(value => <option key={value} value={value}>{value} rows</option>)}</Select>
        <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage(page - 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"><ActionIcon name="left" /></button>
        <span className="whitespace-nowrap">Page {page} of {pages}</span>
        <button type="button" aria-label="Next page" disabled={page === pages} onClick={() => setPage(page + 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"><ActionIcon name="right" /></button>
      </div>
    </nav>
  </div>;
}

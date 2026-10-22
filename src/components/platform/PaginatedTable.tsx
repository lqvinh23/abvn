"use client";

import { Children, useState, type ReactNode } from "react";
import { tablePage } from "@/src/lib/platform/table-pagination";
import TablePagination from "./TablePagination";

export default function PaginatedTable({ caption, headers, children, columns, resetKey = "", tableClassName = "", emptyMessage = "No matching records.", paginate = true }: {
  caption: string; headers: ReactNode; children: ReactNode; columns: number;
  resetKey?: string; tableClassName?: string; emptyMessage?: string; paginate?: boolean;
}) {
  const rows = Children.toArray(children);
  const [size, setSize] = useState(10);
  const [requestedPage, setPage] = useState(1);
  const [previousKey, setPreviousKey] = useState(resetKey);
  if (resetKey !== previousKey) {
    setPreviousKey(resetKey);
    setPage(1);
  }
  const { page, start, end } = tablePage(rows.length, requestedPage, size);
  return <div className="min-w-0">
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className={`w-full text-left text-sm ${tableClassName}`}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">{headers}</thead>
        <tbody className="divide-y divide-slate-100">{rows.length ? paginate ? rows.slice(start, end) : rows : <tr><td colSpan={columns} className="p-6 text-center text-slate-500">{emptyMessage}</td></tr>}</tbody>
      </table>
    </div>
    {paginate ? <TablePagination label={`${caption} pagination`} total={rows.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={value => { setSize(value); setPage(1); }} /> : null}
  </div>;
}

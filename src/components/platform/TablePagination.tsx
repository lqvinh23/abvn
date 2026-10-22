"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { tablePage, tablePageHref } from "@/src/lib/platform/table-pagination";
import { Select } from "./Fields";
import ActionIcon from "./ActionIcon";

type Props = {
  total: number;
  page: number;
  pageSize: number;
  label: string;
  local?: boolean;
} & ({
  href: string;
  onPageChange?: never;
  onPageSizeChange?: never;
} | {
  href?: never;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
});

export default function TablePagination(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { page, pages, start, end } = tablePage(props.total, props.page, props.pageSize);
  function changePage(next: number) {
    if (props.href !== undefined) {
      const href = tablePageHref(props.href, next, props.pageSize);
      if (props.local) window.history.replaceState(null, "", href);
      else startTransition(() => router.push(href, { scroll: false }));
    } else props.onPageChange(next);
  }
  function changeSize(value: string) {
    const size = Number(value);
    if (props.href !== undefined) {
      const href = tablePageHref(props.href, 1, size);
      if (props.local) window.history.replaceState(null, "", href);
      else startTransition(() => router.push(href, { scroll: false }));
    } else props.onPageSizeChange(size);
  }
  return <nav aria-label={props.label} aria-busy={pending} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm text-slate-600">
    <span role="status">{props.total ? start + 1 : 0}–{end} of {props.total}</span>
    <div className="flex flex-wrap items-center gap-2">
      <Select compact label="Rows per page" hideLabel disabled={pending} value={String(props.pageSize)} onValueChange={changeSize}>{[10, 25, 50, 100].map(value => <option key={value} value={value}>{value} rows</option>)}</Select>
      <button type="button" aria-label="Previous page" disabled={pending || page === 1} onClick={() => changePage(page - 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"><ActionIcon name="left" /></button>
      <span className="whitespace-nowrap">Page {page} of {pages}</span>
      <button type="button" aria-label="Next page" disabled={pending || page === pages} onClick={() => changePage(page + 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"><ActionIcon name="right" /></button>
    </div>
  </nav>;
}

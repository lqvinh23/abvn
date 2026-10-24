"use client";

import { useId, useTransition, type FormEvent } from "react";
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
  const pageInputId = useId();
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
  function jumpToPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("page") as HTMLInputElement;
    const requested = Number.parseInt(input.value, 10);
    const target = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), pages) : page;
    input.value = String(target);
    if (target !== page) changePage(target);
  }
  return <nav aria-label={props.label} aria-busy={pending} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm text-slate-600">
    <span role="status">{props.total ? start + 1 : 0}–{end} of {props.total}</span>
    <div className="flex flex-wrap items-center gap-2">
      <Select compact label="Rows per page" hideLabel disabled={pending} value={String(props.pageSize)} onValueChange={changeSize}>{[10, 25, 50, 100].map(value => <option key={value} value={value}>{value} rows</option>)}</Select>
      <button type="button" aria-label="Previous page" disabled={pending || page === 1} onClick={() => changePage(page - 1)} className="button-secondary inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border disabled:opacity-40"><ActionIcon name="left" /></button>
      <form onSubmit={jumpToPage} className="flex items-center gap-2 whitespace-nowrap">
        <label htmlFor={pageInputId}>Page</label>
        <input id={pageInputId} key={page} name="page" type="text" inputMode="numeric" autoComplete="off" disabled={pending} defaultValue={page} onBlur={event => { event.currentTarget.value = String(page); }} aria-describedby={`${pageInputId}-total`} className="min-h-11 w-14 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm text-slate-950 focus:border-(--primary) focus:outline-2 focus:outline-(--primary) disabled:cursor-not-allowed disabled:bg-slate-100" />
        <span id={`${pageInputId}-total`}>of {pages}</span>
      </form>
      <button type="button" aria-label="Next page" disabled={pending || page === pages} onClick={() => changePage(page + 1)} className="button-secondary inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border disabled:opacity-40"><ActionIcon name="right" /></button>
    </div>
  </nav>;
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition, type ReactNode } from "react";
import ActionIcon from "./ActionIcon";

export default function AutoFilters({ children, label, clearHref, local = false }: { children: ReactNode; label: string; clearHref: string; local?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef("");
  const navigate = useCallback((delay: number, override?: { name: string; value: string }) => {
    if (timer.current) clearTimeout(timer.current);
    const params = new URLSearchParams(query);
    for (const [name, value] of new FormData(form.current!)) if (typeof value === "string") params.set(name, value);
    if (override) params.set(override.name, override.value);
    params.delete("page");
    const href = `${pathname}?${params}`;
    submitted.current = params.toString();
    const apply = () => {
      timer.current = null;
      if (local) window.history.replaceState(null, "", href);
      else startTransition(() => router.replace(href, { scroll: false }));
    };
    if (delay && !local) timer.current = setTimeout(apply, delay);
    else apply();
  }, [pathname, query, router, local]);
  useEffect(() => {
    const element = form.current;
    function selectChanged(event: Event) {
      const { name, value } = (event as CustomEvent<{ name: string; value: string }>).detail;
      if (name) navigate(0, { name, value });
    }
    element?.addEventListener("abvn-select-change", selectChanged);
    return () => {
      element?.removeEventListener("abvn-select-change", selectChanged);
    };
  }, [navigate]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (submitted.current === query.toString()) return;
    form.current?.querySelectorAll<HTMLInputElement>('input[type="search"], input[type="text"]').forEach(input => {
      if (input.name) input.value = query.get(input.name) ?? "";
    });
  }, [query]);
  return <form ref={form} aria-label={label} aria-busy={pending} className="workspace-filter-bar" onSubmit={event => { event.preventDefault(); navigate(0); }} onChange={event => {
    if (event.target instanceof HTMLInputElement) navigate(event.target.type === "search" || event.target.type === "text" ? 150 : 0);
  }}>
    {children}
    <button type="button" className="workspace-filter-clear" aria-label="Clear filters" title="Clear filters" onClick={() => {
      if (timer.current) clearTimeout(timer.current);
      form.current?.reset();
      form.current?.querySelectorAll<HTMLInputElement>('input[type="search"], input[type="text"]').forEach(input => { input.value = ""; });
      submitted.current = new URL(clearHref, location.origin).searchParams.toString();
      if (local) window.history.replaceState(null, "", clearHref);
      else startTransition(() => router.replace(clearHref, { scroll: false }));
    }}><ActionIcon name="close" /></button>
  </form>;
}

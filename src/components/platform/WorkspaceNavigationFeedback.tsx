"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

export default function WorkspaceNavigationFeedback({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const pendingRoute = useRef<string | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPending() {
    pendingRoute.current = null;
    if (showTimer.current) clearTimeout(showTimer.current);
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    showTimer.current = null;
    fallbackTimer.current = null;
    setVisible(false);
  }

  function beginNavigation() {
    pendingRoute.current = routeKey;
    if (showTimer.current) clearTimeout(showTimer.current);
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    setVisible(false);
    showTimer.current = setTimeout(() => setVisible(true), 140);
    fallbackTimer.current = setTimeout(clearPending, 20_000);
  }

  useEffect(() => {
    const routeChangeTimer = setTimeout(() => {
      if (pendingRoute.current && pendingRoute.current !== routeKey) clearPending();
    }, 0);
    return () => {
      clearTimeout(routeChangeTimer);
      if (showTimer.current) clearTimeout(showTimer.current);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
  }, [routeKey]);

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const target = event.target;
    const option = target.closest('[role="option"]');
    const markedButton = target.closest("button[data-workspace-navigation]");
    if ((option && target.closest("[data-workspace-navigation]")) || markedButton) {
      beginNavigation();
      return;
    }

    const link = target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement) || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
    beginNavigation();
  }

  return <div className="contents" onClickCapture={handleClickCapture}>
    {children}
    {visible ? <>
      <div aria-hidden="true" className="workspace-navigation-progress"><span /></div>
      <div role="status" aria-live="polite" className="workspace-navigation-status">
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-green-100 border-t-green-800 motion-reduce:animate-none" />
        <span>Loading workspace…</span>
      </div>
    </> : null}
  </div>;
}

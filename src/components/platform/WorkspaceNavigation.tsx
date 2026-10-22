"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { contentPages, getContentPage } from "@/src/lib/content/editor";
import { signOut } from "@/src/app/auth/actions";
import { workspaceViews, viewLabels } from "@/src/lib/platform/dashboard";
import type { Role } from "@/src/lib/platform/types";

function NavIcon({ view }: { view: string }) {
  const paths: Record<string, string> = {
    profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
    schedule: "M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
    feedback: "M4 4h16v12H9l-5 4V4Zm4 5h8m-8 3h5",
    history: "M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2",
    students: "M10 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10 1a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1 21v-3a6 6 0 0 1 12 0v3m3-8a6 6 0 0 1 7 6v2",
    notifications: "M12 3a5 5 0 0 1 5 5v7l3 3H4l3-3V8a5 5 0 0 1 5-5Zm-2 18h4",
    settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
    content: "M4 3h16v18H4V3Zm4 4h8m-8 5h8m-8 5h5",
  };
  return <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[view === "academic" ? "schedule" : view === "teachers" ? "students" : view]} /></svg>;
}

export default function WorkspaceNavigation({ role, userId, currentView, name, historyOnly = false }: { role: Role; userId: string; currentView: string; name: string; historyOnly?: boolean }) {
  const [temporaryCollapsed, setTemporaryCollapsed] = useState<boolean | null>(null);
  const [storageError, setStorageError] = useState("");
  const drawer = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contentPage = getContentPage(searchParams.get("page"));
  const [contentExpanded, setContentExpanded] = useState(currentView === "content");
  const [managementExpanded, setManagementExpanded] = useState<Record<string, boolean>>({ [currentView]: true });
  const storageKey = `abvn:sidebar:${userId}`;
  const preference = useSyncExternalStore(
    callback => {
      window.addEventListener("storage", callback);
      window.addEventListener("abvn-sidebar-change", callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener("abvn-sidebar-change", callback);
      };
    },
    () => {
      try { return localStorage.getItem(storageKey) ?? "expanded"; }
      catch (error) {
        if (!(error instanceof DOMException)) throw error;
        return "unavailable";
      }
    },
    () => "expanded",
  );
  const collapsed = temporaryCollapsed ?? preference === "collapsed";
  function toggle() {
    const next = !collapsed;
    setTemporaryCollapsed(next);
    try {
      localStorage.setItem(storageKey, next ? "collapsed" : "expanded");
      window.dispatchEvent(new Event("abvn-sidebar-change"));
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
      setStorageError("Your browser cannot save this display preference. It will reset when you reload.");
    }
  }
  const items = [
    ...workspaceViews[role].filter(view => !historyOnly || view === "history" || view === "settings").map(view => ({
      view,
      href: `/dashboard/${role}?view=${view}`,
      label: role === "teacher" && view === "students" ? "Student list" : role === "admin" && view === "settings" ? "Systems" : viewLabels[view], active: pathname !== "/dashboard/profile" && currentView === view,
    })),
    { view: "profile", href: "/dashboard/profile", label: "My profile", active: pathname === "/dashboard/profile" },
  ];
  function links(compact: boolean) {
    return <nav aria-label="Workspace navigation" className="space-y-1">
      {items.map(({ href, view, label, active }) => {
        const management = role === "admin" && ["teachers", "students", "settings"].includes(view);
        const expanded = view === "content" ? contentExpanded : managementExpanded[view] ?? false;
        const section = searchParams.get("section") ?? (view === "settings" ? "accounts" : "directory");
        const children = view === "content" ? contentPages.map(page => ({ key: page.id, label: page.label, href: `${href}&page=${page.id}`, active: active && contentPage === page.id }))
          : (view === "settings" ? [["accounts", "All accounts"], ["guests", "Guests"]] : [["directory", "Directory"], ["recruitment", "Recruitment"]]).map(([key, label]) => ({ key, label, href: `${href}&section=${key}`, active: active && section === key }));
        return (view === "content" || management) && !compact ? <div key={href}>
          <button type="button" aria-expanded={expanded} onClick={() => view === "content" ? setContentExpanded(value => !value) : setManagementExpanded(value => ({ ...value, [view]: !expanded }))} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium ${active ? "bg-[#edf4e7] text-green-950" : "text-slate-600 hover:bg-slate-100"}`}><NavIcon view={view} /><span className="flex-1">{label}</span><svg aria-hidden="true" className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg></button>
          {expanded ? <div className="ml-5 mt-1 border-l border-slate-200 pl-3">{children.map(child => <Link key={child.key} href={child.href} aria-current={child.active ? "page" : undefined} onClick={() => drawer.current?.close()} className={`my-1 flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${child.active ? "bg-green-50 text-green-950" : "text-slate-600 hover:bg-slate-100"}`}>{child.label}</Link>)}</div> : null}
        </div> : <Link key={href} href={href} aria-current={active ? "page" : undefined} title={compact ? label : undefined} aria-label={compact ? label : undefined} onClick={() => { if (view === "content") { setTemporaryCollapsed(false); setContentExpanded(true); } if (management) { setTemporaryCollapsed(false); setManagementExpanded(value => ({ ...value, [view]: true })); } drawer.current?.close(); }} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-3 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${active ? "border-green-200 bg-[#edf4e7] text-green-950" : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
          <NavIcon view={view} />{!compact ? label : null}
        </Link>;
      })}
    </nav>;
  }
  return <>
    <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-200/70 bg-white px-3 py-5 lg:flex ${collapsed ? "w-20" : "w-60"}`}>
      <div className="mb-7 flex min-h-12 items-center justify-between gap-2">
        {!collapsed ? <Link href="/" className="pl-2 text-2xl font-bold tracking-tight text-(--primary)">abvn<span className="mt-1 block text-[10px] font-medium tracking-[0.14em] text-slate-500">A BETTER VIETNAM</span></Link> : null}
        <button type="button" onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} /></svg></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{!collapsed ? <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Workspace</p> : null}{links(collapsed)}</div>
      {storageError || preference === "unavailable" ? <p role="status" className="mt-3 text-xs text-red-800">{storageError || "Browser storage is unavailable; display preferences cannot be saved."}</p> : null}
      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
        {!collapsed ? <div className="flex items-center gap-3 px-2"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-900">{name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{name}</p><p className="text-xs capitalize text-slate-500">{role} account</p></div></div> : null}
        <Link href="/" title="Public website" className="flex min-h-11 items-center text-sm font-semibold text-(--primary)">{collapsed ? <span aria-label="Public website">ABVN</span> : "Back to public website"}</Link>
        <form action={signOut}><button title="Sign out" aria-label="Sign out" className="min-h-11 w-full rounded-lg border border-slate-300 px-1 text-sm font-semibold text-slate-700">{collapsed ? "Exit" : "Sign out"}</button></form>
      </div>
    </aside>
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <Link href="/" className="font-bold text-(--primary)">ABVN learning</Link>
      <button onClick={() => drawer.current?.showModal()} className="min-h-12 rounded-lg border border-slate-300 px-4 font-semibold text-slate-800" aria-haspopup="dialog">Menu</button>
    </div>
    <dialog ref={drawer} aria-label="Workspace menu" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); drawer.current?.close(); } }} onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }} className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-80 max-w-[90vw] border-0 bg-white p-5 backdrop:bg-slate-950/40">
      <div className="mb-6 flex items-center justify-between"><p className="font-semibold text-(--primary)">Your workspace</p><button onClick={() => drawer.current?.close()} className="min-h-12 rounded-lg border px-4 font-semibold">Close menu</button></div>
      {links(false)}
      <Link href="/" className="mt-5 flex min-h-12 items-center font-semibold text-(--primary)">Public website</Link>
      <form action={signOut}><button className="mt-3 min-h-12 w-full rounded-lg border px-4 font-semibold">Sign out</button></form>
    </dialog>
  </>;
}

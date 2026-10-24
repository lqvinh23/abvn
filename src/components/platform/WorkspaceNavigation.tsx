"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { contentPages, getContentPage } from "@/src/lib/content/editor";
import { signOut } from "@/src/app/auth/actions";
import { workspaceViews, viewLabels } from "@/src/lib/platform/dashboard";
import type { Role } from "@/src/lib/platform/types";
import ActionIcon from "./ActionIcon";

function NavIcon({ view }: { view: string }) {
  if (view === "teachers") return <span aria-hidden="true" className="size-5 shrink-0 bg-current" style={{ mask: "url('/teacher-icon.png') center / contain no-repeat", WebkitMask: "url('/teacher-icon.png') center / contain no-repeat" }} />;
  const paths: Record<string, string> = {
    profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
    schedule: "M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
    statistics: "M4 19V5m0 14h17M8 16v-5m5 5V7m5 9V3",
    feedback: "M4 4h16v12H9l-5 4V4Zm4 5h8m-8 3h5",
    history: "M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2",
    students: "M10 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10 1a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1 21v-3a6 6 0 0 1 12 0v3m3-8a6 6 0 0 1 7 6v2",
    notifications: "M12 3a5 5 0 0 1 5 5v7l3 3H4l3-3V8a5 5 0 0 1 5-5Zm-2 18h4",
    settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
    content: "M4 3h16v18H4V3Zm4 4h8m-8 5h8m-8 5h5",
  };
  return <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[view === "academic" ? "schedule" : view]} /></svg>;
}

function SubsectionIcon({ section }: { section: string }) {
  const paths: Record<string, string> = {
    directory: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7.9a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9",
    recruitment: "M8 3h8l4 4v14H4V3h4Zm0 0v5h8V3m-7 10h6m-6 4h6",
    accounts: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9-3h4m-2-2v4m2 7v-2a4 4 0 0 0-3-3.9",
    home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z",
    about: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14h.01M11 12h1v5h1",
    news: "M4 4h16v17H4V4Zm4 4h8m-8 4h8m-8 4h5M2 7v14",
    media: "M3 3h18v18H3V3Zm0 14 6-6 5 5 3-3 4 4M8 7h.01",
    schedule: "M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
    statistics: "M4 19V5m0 14h17M8 16v-5m5 5V7m5 9V3",
  };
  return <svg aria-hidden="true" className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[section] ?? paths.about} /></svg>;
}

function initials(name: string) {
  return name.split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase();
}

export default function WorkspaceNavigation({ role, memberRole, adminAccess, userId, currentView, name, avatarUrl, historyOnly = false }: { role: Role; memberRole: Role; adminAccess: boolean; userId: string; currentView: string; name: string; avatarUrl?: string | null; historyOnly?: boolean }) {
  const [temporaryCollapsed, setTemporaryCollapsed] = useState<boolean | null>(null);
  const [storageError, setStorageError] = useState("");
  const drawer = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contentPage = getContentPage(searchParams.get("page"));
  const [contentExpanded, setContentExpanded] = useState(currentView === "content");
  const [managementExpanded, setManagementExpanded] = useState<Record<string, boolean>>({
    [currentView]: true,
    ...(role === "admin" && ["schedule", "statistics"].includes(currentView) ? { academic: true } : {}),
  });
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
  const roleLabel = role[0].toUpperCase() + role.slice(1);
  const bottomActionClass = "flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold";
  const utilityActionClass = `${bottomActionClass} button-secondary`;
  const signOutActionClass = `${bottomActionClass} border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100`;
  const otherWorkspace = role === "admin" ? (memberRole === "admin" ? null : memberRole) : adminAccess ? "admin" : null;
  function workspaceSwitch(compact: boolean) {
    if (!otherWorkspace) return null;
    const label = `${otherWorkspace[0].toUpperCase() + otherWorkspace.slice(1)} switch`;
    return <Link href={`/dashboard/${otherWorkspace}`} title={label} aria-label={label} onClick={() => drawer.current?.close()} className={`${utilityActionClass} ${compact ? "px-1" : ""}`}><ActionIcon name="switch" className="size-4" />{compact ? null : label}</Link>;
  }
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
  const availableViews = workspaceViews[role].filter(view => !historyOnly || view === "history" || view === "settings");
  const items = [
    ...(role === "admin" ? [{
      view: "academic",
      href: "/dashboard/admin?view=schedule",
      label: "Academic",
      active: pathname !== "/dashboard/profile" && ["schedule", "statistics"].includes(currentView),
    }, ...availableViews.filter(view => view !== "schedule" && view !== "statistics").map(view => ({
      view,
      href: `/dashboard/${role}?view=${view}`,
      label: role === "admin" && view === "settings" ? "Systems" : role === "admin" && view === "teachers" ? "Teacher" : role === "admin" && view === "students" ? "Student" : viewLabels[view], active: pathname !== "/dashboard/profile" && currentView === view,
    }))] : availableViews.map(view => ({
      view,
      href: `/dashboard/${role}?view=${view}`,
      label: role === "teacher" && view === "students" ? "Student list" : viewLabels[view],
      active: pathname !== "/dashboard/profile" && currentView === view,
    }))),
    { view: "profile", href: `/dashboard/profile?workspace=${role}`, label: "My profile", active: pathname === "/dashboard/profile" },
  ];
  function links(compact: boolean) {
    return <nav aria-label="Workspace navigation" className="space-y-1">
      {items.map(({ href, view, label, active }) => {
        const management = role === "admin" && ["teachers", "students", "settings"].includes(view);
        const academic = role === "admin" && view === "academic";
        const expanded = view === "content" ? contentExpanded : managementExpanded[view] ?? false;
        const section = view === "settings" ? "accounts" : searchParams.get("section") ?? "directory";
        const children = view === "academic" ? [["schedule", "Schedule"], ["statistics", "Statistics"]].map(([key, label]) => ({ key, label, href: `/dashboard/admin?view=${key}`, active: currentView === key }))
          : view === "content" ? contentPages.map(page => ({ key: page.id, label: page.label, href: `${href}&page=${page.id}`, active: active && contentPage === page.id }))
          : (view === "settings" ? [["accounts", "All accounts"]] : [["directory", "Directory"], ["recruitment", "Recruitment"]]).map(([key, label]) => ({ key, label, href: `${href}&section=${key}`, active: active && section === key }));
        const grouped = view === "content" || management || academic;
        if (grouped && !compact) return <div key={href}>
          <button type="button" aria-expanded={expanded} onClick={() => view === "content" ? setContentExpanded(value => !value) : setManagementExpanded(value => ({ ...value, [view]: !expanded }))} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-medium ${active ? "bg-green-50 text-(--primary)" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><NavIcon view={view} /><span className="flex-1">{label}</span><svg aria-hidden="true" className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg></button>
          {expanded ? <div className="ml-5 mt-1 border-l border-slate-200 pl-3">{children.map(child => <Link key={child.key} href={child.href} aria-current={child.active ? "page" : undefined} onClick={() => drawer.current?.close()} className={`my-1 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${child.active ? "bg-green-50 font-semibold text-(--primary)" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><SubsectionIcon section={child.key} />{child.label}</Link>)}</div> : null}
        </div>;
        if (grouped && compact) return <div key={href} className="space-y-1">
          <Link href={href} aria-current={active ? "page" : undefined} title={label} aria-label={label} onClick={() => { drawer.current?.close(); }} className={`flex min-h-12 items-center justify-center rounded-xl border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${active ? "border-green-200 bg-green-50 text-(--primary)" : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><NavIcon view={view} /></Link>
        </div>;
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} title={compact ? label : undefined} aria-label={compact ? label : undefined} onClick={() => { if (view === "content") { setTemporaryCollapsed(false); setContentExpanded(true); } if (management) { setTemporaryCollapsed(false); setManagementExpanded(value => ({ ...value, [view]: true })); } drawer.current?.close(); }} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-3 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) ${active ? "border-green-200 bg-green-50 text-(--primary)" : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
          <NavIcon view={view} />{!compact ? label : null}
        </Link>;
      })}
    </nav>;
  }
  return <>
    <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 lg:flex ${collapsed ? "w-20" : "w-60"}`}>
      <div className={`mb-6 flex min-h-12 gap-2 ${collapsed ? "flex-col items-center" : "items-center justify-between"}`}>
        <Link href="/" title="A Better Vietnam public website" className="inline-flex shrink-0 items-center justify-center rounded bg-white">
          <Image src={collapsed ? "/abvn-mark.png" : "/abvn-logo.png"} alt="A Better Vietnam" width={collapsed ? 145 : 150} height={collapsed ? 194 : 50} loading="eager" className={collapsed ? "h-10 w-10 object-contain" : "h-12 w-36 object-contain"} />
        </Link>
        <button type="button" onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} /></svg></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{!collapsed ? <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Workspace</p> : null}{links(collapsed)}</div>
      {storageError || preference === "unavailable" ? <p role="status" className="mt-3 text-xs text-red-800">{storageError || "Browser storage is unavailable; display preferences cannot be saved."}</p> : null}
      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-2"}`}>
          {avatarUrl ? <Image src={avatarUrl} alt={collapsed ? `${name}'s profile picture` : ""} width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full border border-green-100 object-cover" /> : <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-900">{initials(name)}</span>}
          {!collapsed ? <div className="min-w-0"><p className="truncate text-base font-semibold text-slate-800">{name}</p><p className="text-sm text-slate-500">{roleLabel}</p></div> : null}
        </div>
        {workspaceSwitch(collapsed)}
        <Link href="/" title="Public website" aria-label={collapsed ? "Public website" : undefined} className={`${utilityActionClass} ${collapsed ? "px-1" : ""}`}><ActionIcon name="globe" className="size-4" />{collapsed ? null : "Public website"}</Link>
        <form action={signOut}><button title="Sign out" aria-label="Sign out" className={`${signOutActionClass} ${collapsed ? "px-1" : ""}`}><ActionIcon name="logout" className="size-4" />{collapsed ? null : "Sign out"}</button></form>
      </div>
    </aside>
    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <Link href="/" aria-label="A Better Vietnam public website"><Image src="/abvn-logo.png" alt="A Better Vietnam" width={150} height={50} loading="eager" className="h-10 w-30 object-contain" /></Link>
      <button onClick={() => drawer.current?.showModal()} className="button-secondary inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 font-semibold" aria-haspopup="dialog"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16" /></svg>Menu</button>
    </div>
    <dialog ref={drawer} aria-label="Workspace menu" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); drawer.current?.close(); } }} onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }} className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-80 max-w-[90vw] overflow-y-auto border-0 bg-white p-5 backdrop:bg-slate-950/40">
      <div className="flex min-h-full flex-col">
      <div className="mb-5 flex shrink-0 items-center justify-between"><Link href="/" aria-label="A Better Vietnam public website"><Image src="/abvn-logo.png" alt="A Better Vietnam" width={150} height={50} loading="eager" className="h-10 w-30 object-contain" /></Link><button onClick={() => drawer.current?.close()} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700"><ActionIcon name="close" /></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">{links(false)}</div>
      <div className="mt-4 shrink-0 space-y-3 border-t border-slate-200 pt-4">
      <div className="flex items-center gap-3 px-2">
        {avatarUrl ? <Image src={avatarUrl} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full border border-green-100 object-cover" /> : <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-900">{initials(name)}</span>}
        <div className="min-w-0"><p className="truncate text-base font-semibold text-slate-800">{name}</p><p className="text-sm text-slate-500">{roleLabel}</p></div>
      </div>
      {workspaceSwitch(false)}
      <Link href="/" className={utilityActionClass}><ActionIcon name="globe" className="size-4" />Public website</Link>
      <form action={signOut}><button className={signOutActionClass}><ActionIcon name="logout" className="size-4" />Sign out</button></form>
      </div>
      </div>
    </dialog>
  </>;
}

import Link from "next/link";
import type { ReactNode } from "react";

type WorkspaceTab = { id: string; label: string; href: string; active: boolean };

export default function WorkspaceTabBar({ label, tabs, children, className = "" }: { label: string; tabs: WorkspaceTab[]; children?: ReactNode; className?: string }) {
  return <div className={`grid gap-2 rounded-xl border border-slate-200 bg-white p-2 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-center ${className}`}>
    <nav aria-label={label} className="flex w-fit max-w-full flex-wrap gap-0.5 rounded-lg bg-slate-100 p-1">
      {tabs.map(tab => <Link key={tab.id} href={tab.href} aria-current={tab.active ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold ${tab.active ? "bg-white text-green-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{tab.label}</Link>)}
    </nav>
    {children ? <div className="workspace-tab-bar-actions flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">{children}</div> : null}
  </div>;
}

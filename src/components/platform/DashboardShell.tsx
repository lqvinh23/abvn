import { signOut } from "@/src/app/auth/actions";
import WorkspaceNavigation from "./WorkspaceNavigation";
import type { Profile } from "@/src/lib/platform/types";
import type { ReactNode } from "react";

export default function DashboardShell({
  profile,
  title,
  description,
  children,
  currentView = "",
}: {
  profile: Profile;
  title: string;
  description: string;
  children: ReactNode;
  currentView?: string;
  now?: number;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-[#f5f5f8] text-slate-900 lg:flex-row">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4">Skip to workspace content</a>
      {profile.role && profile.status === "approved" ? <WorkspaceNavigation role={profile.role} userId={profile.id} currentView={currentView} name={profile.full_name} historyOnly={profile.role === "student" && profile.participation_status !== undefined && profile.participation_status !== "active"} /> : null}
      <main id="workspace-content" className="min-w-0 flex-1 px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-[100rem]">
        <div className="sr-only">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {profile.role ?? "New member"} workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p>
              {description}
            </p>
          </div>
        </div>
          {!profile.role || profile.status !== "approved" ? <form action={signOut} className="mb-3">
            <button className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-800 hover:border-(--primary)">
              Sign out
            </button>
          </form> : null}
        <div>{children}</div>
      </div>
      </main>
    </div>
  );
}

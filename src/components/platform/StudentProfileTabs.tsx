"use client";

import { useId, useState, type ReactNode } from "react";
import StudentTopBar from "./StudentTopBar";

export default function StudentProfileTabs({ role, name, number, code, action, summary, profile, feedback, feedbackCount }: {
  role: "admin" | "teacher"; name: string; number: number | null; code: string;
  action?: ReactNode; summary: ReactNode; profile: ReactNode; feedback: ReactNode; feedbackCount: number;
}) {
  const [tab, setTab] = useState<"profile" | "feedback">("profile");
  const id = useId();
  const tabs = [{ key: "profile" as const, label: "Profile" }, { key: "feedback" as const, label: `Teacher feedback (${feedbackCount})` }];
  return <div className="workspace-stack">
    <StudentTopBar role={role} name={name} number={number} code={code} current="Profile">
      <div role="tablist" aria-label="Student profile sections" className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {tabs.map(item => <button key={item.key} id={`${id}-${item.key}-tab`} role="tab" type="button" aria-selected={tab === item.key} aria-controls={`${id}-${item.key}`} onClick={() => setTab(item.key)}
          className={`inline-flex min-h-9 shrink-0 items-center rounded-md px-3 text-sm font-semibold ${tab === item.key ? "bg-white text-green-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{item.label}</button>)}
      </div>
      {action}
    </StudentTopBar>
    <div className="workspace-panel-scroll space-y-3">
      {summary}
      <div role="tabpanel" id={`${id}-profile`} aria-labelledby={`${id}-profile-tab`} hidden={tab !== "profile"}>{profile}</div>
      <div role="tabpanel" id={`${id}-feedback`} aria-labelledby={`${id}-feedback-tab`} hidden={tab !== "feedback"}>{feedback}</div>
    </div>
  </div>;
}

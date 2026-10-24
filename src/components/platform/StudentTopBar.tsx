import Link from "next/link";
import type { ReactNode } from "react";
import ActionIcon from "./ActionIcon";

export const directoryHref = (role: "admin" | "teacher") => role === "admin" ? "/dashboard/admin?view=students&section=directory" : "/dashboard/teacher?view=students";

export default function StudentTopBar({ role, name, number, code, current, children }: {
  role: "admin" | "teacher"; name: string; number: number | null; code: string; current: "Profile" | "Edit"; children?: ReactNode;
}) {
  return <nav aria-label="Student navigation and actions" className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
    <Link href={directoryHref(role)} className="button-secondary inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold"><ActionIcon name="left" />Students</Link>
    <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-sm text-slate-500">
      <li className="max-w-[16rem] truncate font-semibold text-slate-900">{current === "Profile" ? <span aria-current="page">{name}</span> : <Link href={`/dashboard/${role}/students/${code}`} className="hover:underline">{name}</Link>}</li>
      {number !== null ? <li className="tabular-nums">ID {number}</li> : null}
      {current === "Edit" ? <li aria-current="page" className="font-semibold text-slate-900"><span aria-hidden="true" className="mr-2 text-slate-400">/</span>Edit</li> : null}
    </ol>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </nav>;
}

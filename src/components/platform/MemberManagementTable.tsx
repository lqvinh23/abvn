"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { reviewMember, saveManagedProfile } from "@/src/app/dashboard/actions";
import type { Profile, TeacherStatistics } from "@/src/lib/platform/types";
import ActionForm from "./ActionForm";
import { Field, Select, TextArea } from "./Fields";
import PaginatedTable from "./PaginatedTable";
import ActionIcon from "./ActionIcon";
import SortHeader from "./SortHeader";

const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-green-700";

export default function MemberManagementTable({ members, timeZone, serverPaginated = false, teacherStatistics, localSort = false }: { members: Profile[]; timeZone: string; serverPaginated?: boolean; teacherStatistics?: TeacherStatistics[] | null; localSort?: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = members.find(member => member.id === selectedId);
  const memberRole = selected?.role ?? selected?.requested_role;
  const teacherDirectory = teacherStatistics !== undefined;
  const headings = teacherDirectory
    ? ["ID", "Name / email", "Teaching status", "Country", "Completed lessons", "Students taught", "Joined", "Actions"]
    : ["ID", "Name / email", "Membership", "Teaching / study status", "Country / level", "Joined", "Actions"];
  const statistics = new Map(teacherStatistics?.map(item => [item.teacher_id, item]));
  const sortColumns: Record<string, string> = { ID: "number", "Name / email": "name", "Teaching status": "participation", "Teaching / study status": "participation", Membership: "membership", Country: "country", "Country / level": "country", Joined: "newest", "Completed lessons": "completed", "Students taught": "students" };
  function edit(member: Profile) {
    setSelectedId(member.id);
    dialog.current?.showModal();
  }
  return <>
    <div role="region" aria-label="Member management table" className="workspace-stack min-h-0">
      <PaginatedTable paginate={!serverPaginated} caption={teacherDirectory ? "Teacher directory" : "Member profiles"} columns={headings.length} tableClassName="min-w-[900px]" resetKey={members.map(member => member.id).join(",")} headers={<tr>{headings.map(label => sortColumns[label] ?       <SortHeader key={label} local={localSort} column={sortColumns[label]} defaultDirection={label === "Joined" ? "desc" : "asc"}>{label}</SortHeader> : <th key={label} scope="col" className="whitespace-nowrap px-4 py-4 font-semibold">{label}</th>)}</tr>}>
          {members.map(member => {
            const role = member.role ?? member.requested_role;
            const manageable = role && role !== "admin";
            const stats = statistics.get(member.id);
            return <tr key={member.id} className="align-top hover:bg-slate-50/70">
              <td className="px-4 py-4 font-semibold tabular-nums">{member.member_number ?? <span className="font-normal text-slate-500">Pending</span>}</td>
              <th scope="row" className="max-w-xs px-4 py-4 font-normal"><p className="font-semibold text-slate-900">{member.full_name}</p><p className="mt-1 break-all text-slate-500">{member.email}</p></th>
              {!teacherDirectory ? <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${member.status === "approved" ? "bg-green-50 text-green-900" : member.status === "pending" ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-900"}`}>{member.status}</span><p className="mt-2 capitalize text-slate-500">{member.role ?? "Guest"}{!member.role && member.requested_role ? ` (legacy ${member.requested_role} request)` : ""}</p></td> : null}
              <td className="px-4 py-4">{manageable ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${member.participation_status === "active" ? "bg-green-50 text-green-900" : member.participation_status === "guest" ? "bg-violet-50 text-violet-900" : "bg-slate-100 text-slate-700"}`}>{member.participation_status}</span> : <span className="text-slate-500">Not applicable</span>}</td>
              <td className="px-4 py-4"><p>{member.country || "Not provided"}</p>{role === "student" ? <p className="mt-1 text-slate-500">{member.proficiency || "Level not set"}</p> : null}</td>
              {teacherDirectory ? <><td className="px-4 py-4 text-right font-medium tabular-nums">{stats ? stats.completed_lessons.toLocaleString("en-US") : <span className="text-xs font-normal text-slate-500">Not available</span>}</td><td className="px-4 py-4 text-right font-medium tabular-nums">{stats ? stats.students_taught.toLocaleString("en-US") : <span className="text-xs font-normal text-slate-500">Not available</span>}</td></> : null}
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">{new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "medium" }).format(new Date(member.created_at))}</td>
              <td className="px-4 py-3"><div className="flex gap-2">{manageable ? <button className="workspace-icon-action" onClick={() => edit(member)} title={`Edit ${member.full_name}`} aria-label={`Edit ${member.full_name}`}><ActionIcon name="edit" /></button> : null}{member.role === "teacher" || member.role === "student" ? <Link className="workspace-icon-action" title={`View ${member.full_name}'s profile`} aria-label={`View ${member.full_name}'s profile`} href={`/members/${member.member_code}`}><ActionIcon name="external" /></Link> : null}</div></td>
            </tr>;
          })}
      </PaginatedTable>
    </div>
    <dialog ref={dialog} aria-labelledby="member-editor-title" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); dialog.current?.close(); } }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(800px,95vw)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-slate-950/50 sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="member-editor-title" className="text-2xl font-semibold">Edit {selected?.full_name}</h2><p className="mt-2 break-all text-sm text-slate-500">{selected?.email} · {memberRole} ID {selected?.member_number ?? "assigned on approval"}</p></div><button autoFocus className={buttonClass} onClick={() => dialog.current?.close()}>Close</button></div>
      {selected ? <div key={selected.id} className="space-y-8">
        <ActionForm action={saveManagedProfile} submitLabel="Save profile and status">
          <input type="hidden" name="user_id" value={selected.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" defaultValue={selected.full_name} maxLength={100} required />
            <Field label="Country" name="country" defaultValue={selected.country} maxLength={100} />
            <Field label="IANA time zone" name="time_zone" defaultValue={selected.time_zone} maxLength={100} required />
            <Select label={memberRole === "teacher" ? "Teaching status" : "Study status"} name="participation_status" defaultValue={selected.participation_status} required>
              {(memberRole === "teacher" ? ["active", "inactive", "guest"] : ["active", "inactive", "banned", "suspended"]).map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
            </Select>
          </div>
          <p className="text-sm leading-6 text-slate-600">{memberRole === "teacher" ? "Inactive teachers are hidden from the public directory but keep teaching access. Publishing their next lesson automatically makes them active. Guest teachers remain in the Guest tab." : "Inactive, banned, and suspended students have read-only lesson history, with no Schedule or booking access. Existing bookings are kept; contact participants to resolve upcoming lessons. Restrictions last until an admin restores Active status."}</p>
          <TextArea label="Biography" name="bio" defaultValue={selected.bio} maxLength={4000} rows={4} />
          <Field label={memberRole === "teacher" ? "Teaching focus" : "Learning goals"} name="teaching_focus" defaultValue={selected.teaching_focus} maxLength={500} />
          <Field label="Hobbies and interests" name="hobbies" defaultValue={selected.hobbies} maxLength={500} />
          {memberRole === "student" ? <Select label="English level" name="proficiency" defaultValue={selected.proficiency}><option value="">Not specified</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map(level => <option key={level}>{level}</option>)}</Select> : <input type="hidden" name="proficiency" value={selected.proficiency} />}
          <p className="text-sm text-slate-500">Email, role, numeric ID, and uploaded photo are preserved by this editor.</p>
        </ActionForm>
        <section className="border-t border-slate-200 pt-6"><h3 className="text-lg font-semibold">Membership approval & account access</h3><p className="mb-4 mt-2 text-sm leading-6 text-slate-600">Separate from teaching/study status. Account suspension blocks the entire dashboard. Approving membership does not remove a study restriction.</p>
          <ActionForm action={reviewMember} submitLabel="Save membership decision"><input type="hidden" name="user_id" value={selected.id} /><Select label="Membership decision" name="status" defaultValue="" required><option value="" disabled>Choose a decision</option><option value="approved">Approve / restore membership</option><option value="rejected">Reject membership</option><option value="suspended">Suspend all account access</option></Select></ActionForm>
        </section>
      </div> : <p>This account no longer matches your filters. Close this window to view the updated table.</p>}
    </dialog>
  </>;
}

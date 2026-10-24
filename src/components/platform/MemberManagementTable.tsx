"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { assignMemberRole, removeMemberAccount, removeMemberRole, reviewMember, saveManagedProfile } from "@/src/app/dashboard/actions";
import type { Profile, Role, TeacherStatistics } from "@/src/lib/platform/types";
import ActionForm from "./ActionForm";
import { Field, Select, TextArea } from "./Fields";
import PaginatedTable from "./PaginatedTable";
import ActionIcon from "./ActionIcon";
import TimeZoneSelect from "./TimeZoneSelect";
import SortHeader from "./SortHeader";
import { hasAdminAccess } from "@/src/lib/platform/permissions";

const buttonClass = "button-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold";

function roleTagClass(role: "teacher" | "student" | "admin" | "guest") {
  return {
    teacher: "bg-green-100 text-green-900",
    student: "bg-sky-100 text-sky-900",
    admin: "bg-violet-100 text-violet-900",
    guest: "bg-slate-100 text-slate-700",
  }[role];
}

function assignableRoles(member: Profile): { role: Role; label: string; icon: "plus" | "redo" }[] {
  if (member.role === "teacher" || member.role === "student") {
    const roles: { role: Role; label: string; icon: "plus" | "redo" }[] = hasAdminAccess(member)
      ? []
      : [{ role: "admin", label: "Grant Admin access", icon: "plus" }];
    if (member.status === "approved" && member.participation_status !== "active")
      roles.push({ role: member.role, label: `Activate ${member.role}`, icon: "redo" });
    return roles;
  }
  if (member.role === "admin")
    return [
      { role: "teacher", label: "Assign Teacher", icon: "plus" },
      { role: "student", label: "Assign Student", icon: "plus" },
    ];
  return hasAdminAccess(member)
    ? [
      { role: "teacher", label: "Assign Teacher", icon: "plus" },
      { role: "student", label: "Assign Student", icon: "plus" },
    ]
    : [
      { role: "teacher", label: "Assign Teacher", icon: "plus" },
      { role: "student", label: "Assign Student", icon: "plus" },
      { role: "admin", label: "Assign Admin", icon: "plus" },
    ];
}

function removableRoles(member: Profile, currentUserId: string): { role: Role; label: string }[] {
  const roles: { role: Role; label: string }[] = [];
  if ((member.role === "teacher" || member.role === "student") && member.participation_status !== "inactive")
    roles.push({ role: member.role, label: `Set ${member.role} inactive` });
  if (hasAdminAccess(member) && member.id !== currentUserId)
    roles.push({ role: "admin", label: "Remove Admin access" });
  return roles;
}

export default function MemberManagementTable({ members, timeZone, serverPaginated = false, teacherStatistics, localSort = false, allAccounts = false, currentUserId }: { members: Profile[]; timeZone: string; serverPaginated?: boolean; teacherStatistics?: TeacherStatistics[] | null; localSort?: boolean; allAccounts?: boolean; currentUserId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    function closeAssignmentMenu(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-role-assignment-popup]")) return;
      setOpenAssignmentId(null);
    }
    document.addEventListener("pointerdown", closeAssignmentMenu);
    return () => document.removeEventListener("pointerdown", closeAssignmentMenu);
  }, []);
  const selected = members.find(member => member.id === selectedId);
  const memberRole = selected?.role ?? selected?.requested_role;
  const teacherDirectory = teacherStatistics !== undefined;
  const headings = allAccounts
    ? ["ID", "Name / email", "Role", "Status", "Joined", "Actions"]
    : teacherDirectory
    ? ["ID", "Name / email", "Teaching status", "Country", "Completed lessons", "Students taught", "Joined", "Actions"]
    : ["ID", "Name / email", "Membership", "Teaching / study status", "Country / level", "Joined", "Actions"];
  const statistics = new Map(teacherStatistics?.map(item => [item.teacher_id, item]));
  const sortColumns: Record<string, string> = { ID: "number", "Name / email": "name", Role: "role", Status: "participation", "Teaching status": "participation", "Teaching / study status": "participation", Membership: "membership", Country: "country", "Country / level": "country", Joined: "newest", "Completed lessons": "completed", "Students taught": "students" };
  function edit(member: Profile) {
    setSelectedId(member.id);
    dialog.current?.showModal();
  }
  return <>
    <div role="region" aria-label="Member management table" className="workspace-stack min-h-0">
      <PaginatedTable paginate={!serverPaginated} caption={allAccounts ? "All accounts" : teacherDirectory ? "Teacher directory" : "Member profiles"} columns={headings.length} tableClassName="min-w-[900px]" resetKey={members.map(member => member.id).join(",")} headers={<tr>{headings.map(label => sortColumns[label] ?       <SortHeader key={label} local={localSort} column={sortColumns[label]} defaultDirection={label === "Joined" ? "desc" : "asc"}>{label}</SortHeader> : <th key={label} scope="col" className="whitespace-nowrap px-4 py-4 font-semibold">{label}</th>)}</tr>}>
          {members.map(member => {
            const role = member.role ?? member.requested_role;
            const manageable = role && !hasAdminAccess(member);
            const stats = statistics.get(member.id);
            const roleAssignments = allAccounts ? assignableRoles(member) : [];
            const roleRemovals = allAccounts ? removableRoles(member, currentUserId) : [];
            return <tr key={member.id} className="align-top hover:bg-slate-50/70">
              <td className="px-4 py-4 font-semibold tabular-nums">{member.member_number ?? <span className="font-normal text-slate-500">{allAccounts ? "-" : "Pending"}</span>}</td>
              <th scope="row" className="max-w-xs px-4 py-4 font-normal"><p className="font-semibold text-slate-900">{member.full_name || (allAccounts ? "-" : "")}</p><p className="mt-1 break-all text-slate-500">{member.email || (allAccounts ? "-" : "")}</p></th>
              {allAccounts
                ? <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">
                    {member.role === "teacher" || member.role === "student" ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${roleTagClass(member.role)}`}>{member.role}</span> : null}
                    {hasAdminAccess(member) ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${roleTagClass("admin")}`}>Admin</span> : null}
                    {!member.role && !hasAdminAccess(member) ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${roleTagClass("guest")}`}>Guest</span> : null}
                  </div></td>
                : !teacherDirectory ? <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${member.status === "approved" ? "bg-green-50 text-green-900" : member.status === "pending" ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-900"}`}>{member.status}</span><p className="mt-2 capitalize text-slate-500">{member.role ?? "Guest"}{!member.role && member.requested_role ? ` (legacy ${member.requested_role} request)` : ""}</p></td>
                : null}
              {allAccounts
                ? <td className="px-4 py-4">{member.role === "teacher" || member.role === "student" ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${member.participation_status === "active" ? "bg-green-50 text-green-900" : "bg-slate-100 text-slate-700"}`}>{member.participation_status || "-"}</span> : <span className="text-slate-500">-</span>}</td>
                : <td className="px-4 py-4">{manageable ? <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${member.participation_status === "active" ? "bg-green-50 text-green-900" : member.participation_status === "guest" ? "bg-violet-50 text-violet-900" : "bg-slate-100 text-slate-700"}`}>{member.participation_status}</span> : <span className="text-slate-500">Not applicable</span>}</td>}
              {!allAccounts ? <td className="px-4 py-4"><p>{member.country || "Not provided"}</p>{role === "student" ? <p className="mt-1 text-slate-500">{member.proficiency || "Level not set"}</p> : null}</td> : null}
              {teacherDirectory ? <><td className="px-4 py-4 text-right font-medium tabular-nums">{stats ? stats.completed_lessons.toLocaleString("en-US") : <span className="text-xs font-normal text-slate-500">Not available</span>}</td><td className="px-4 py-4 text-right font-medium tabular-nums">{stats ? stats.students_taught.toLocaleString("en-US") : <span className="text-xs font-normal text-slate-500">Not available</span>}</td></> : null}
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">{new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "medium" }).format(new Date(member.created_at))}</td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                {allAccounts
                  ? <>
                    {roleAssignments.length || roleRemovals.length ? <details data-role-assignment-popup open={openAssignmentId === member.id} onToggle={event => setOpenAssignmentId(event.currentTarget.open ? member.id : null)} className="relative">
                      <summary className="workspace-icon-action list-none cursor-pointer" title={`Manage roles for ${member.full_name}`} aria-label={`Manage roles for ${member.full_name}`}><ActionIcon name="edit" /></summary>
                      <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                        {roleAssignments.map(roleOption => <ActionForm key={`assign-${roleOption.role}`} action={assignMemberRole} className="w-full" submitLabel={roleOption.label} icon={roleOption.icon} iconAndText submitButtonClassName="inline-flex min-h-10 w-full items-center justify-start gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-(--primary)" beforeSubmit={() => window.confirm(roleOption.role === "admin" ? `Grant ${member.full_name} Admin workspace access?` : roleOption.label.startsWith("Activate") ? `Activate ${member.full_name}'s ${roleOption.role} role?` : `Assign ${member.full_name} as a ${roleOption.role} and approve their account immediately, bypassing recruitment?`)}><input type="hidden" name="user_id" value={member.id} /><input type="hidden" name="role" value={roleOption.role} /></ActionForm>)}
                        {roleAssignments.length && roleRemovals.length ? <div className="my-1 border-t border-slate-100" /> : null}
                        {roleRemovals.map(roleOption => <ActionForm key={`remove-${roleOption.role}`} action={removeMemberRole} className="w-full" submitLabel={roleOption.label} icon="close" iconAndText submitButtonClassName="inline-flex min-h-10 w-full items-center justify-start gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-800 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700" beforeSubmit={() => window.confirm(roleOption.role === "admin" ? `Remove Admin access from ${member.full_name}? An Admin-only account will become a Guest. The current and last Admin cannot be removed.` : `Set ${member.full_name}'s ${roleOption.role} status to inactive? Their role and lesson history will be preserved.`)}><input type="hidden" name="user_id" value={member.id} /><input type="hidden" name="role" value={roleOption.role} /></ActionForm>)}
                      </div>
                    </details> : null}
                    {!hasAdminAccess(member) && member.id !== currentUserId ? <ActionForm action={removeMemberAccount} submitLabel="Remove account" icon="trash" submitButtonClassName="workspace-icon-action" beforeSubmit={() => window.confirm(`Permanently delete ${member.full_name}'s account, profile and recruitment data? Accounts with lesson history cannot be removed. A new signup will create a Guest account.`)}><input type="hidden" name="user_id" value={member.id} /></ActionForm> : null}
                  </>
                  : <>
                    {manageable ? <button className="workspace-icon-action" onClick={() => edit(member)} title={`Edit ${member.full_name}`} aria-label={`Edit ${member.full_name}`}><ActionIcon name="edit" /></button> : null}
                    {member.role === "teacher" || member.role === "student" ? <Link className="workspace-icon-action" title={`View ${member.full_name}'s profile`} aria-label={`View ${member.full_name}'s profile`} href={`/members/${member.member_code}`}><ActionIcon name="external" /></Link> : null}
                  </>}
              </div></td>
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
            <TimeZoneSelect compact={false} defaultValue={selected.time_zone} />
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

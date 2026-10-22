import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import DashboardLoading from "../loading";
import { requireMember } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import { calendarDisplayRange, calendarRange, type CalendarMode } from "@/src/lib/platform/calendar";
import type { CalendarLesson, ParticipationStatus } from "@/src/lib/platform/types";
import { getDashboardView, needsMyFeedback, viewLabels } from "@/src/lib/platform/dashboard";
import DashboardShell from "@/src/components/platform/DashboardShell";
import SetupNotice from "@/src/components/platform/SetupNotice";
import LessonCalendar from "@/src/components/platform/LessonCalendar";
import LessonList from "@/src/components/platform/LessonList";
import { Field, Select } from "@/src/components/platform/Fields";
import MemberManagementTable from "@/src/components/platform/MemberManagementTable";
import AdminContent from "@/src/components/content/AdminContent";

export function generateStaticParams() {
  return ["teacher", "student", "admin"].map(role => ({ role }));
}

const panel = "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8";
const linkButton = "inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700";

export default function RoleDashboard(props: PageProps<"/dashboard/[role]">) {
  return <Suspense fallback={<DashboardLoading />}><DashboardContent {...props} /></Suspense>;
}

async function DashboardContent({ params, searchParams }: PageProps<"/dashboard/[role]">) {
  const { role } = await params;
  if (role !== "teacher" && role !== "student" && role !== "admin") notFound();
  if (!getSupabaseConfig()) return <main className="flex-1 px-4 py-16"><div className="mx-auto max-w-2xl"><SetupNotice /></div></main>;
  await io();
  const { supabase, profile, requestTime } = await requireMember(role);
  const query = await searchParams;
  const view = getDashboardView(role, query.view);
  const historyOnly = role === "student" && profile.participation_status !== undefined && profile.participation_status !== "active";
  if (historyOnly && view !== "history" && view !== "settings") redirect("/dashboard/student?view=history");
  const descriptions: Record<string, string> = {
    schedule: role === "teacher" ? "Create a lesson, meet your students, and keep everything in one place." : "Find a teacher, reserve a conversation, and join your next lesson.",
    academic: "Oversee the lesson programme, attendance, and participant feedback.",
    feedback: "Give helpful feedback and review the progress you are making together.",
    history: "Review your lessons and learning progress, one month at a time.",
    notifications: "Your lesson reminders and follow-up tasks, based on live lesson records.",
    teachers: "Review teacher membership requests and manage approved accounts.",
    students: "Review student membership requests and manage approved accounts.",
    content: "Manage website pages and news, preview privately, and publish with confidence.",
    settings: "Your account, time zone, and the programme rules currently in effect.",
  };
  const shell = (children: React.ReactNode) => <DashboardShell profile={profile} now={requestTime} currentView={view} title={role === "teacher" && view === "students" ? "Student list" : role === "admin" && view === "settings" ? "System settings" : viewLabels[view]} description={role === "teacher" && view === "students" ? "Get to know the students who have booked lessons with you." : descriptions[view]}>{children}</DashboardShell>;
  if (role === "teacher" && view === "students") {
    const { data: students, error } = await supabase.rpc("teacher_student_directory");
    if (error) { console.error("Student directory load failed:", error.code); throw new Error("Your student list could not be loaded. Make sure the dashboard migration has been applied."); }
    return shell(<div className="space-y-5"><p className="text-base leading-7 text-slate-600">For privacy, this list includes only students with a non-cancelled booking with you. A project-wide student directory is not enabled.</p><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{students.map(student => <article key={student.member_code} className={panel}><h2 className="text-xl font-semibold">{student.full_name}</h2><p className="mt-2 text-sm text-slate-600">Student ID {student.member_number}</p><p className="mt-4 text-base text-slate-600">{student.country || "Country not provided"} · English level: {student.proficiency || "Not provided"}</p><Link className={`${linkButton} mt-5`} href={`/members/${student.member_code}`}>View student profile</Link></article>)}</div>{!students.length ? <p className={panel}>Your students will appear here once they book a lesson with you.</p> : null}</div>);
  }
  if (role === "admin" && (view === "teachers" || view === "students" || view === "settings")) {
    if (!("participation_status" in profile)) return shell(<section className={panel}><h2 className="text-xl font-semibold">One database update is needed</h2><p className="mt-3 leading-7">Run 202610210003_member_management.sql in your Supabase SQL Editor, after the earlier migrations, then refresh. This enables management tables, profile editing, and teaching/study statuses without removing accounts or bookings.</p></section>);
    const target = view === "teachers" ? "teacher" : view === "students" ? "student" : null;
    const q = typeof query.q === "string" ? query.q.slice(0, 100).trim() : "";
    const status = (["pending", "approved", "suspended", "rejected"] as const).find(value => value === query.status);
    const participationOptions: ParticipationStatus[] = target === "teacher" ? ["active", "inactive", "guest"] : target === "student" ? ["active", "inactive", "banned", "suspended"] : ["active", "inactive", "guest", "banned", "suspended"];
    const participation = participationOptions.find(value => value === query.participation);
    const sort = typeof query.sort === "string" && ["name", "number", "newest"].includes(query.sort) ? query.sort : "number";
    const page = typeof query.page === "string" && /^\d{1,6}$/.test(query.page) ? Math.max(1, Number(query.page)) : 1;
    let request = supabase.from("profiles").select("*", { count: "exact" }).order(sort === "name" ? "full_name" : sort === "number" ? "member_number" : "created_at", { ascending: sort !== "newest", nullsFirst: false }).order("id");
    if (target) request = request.or(`role.eq.${target},and(role.is.null,requested_role.eq.${target})`);
    if (q) request = /^\d{1,9}$/.test(q) ? request.eq("member_number", Number(q)) : request.ilike("full_name", `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
    if (status) request = request.eq("status", status);
    if (participation) request = request.eq("participation_status", participation);
    const { data: members, error, count } = await request.range((page - 1) * 12, page * 12 - 1);
    if (error) { console.error("Membership load failed:", error.code); throw new Error("The membership list could not be loaded."); }
    const pageHref = (number: number) => `/dashboard/admin?${new URLSearchParams({ view, q, status: status ?? "", participation: participation ?? "", sort, page: String(number) })}`;
    return shell(<div className="space-y-6">
      {view === "settings" ? <section className={panel}><h2 className="text-xl font-semibold">Current programme rules</h2><p className="mt-3 leading-7 text-slate-600">Student cancellation closes 12 hours before a lesson. Absences do not automatically ban or suspend accounts. Policy editing, email delivery, and disciplinary automation are not enabled yet.</p><h2 className="mt-6 text-xl font-semibold">All user accounts</h2><p className="mt-2 leading-7 text-slate-600">Includes people who signed in but have not requested membership. Admin privileges cannot be granted or removed here.</p></section> : <p className="text-base leading-7 text-slate-600">Confirm eligibility with each applicant before approving. Suspension blocks access; contact affected participants to resolve existing bookings.</p>}
      <form key={`${view}:${q}:${status}:${participation}:${sort}`} className={`${panel} flex flex-wrap items-end gap-4`} action="/dashboard/admin"><input type="hidden" name="view" value={view} /><Field label="Search by name or numeric ID" name="q" defaultValue={q} maxLength={100} /><Select label="Membership status" name="status" defaultValue={status ?? ""}><option value="">All memberships</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option></Select><Select label={target === "teacher" ? "Teaching status" : target === "student" ? "Study status" : "Participation status"} name="participation" defaultValue={participation ?? ""}><option value="">All participation statuses</option>{(target === "teacher" ? ["active", "inactive", "guest"] : target === "student" ? ["active", "inactive", "banned", "suspended"] : ["active", "inactive", "guest", "banned", "suspended"]).map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select><Select label="Sort by" name="sort" defaultValue={sort}><option value="number">Member ID</option><option value="name">Name A–Z</option><option value="newest">Newest accounts</option></Select><button className={linkButton}>Apply filters</button><Link href={`/dashboard/admin?view=${view}`} className={linkButton}>Clear filters</Link></form>
      <p className="text-slate-600">{count ?? 0} matching accounts · Page {page}</p>
      <MemberManagementTable members={members} timeZone={profile.time_zone} />
      <nav aria-label="Account pages" className="flex gap-3">{page > 1 ? <Link className={linkButton} href={pageHref(page - 1)}>Previous page</Link> : null}{page * 12 < (count ?? 0) ? <Link className={linkButton} href={pageHref(page + 1)}>Next page</Link> : null}</nav>
    </div>);
  }
  if (view === "settings") return shell(<div className="grid gap-6 xl:grid-cols-2"><section className={panel}><h2 className="text-xl font-semibold">Your account</h2><dl className="mt-5 space-y-4 text-base"><div><dt className="text-slate-500">Member ID</dt><dd className="mt-1 font-medium">{profile.member_number ?? "Not assigned"}</dd></div><div><dt className="text-slate-500">Time zone</dt><dd className="mt-1 font-medium">{profile.time_zone}</dd></div><div><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-medium">{profile.email}</dd></div></dl><Link href="/dashboard/profile" className={`${linkButton} mt-6`}>Edit profile and time zone</Link></section><section className={panel}><h2 className="text-xl font-semibold">Display and notifications</h2><p className="mt-4 leading-7 text-slate-600">Use the sidebar arrow to expand or collapse navigation. Your choice is saved for this account in this browser. On smaller screens, use the Menu button.</p><p className="mt-4 leading-7 text-slate-600">Lesson reminders and follow-up tasks are available under Notifications. Email notifications and recurring lesson creation are not enabled yet.</p><p className="mt-4 leading-7 text-slate-600">Student cancellation closes 12 hours before a lesson. Need help or an urgent change? Contact the ABVN team through the public website.</p></section></div>);
  if (view === "content") return shell(<AdminContent />);
  const isCalendar = view === "schedule" || view === "academic";
  const mode: CalendarMode = query.mode === "day" || query.mode === "agenda" || query.mode === "month" ? query.mode : "week";
  const chosenDate = typeof query.date === "string" ? query.date : undefined;
  const range = isCalendar ? calendarDisplayRange(chosenDate, profile.time_zone, requestTime, mode) : calendarRange(chosenDate, profile.time_zone, requestTime, "month");
  const { data: records, error } = await supabase.rpc(isCalendar ? "dashboard_shared_calendar" : "dashboard_calendar_details", { p_from: range.from, p_to: range.to });
  if (error) {
    console.error("Dashboard lesson load failed:", error.code);
    if (error.code === "PGRST202" || error.code === "42883") return shell(<section className={panel}><h2 className="text-xl font-semibold">One database update is needed</h2><p className="mt-4 leading-7 text-slate-600">Run {isCalendar ? "202610210006_shared_calendar.sql, then 202610210007_shared_class_details.sql" : "202610210004_calendar_details.sql"} in your Supabase SQL Editor, then reload. Apply earlier migrations first if you have not already done so. Your accounts, profile links, and lessons will be preserved. See the Supabase setup guide for instructions.</p><Link href="/dashboard/profile" className={`${linkButton} mt-5`}>Open your profile</Link></section>);
    throw new Error("Your lessons could not be loaded. Please try again.");
  }
  const paths = isCalendar ? [...new Set(records.flatMap(record => [record.teacher_avatar_path, record.student_avatar_path]).filter((path): path is string => path !== null))] : [];
  const avatarUrls = new Map<string, string>();
  let avatarWarning = false;
  if (paths.length) {
    const avatars = await supabase.storage.from("avatars").createSignedUrls(paths, 3600);
    if (avatars.error || !avatars.data || avatars.data.some(image => image.error || !image.signedUrl || !image.path)) {
      console.error("Lesson participant photos could not be loaded.");
      avatarWarning = true;
    }
    for (const image of avatars.data ?? []) if (image.path && image.signedUrl && !image.error) avatarUrls.set(image.path, image.signedUrl);
  }
  const data: CalendarLesson[] = records.map(({ teacher_avatar_path, student_avatar_path, ...record }) => ({
    ...record,
    teacher_avatar_url: teacher_avatar_path ? avatarUrls.get(teacher_avatar_path) ?? null : null,
    student_avatar_url: student_avatar_path ? avatarUrls.get(student_avatar_path) ?? null : null,
  }));
  const lessons = data.filter(lesson =>
    !lesson.can_book && (isCalendar || Date.parse(lesson.starts_at) >= range.start.toMillis()),
  );
  const completed = lessons.filter(lesson => lesson.attendance === "present" && lesson.booking_status === "completed");
  const due = lessons.filter(lesson => needsMyFeedback(lesson, role, requestTime));
  const hours = completed.reduce((sum, lesson) => sum + (Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 3600000, 0);
  const upcoming = lessons.filter(lesson => lesson.booking_status === "booked" && Date.parse(lesson.ends_at) > requestTime);
  const monthLink = (direction: number) => `/dashboard/${role}?${new URLSearchParams({ view, date: range.start.plus({ months: direction }).toISODate()! })}`;
  return shell(<div className="space-y-6">
    {historyOnly ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">Your study status is {profile.participation_status}. Your lesson history is read-only. Contact ABVN to restore Schedule and booking access.</p> : null}
    {avatarWarning ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-950">Some participant photos could not be loaded. Initials are shown instead; your lesson data is still available. Refresh to retry, or contact ABVN if this continues.</p> : null}
    {isCalendar ? <LessonCalendar lessons={data} role={role} timeZone={profile.time_zone} now={requestTime} date={range.date} mode={mode} view={view} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-semibold">{range.start.toFormat("LLLL yyyy")}</h2><p className="mt-2 text-base text-slate-600">Showing only this month. Use Previous / Next to review other months.</p></div><nav aria-label="Choose month" className="flex gap-3"><Link href={monthLink(-1)} className={linkButton}>Previous month</Link><Link href={monthLink(1)} className={linkButton}>Next month</Link></nav></div>
      <dl className="grid gap-4 sm:grid-cols-3">{[{ label: "Attended lessons", value: completed.length }, { label: "Learning hours", value: hours.toFixed(1) }, { label: "Your follow-up tasks", value: due.length }].map(metric => <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-6"><dt className="text-base text-slate-600">{metric.label}</dt><dd className="mt-3 text-3xl font-semibold text-(--primary)">{metric.value}</dd></div>)}</dl>
      {view === "feedback" ? <><section className={panel}><h2 className="text-xl font-semibold">Your feedback checklist</h2><p className="mt-3 leading-7 text-slate-600">{role === "teacher" ? "After each lesson, record attendance and leave helpful teacher feedback." : "After each lesson, share written feedback with your teacher."} You have {due.length} lesson{due.length === 1 ? "" : "s"} needing your input this month.</p></section><h2 className="text-xl font-semibold">Needs your input</h2><LessonList lessons={due} role={role} timeZone={profile.time_zone} now={requestTime} compact /><details className={panel}><summary className="min-h-12 cursor-pointer py-3 text-lg font-semibold">Given and received feedback this month</summary><LessonList lessons={lessons.filter(lesson => lesson.teacher_comment || lesson.student_comment)} role={role} timeZone={profile.time_zone} now={requestTime} compact /></details></> : view === "notifications" ? <><section className={panel}><h2 className="text-xl font-semibold">Lesson reminders & tasks</h2><p className="mt-3 leading-7 text-slate-600">This is a live task centre, not an email inbox. Tasks disappear when the relevant attendance or feedback is saved. Read/unread tracking, project announcements, and email delivery are not enabled yet.</p></section><h2 className="text-xl font-semibold">Your upcoming bookings this month</h2><LessonList lessons={upcoming} role={role} timeZone={profile.time_zone} now={requestTime} compact /><h2 className="text-xl font-semibold">Follow-up reminders</h2><LessonList lessons={due} role={role} timeZone={profile.time_zone} now={requestTime} compact /></> : <LessonList lessons={lessons.filter(lesson => Date.parse(lesson.ends_at) <= requestTime || lesson.booking_status === "cancelled" || lesson.slot_status === "cancelled")} role={role} timeZone={profile.time_zone} now={requestTime} readOnly={historyOnly} compact />}
    </>}
  </div>);
}

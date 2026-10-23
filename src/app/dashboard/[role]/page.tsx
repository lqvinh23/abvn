import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { io } from "next/cache";
import { DateTime } from "luxon";
import DashboardLoading from "../loading";
import { requireMember } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import { calendarDisplayRange, calendarRange, type CalendarMode } from "@/src/lib/platform/calendar";
import type { CalendarLesson, ParticipationStatus, TeacherStatistics } from "@/src/lib/platform/types";
import { getDashboardView, isValidStatisticsAnchor, needsMyFeedback, viewLabels } from "@/src/lib/platform/dashboard";
import DashboardShell from "@/src/components/platform/DashboardShell";
import SetupNotice from "@/src/components/platform/SetupNotice";
import LessonCalendar from "@/src/components/platform/LessonCalendar";
import LessonList from "@/src/components/platform/LessonList";
import MemberDirectory from "@/src/components/platform/MemberDirectory";
import { loadCollection } from "@/src/lib/platform/load-collection";
import PaginatedTable from "@/src/components/platform/PaginatedTable";
import AdminContent from "@/src/components/content/AdminContent";
import AdminRecruitment from "@/src/components/recruitment/AdminRecruitment";
import ActionIcon from "@/src/components/platform/ActionIcon";
import ScheduleChangeInbox from "@/src/components/platform/ScheduleChangeInbox";
import AcademicStatistics from "@/src/components/platform/AcademicStatistics";
import type { ActivityStatistics } from "@/src/lib/platform/types";

export function generateStaticParams() {
  return ["teacher", "student", "admin"].map(role => ({ role }));
}

const panel = "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8";
const linkButton = "inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 [&[aria-current]]:border-green-700 [&[aria-current]]:bg-green-50 [&[aria-current]]:text-green-900";

export default function RoleDashboard(props: PageProps<"/dashboard/[role]">) {
  return <Suspense fallback={<DashboardLoading />}><DashboardContent {...props} /></Suspense>;
}

async function DashboardContent({ params, searchParams }: PageProps<"/dashboard/[role]">) {
  const { role } = await params;
  if (role !== "teacher" && role !== "student" && role !== "admin") notFound();
  if (!getSupabaseConfig()) return <main className="flex-1 px-4 py-16"><div className="mx-auto max-w-2xl"><SetupNotice /></div></main>;
  await io();
  const { supabase, profile, requestTime } = await requireMember(role);
  const avatarUrlPromise = profile.avatar_path
    ? supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600)
    : null;
  const query = await searchParams;
  const view = getDashboardView(role, query.view);
  const historyOnly = role === "student" && profile.participation_status !== undefined && profile.participation_status !== "active";
  if (historyOnly && view !== "history" && view !== "settings") redirect("/dashboard/student?view=history");
  const descriptions: Record<string, string> = {
    schedule: role === "teacher" ? "Create a lesson, meet your students, and keep everything in one place." : "Find a teacher, reserve a conversation, and join your next lesson.",
    statistics: "Monitor lesson, teacher, and student activity across the programme.",
    feedback: "Give helpful feedback and review the progress you are making together.",
    history: "Review your lessons and learning progress, one month at a time.",
    notifications: "Your schedule updates, lesson reminders, and follow-up tasks.",
    teachers: "Manage approved teachers, teaching status, and lesson statistics.",
    students: "Review student membership requests and manage approved accounts.",
    content: "Manage website pages and news, preview privately, and publish with confidence.",
    settings: "Your account, time zone, and the programme rules currently in effect.",
  };
  const shell = async (children: React.ReactNode) => {
    let avatarUrl: string | null = null;
    if (avatarUrlPromise) {
      const { data, error } = await avatarUrlPromise;
      if (error) { console.error("Sidebar profile image load failed:", error.name); throw new Error("Your profile image could not be loaded."); }
      avatarUrl = data.signedUrl;
    }
    return <DashboardShell profile={profile} workspaceRole={role} avatarUrl={avatarUrl} now={requestTime} currentView={view} title={role === "teacher" && view === "students" ? "Student list" : role === "admin" && view === "settings" ? "Systems" : viewLabels[view]} description={role === "teacher" && view === "students" ? "Get to know the students who have booked lessons with you." : descriptions[view]}>{children}</DashboardShell>;
  };
  if (role === "admin" && (view === "teachers" || view === "students") && query.section === "recruitment")
    return shell(<AdminRecruitment role={view === "teachers" ? "teacher" : "student"} query={query} />);
  if (role === "teacher" && view === "students") {
    const { data: students, error } = await supabase.rpc("teacher_student_directory");
    if (error) { console.error("Student directory load failed:", error.code); throw new Error("Your student list could not be loaded. Make sure the dashboard migration has been applied."); }
    return shell(<div className="workspace-stack"><PaginatedTable caption="Your students" columns={5} tableClassName="min-w-[650px]" resetKey={students.map(student => student.member_code).join(",")} emptyMessage="Your students will appear here once they book a lesson with you." headers={<tr>{["Student ID", "Name", "Country", "English level", "Actions"].map(label => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr>}>{students.map(student => <tr key={student.member_code}><td className="px-4 py-3">{student.member_number}</td><th scope="row" className="px-4 py-3 font-medium">{student.full_name}</th><td className="px-4 py-3">{student.country || "Not provided"}</td><td className="px-4 py-3">{student.proficiency || "Not provided"}</td><td className="px-4 py-3"><Link className="workspace-icon-action" title={`View ${student.full_name}'s profile`} aria-label={`View ${student.full_name}'s profile`} href={`/members/${student.member_code}`}><ActionIcon name="external" /></Link></td></tr>)}</PaginatedTable></div>);
  }
  if (role === "admin" && (view === "teachers" || view === "students" || view === "settings")) {
    if (!("participation_status" in profile)) return shell(<section className={panel}><h2 className="text-xl font-semibold">One database update is needed</h2><p className="mt-3 leading-7">Run 202610210003_member_management.sql in your Supabase SQL Editor, after the earlier migrations, then refresh. This enables management tables, profile editing, and teaching/study statuses without removing accounts or bookings.</p></section>);
    const target = view === "teachers" ? "teacher" : view === "students" ? "student" : null;
    const section = view === "settings" ? "accounts" : "directory";
    const teacherDirectory = target === "teacher";
    const participationOptions: ParticipationStatus[] = target === "teacher" ? ["active", "inactive", "guest"] : target === "student" ? ["active", "inactive", "banned", "suspended"] : ["active", "inactive", "guest", "banned", "suspended"];
    let request = supabase.from("profiles").select("*").order("id");
    if (teacherDirectory) request = request.eq("role", "teacher").eq("status", "approved");
    else if (target) request = request.or(`role.eq.${target},and(role.is.null,requested_role.eq.${target})`);
    const members = await loadCollection((from, to) => request.range(from, to), "Member directory");
    let teacherStatistics: TeacherStatistics[] | null | undefined;
    if (teacherDirectory) {
      teacherStatistics = [];
      for (let from = 0; from < members.length; from += 100) {
        const response = await supabase.rpc("admin_teacher_statistics", { p_teacher_ids: members.slice(from, from + 100).map(member => member.id) });
        if (response.error && ["42883", "PGRST202"].includes(response.error.code)) teacherStatistics = null;
        else if (response.error) { console.error("Teacher statistics load failed:", response.error.code); throw new Error("Teacher statistics could not be loaded. Please try again."); }
        else teacherStatistics.push(...response.data);
        if (teacherStatistics === null) break;
      }
    }
    return shell(<MemberDirectory key={`${view}:${section}`} members={members} teacherStatistics={teacherStatistics} timeZone={profile.time_zone} view={view} section={section} participationOptions={participationOptions} currentUserId={profile.id} />);
  }
  if (view === "settings") return shell(<section className="workspace-panel-scroll max-w-3xl rounded-xl border border-slate-200 bg-white p-4"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Member ID</dt><dd className="mt-1 font-medium">{profile.member_number ?? "Not assigned"}</dd></div><div><dt className="text-slate-500">Time zone</dt><dd className="mt-1 font-medium">{profile.time_zone}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-medium">{profile.email}</dd></div></dl><Link href={`/dashboard/profile?workspace=${role}`} className={`${linkButton} mt-4`}>Edit profile</Link></section>);
  if (role === "admin" && view === "statistics") {
    const tab = query.tab === "teacher" || query.tab === "student" ? query.tab : "lesson";
    const period = query.period === "week" || query.period === "quarter" || query.period === "year" ? query.period : "month";
    if (query.anchor !== undefined && (typeof query.anchor !== "string" || !isValidStatisticsAnchor(query.anchor))) {
      redirect(`/dashboard/admin?${new URLSearchParams({ view: "statistics", tab, period })}`);
    }
    const anchor = typeof query.anchor === "string" ? query.anchor : DateTime.fromMillis(requestTime, { zone: profile.time_zone }).toISODate();
    if (!anchor) { console.error("Could not determine the administrator's local statistics date."); throw new Error("Statistics could not be loaded for your time zone."); }
    const { data, error } = await supabase.rpc("admin_activity_statistics_in_timezone", { p_period: period, p_anchor: anchor, p_time_zone: profile.time_zone });
    if (error && ["42883", "PGRST202"].includes(error.code)) return shell(<section className={panel}><h2 className="text-base font-semibold">Enable academic statistics</h2><p role="alert" className="mt-2 text-sm leading-6 text-slate-600">Run 202610230019_academic_statistics.sql, then 202610230020_academic_statistics_navigation.sql and 202610230021_academic_statistics_timezone.sql in Supabase SQL Editor after the learning platform migrations, then refresh. These add read-only, admin-only aggregates, period navigation and administrator-time-zone reporting without modifying existing lesson or account data.</p></section>);
    if (error) { console.error("Academic statistics load failed:", error.code); throw new Error("Academic statistics could not be loaded. Please try again."); }
    const report: ActivityStatistics | undefined = data[0];
    if (!report) throw new Error("Academic statistics returned no report. Please retry.");
    return shell(<AcademicStatistics data={report} tab={tab} period={period} timeZone={profile.time_zone} />);
  }
  if (view === "content") return shell(<AdminContent />);
  const isCalendar = view === "schedule";
  const mode: CalendarMode = query.mode === "day" || query.mode === "agenda" || query.mode === "month" ? query.mode : "week";
  const chosenDate = typeof query.date === "string" ? query.date : undefined;
  const range = isCalendar ? calendarDisplayRange(chosenDate, profile.time_zone, requestTime, mode) : calendarRange(chosenDate, profile.time_zone, requestTime, "month");
  const { data: records, error } = await supabase.rpc(isCalendar ? "dashboard_shared_calendar" : "dashboard_calendar_details", { p_from: range.from, p_to: range.to });
  if (error) {
    console.error("Dashboard lesson load failed:", error.code);
    if (error.code === "PGRST202" || error.code === "42883") return shell(<section className={panel}><h2 className="text-xl font-semibold">One database update is needed</h2><p className="mt-4 leading-7 text-slate-600">Run {isCalendar ? "202610210006_shared_calendar.sql, then 202610210007_shared_class_details.sql" : "202610210004_calendar_details.sql"} in your Supabase SQL Editor, then reload. Apply earlier migrations first if you have not already done so. Your accounts, profile links, and lessons will be preserved. See the Supabase setup guide for instructions.</p><Link href={`/dashboard/profile?workspace=${role}`} className={`${linkButton} mt-5`}>Open your profile</Link></section>);
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
  const notificationResponse = view === "notifications"
    ? await supabase.from("schedule_change_notifications").select("*").order("created_at", { ascending: false }).limit(20)
    : null;
  const notificationsUnavailable = !!notificationResponse?.error && ["42P01", "PGRST205"].includes(notificationResponse.error.code);
  if (notificationResponse?.error && !notificationsUnavailable) {
    console.error("Schedule change notifications could not be loaded:", notificationResponse.error.code);
    throw new Error("Your schedule change notifications could not be loaded. Please try again.");
  }
  const monthLink = (direction: number) => `/dashboard/${role}?${new URLSearchParams({ view, date: range.start.plus({ months: direction }).toISODate()! })}`;
  return shell(<div className="workspace-stack">
    {historyOnly ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">Your study status is {profile.participation_status}. Your lesson history is read-only. Contact ABVN to restore Schedule and booking access.</p> : null}
    {avatarWarning ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-950">Some participant photos could not be loaded. Initials are shown instead; your lesson data is still available. Refresh to retry, or contact ABVN if this continues.</p> : null}
    {isCalendar ? <LessonCalendar lessons={data} role={role} timeZone={profile.time_zone} now={requestTime} date={range.date} mode={mode} view={view} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{range.start.toFormat("LLLL yyyy")}</h2><nav aria-label="Choose month" className="flex gap-2"><Link href={monthLink(-1)} className={linkButton}>Previous month</Link><Link href={monthLink(1)} className={linkButton}>Next month</Link></nav></div>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white p-3">{[{ label: "Attended lessons", value: completed.length }, { label: "Learning hours", value: hours.toFixed(1) }, { label: "Your follow-up tasks", value: due.length }].map(metric => <div key={metric.label} className="flex items-center gap-2 text-sm"><dt className="text-slate-600">{metric.label}</dt><dd className="font-semibold text-(--primary)">{metric.value}</dd></div>)}</dl>
      <div className="workspace-panel-scroll flex-1 space-y-3">
      {view === "feedback" ? <>
        <h2 className="text-lg font-semibold">Needs your input</h2>
        <LessonList lessons={due} role={role} timeZone={profile.time_zone} now={requestTime} compact />
        <details className={panel}><summary className="min-h-11 cursor-pointer py-2 font-semibold">Given and received feedback this month</summary><LessonList lessons={lessons.filter(lesson => lesson.teacher_comment || lesson.student_comment)} role={role} timeZone={profile.time_zone} now={requestTime} compact /></details>
      </> : view === "notifications" ? <>
        <ScheduleChangeInbox notifications={notificationResponse?.data ?? []} timeZone={profile.time_zone} unavailable={notificationsUnavailable} />
        <h2 className="text-lg font-semibold">Your upcoming bookings this month</h2>
        <LessonList lessons={upcoming} role={role} timeZone={profile.time_zone} now={requestTime} compact />
        <h2 className="text-lg font-semibold">Follow-up reminders</h2>
        <LessonList lessons={due} role={role} timeZone={profile.time_zone} now={requestTime} compact />
      </> : <LessonList lessons={lessons.filter(lesson => Date.parse(lesson.ends_at) <= requestTime || lesson.booking_status === "cancelled" || lesson.slot_status === "cancelled")} role={role} timeZone={profile.time_zone} now={requestTime} readOnly={historyOnly} compact />}
      </div>
    </>}
  </div>);
}

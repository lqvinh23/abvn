import { notFound } from "next/navigation";
import { io } from "next/cache";
import { requireMember } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import type { StudentProfileReport } from "@/src/lib/platform/types";
import DashboardShell from "./DashboardShell";
import SetupNotice from "./SetupNotice";
import StudentEditor from "./StudentEditor";
import StudentProfileView from "./StudentProfileView";

const panel = "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8";

// Admins manage students; teachers get a read-only view of students they teach. Students have no public profile.
export default async function StudentProfilePage({ params, mode }: { params: Promise<{ role: string; code: string }>; mode: "view" | "edit" }) {
  const { role, code } = await params;
  if ((role !== "admin" && role !== "teacher") || (mode === "edit" && role !== "admin") || !/^ABVN-[0-9A-F]{12}$/.test(code)) notFound();
  if (!getSupabaseConfig()) return <main className="flex-1 px-4 py-16"><div className="mx-auto max-w-2xl"><SetupNotice /></div></main>;
  await io();
  const { supabase, profile, requestTime } = await requireMember(role);
  const { data, error } = await supabase.rpc(role === "admin" ? "admin_student_profile" : "teacher_student_profile", { p_code: code, p_time_zone: profile.time_zone });
  const missingMigration = !!error && ["42883", "PGRST202"].includes(error.code);
  if (error && !missingMigration) { console.error("Student profile load failed:", error.code); throw new Error("This student's profile could not be loaded. Please try again."); }
  if (!error && !data) notFound();
  const report: StudentProfileReport | null = data;
  // Old report functions omit teacher email/age, even when they return the lesson list.
  const outdated = !!report && (!Array.isArray(report.lessons)
    || report.profile.email === null
    || (report.details !== null && !("age" in report.details)));

  const [shellPhoto, studentPhoto, cv] = await Promise.all([
    profile.avatar_path ? supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600) : null,
    report && !outdated && report.profile.avatar_path ? supabase.storage.from("avatars").createSignedUrl(report.profile.avatar_path, 3600) : null,
    report && !outdated && report.profile.cv_path ? supabase.storage.from("recruitment-documents").createSignedUrl(report.profile.cv_path, 600) : null,
  ]);
  if (shellPhoto?.error) { console.error("Sidebar profile image load failed:", shellPhoto.error.name); throw new Error("Your profile image could not be loaded."); }
  if (studentPhoto?.error) console.error("Student photo signing failed:", studentPhoto.error.name);
  if (cv?.error) console.error("Student CV signing failed:", cv.error.name);

  const ready = report && !outdated ? report : null;
  return <DashboardShell profile={profile} workspaceRole={role} avatarUrl={shellPhoto?.data?.signedUrl ?? null} now={requestTime} currentView="students" title={ready ? `${mode === "edit" ? "Edit" : "Profile of"} ${ready.profile.full_name}` : "Student profile"} description="Review a student's profile, study status and lesson history.">
    {ready
      ? mode === "edit"
        ? <StudentEditor report={ready} now={requestTime} photoUrl={studentPhoto?.data?.signedUrl ?? null} cvUrl={cv?.data?.signedUrl ?? null} />
        : <StudentProfileView report={ready} photoUrl={studentPhoto?.data?.signedUrl ?? null} photoWarning={!!studentPhoto?.error} cvUrl={cv?.data?.signedUrl ?? null} timeZone={profile.time_zone} now={requestTime} />
      : <section className={panel}><h2 className="text-base font-semibold">Update student profiles</h2><p role="alert" className="mt-2 text-sm leading-6 text-slate-600">Ensure 202610240025_student_directory.sql and 202610240026_student_profile_details.sql have been applied, then run 202610240027_teacher_student_directory_visibility.sql in Supabase SQL Editor and refresh. This update adds teacher access to all student profiles, email and age in reports, and teacher CV access.</p></section>}
  </DashboardShell>;
}

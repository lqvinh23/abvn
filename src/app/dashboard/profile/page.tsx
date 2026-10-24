import Image from "next/image";
import { io } from "next/cache";
import { requireMember } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import SetupNotice from "@/src/components/platform/SetupNotice";
import DashboardShell from "@/src/components/platform/DashboardShell";
import TimeZoneSelect from "@/src/components/platform/TimeZoneSelect";
import ActionForm from "@/src/components/platform/ActionForm";
import { Field, Select, TextArea } from "@/src/components/platform/Fields";
import { saveProfile } from "../actions";
import { hasAdminAccess } from "@/src/lib/platform/permissions";
import type { Role } from "@/src/lib/platform/types";

export default async function ProfilePage({ searchParams }: PageProps<"/dashboard/profile">) {
  if (!getSupabaseConfig()) return <main className="flex-1 p-6"><SetupNotice /></main>;
  await io();
  const { supabase, profile, requestTime } = await requireMember();
  const query = await searchParams;
  const requestedWorkspace = query.workspace;
  const workspaceRole: Role = requestedWorkspace === "admin" && hasAdminAccess(profile)
    ? "admin"
    : requestedWorkspace === profile.role && profile.role
      ? profile.role
      : hasAdminAccess(profile)
        ? "admin"
        : profile.role ?? "student";
  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const { data, error } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 300);
    if (error) { console.error("Profile image load failed:", error.name); throw new Error("Your profile image could not be loaded."); }
    avatarUrl = data.signedUrl;
  }
  const admin = workspaceRole === "admin";
  let meetingUrl = "";
  let migrationNeeded = false;
  if (admin) {
    const { data, error } = await supabase.from("admin_preferences").select("interview_meeting_url").eq("admin_id", profile.id).maybeSingle();
    if (error && ["42P01", "PGRST205"].includes(error.code)) migrationNeeded = true;
    else if (error) { console.error("Admin preferences load failed:", error.code); throw new Error("Your interview settings could not be loaded."); }
    meetingUrl = data?.interview_meeting_url ?? "";
  }
  const applicationDetails = !admin ? await supabase.from("profile_application_details").select("*").eq("profile_id", profile.id).maybeSingle() : null;
  const detailsMissing = applicationDetails?.error && ["42P01", "PGRST205"].includes(applicationDetails.error.code);
  if (applicationDetails?.error && !detailsMissing) { console.error("Profile application details load failed:", applicationDetails.error.code); throw new Error("Your accepted application details could not be loaded."); }
  return <DashboardShell profile={profile} workspaceRole={workspaceRole} avatarUrl={avatarUrl} now={requestTime} title="My profile" description="Manage your personal details and time zone.">
    <section aria-label="Profile settings" className="workspace-panel-scroll mx-auto w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      {migrationNeeded ? <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Apply migration 202610220016_admin_profile_preferences.sql in Supabase SQL Editor to enable admin profile saving and the private interview meeting link.</p> : null}
      <ActionForm action={saveProfile} submitLabel="Save profile" preserveOnError disabled={migrationNeeded}>
        <input type="hidden" name="workspace_role" value={workspaceRole} />
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          {avatarUrl ? <Image src={avatarUrl} alt="Your profile picture" width={72} height={72} unoptimized className="size-18 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="flex size-18 shrink-0 items-center justify-center rounded-full bg-green-50 text-xl font-semibold text-green-900">{profile.full_name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span>}
          <div className="min-w-0 flex-1"><Field compact label="Profile picture (JPEG, PNG, WebP · 2 MB)" type="file" name="avatar" accept="image/jpeg,image/png,image/webp" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field compact label="Full name" name="name" defaultValue={profile.full_name} required maxLength={100} autoComplete="name" />
          <Field compact label="Email" type="email" value={profile.email} readOnly autoComplete="email" />
          <Field compact label="Country" name="country" defaultValue={profile.country} maxLength={100} autoComplete="country-name" />
          <TimeZoneSelect defaultValue={profile.time_zone} now={requestTime} />
        </div>
        {admin ? <Field compact label="Interview meeting link" name="meeting_url" type="url" defaultValue={meetingUrl} maxLength={2000} placeholder="https://meet.google.com/..." /> : <>
          <TextArea compact label="Biography" name="bio" defaultValue={profile.bio} maxLength={4000} rows={4} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field compact label={profile.role === "teacher" ? "Teaching focus" : "Learning goals"} name="teaching_focus" defaultValue={profile.teaching_focus} maxLength={500} />
            <Field compact label="Hobbies and interests" name="hobbies" defaultValue={profile.hobbies} maxLength={500} />
          </div>
          {profile.role === "student" ? <Select compact label="English level" name="proficiency" defaultValue={profile.proficiency}><option value="">Not specified</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map(level => <option key={level} value={level}>{level}</option>)}</Select> : null}
        </>}
      </ActionForm>
      {!admin && applicationDetails?.data ? <details className="mt-5 border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-semibold">Accepted application details</summary><div className="mt-4 space-y-4 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">{Object.entries({ Phone: applicationDetails.data.phone, "Date of birth": applicationDetails.data.date_of_birth ?? "Not provided", ...(applicationDetails.data.weekly_hours ? { "Hours per week": applicationDetails.data.weekly_hours } : {}) }).map(([label,value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl>
        {applicationDetails.data.intro_video_url ? <a href={applicationDetails.data.intro_video_url} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold text-green-800 underline">Introduction video</a> : null}
        {applicationDetails.data.answers.map(answer => <div key={answer.question_id}><h3 className="font-semibold">{answer.label}</h3><p className="whitespace-pre-wrap text-slate-600">{answer.answer || "Not provided"}</p></div>)}
      </div></details> : null}
      {detailsMissing ? <p role="alert" className="mt-4 text-sm text-amber-900">Apply migration 017 to link accepted application details to profiles.</p> : null}
    </section>
  </DashboardShell>;
}

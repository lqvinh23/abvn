import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/platform/server";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import SetupNotice from "@/src/components/platform/SetupNotice";
import MemberTeacherProfile from "@/src/components/teachers/MemberTeacherProfile";
import { InlineLoading } from "@/src/components/RouteLoading";

export const metadata = { title: "Member profile | ABVN", robots: { index: false, follow: false } };

async function MemberProfile({ params }: PageProps<"/members/[code]">) {
  if (!getSupabaseConfig()) return <SetupNotice />;
  await io();
  const { code } = await params;
  if (!/^ABVN-[0-9A-F]{12}$/.test(code)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("member_profile_details", { p_code: code });
  if (error) { console.error("Member profile load failed:", error.code); throw new Error("This profile could not be loaded. Please try again."); }
  const member = data[0];
  if (!member) notFound();
  if (member.role === "teacher") {
    const { data: directory, error: directoryError } = await supabase.rpc("public_teacher_directory").eq("member_code", code).maybeSingle();
    if (directoryError) {
      console.error("Teacher profile statistics load failed:", directoryError.code);
      throw new Error("This teacher's profile statistics could not be loaded. Please try again.");
    }
    const photo = directory?.avatar_path ? await supabase.storage.from("avatars").createSignedUrl(directory.avatar_path, 3600) : null;
    if (photo?.error) console.error("Teacher profile photo signing failed:", photo.error.name);
    return <MemberTeacherProfile member={member} directory={directory} portrait={photo?.data?.signedUrl ?? null} photoWarning={!!photo?.error} />;
  }
  return <article className="mx-auto max-w-4xl space-y-6">
    <Link href="/dashboard" className="inline-flex min-h-12 items-center font-semibold text-(--primary)">← Back to your workspace</Link>
    <header className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10"><p className="text-sm font-semibold uppercase tracking-wide text-(--primary)">ABVN {member.role}</p><h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">{member.full_name}</h1><p className="mt-3 text-base text-slate-600">{member.member_number !== null ? `Member ID ${member.member_number} · ` : ""}{member.country || "Country not provided"}</p>{member.role === "student" ? <p className="mt-4 text-sm text-slate-600">Private student profile. Only this student, their connected teachers, and administrators can view it.</p> : null}</header>
    {[{ title: "About", value: member.bio }, { title: "English level", value: member.proficiency }, { title: "Hobbies & interests", value: member.hobbies }].map(section => <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><h2 className="text-xl font-semibold text-slate-950">{section.title}</h2><p className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-600">{section.value || "This member has not added this information yet."}</p></section>)}
  </article>;
}

export default function MemberPage(props: PageProps<"/members/[code]">) {
  return <main className="flex-1 bg-slate-50 px-4 py-10 sm:px-6"><Suspense fallback={<InlineLoading label="Loading member profile" />}><MemberProfile {...props} /></Suspense></main>;
}

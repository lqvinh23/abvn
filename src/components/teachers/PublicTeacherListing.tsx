import { io } from "next/cache";
import { createSupabaseServerClient } from "@/src/lib/platform/server";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import TeacherListing, { type TeacherDirectoryEntry } from "./TeacherListing";

export default async function PublicTeacherListing({ page }: { page: number }) {
  if (!getSupabaseConfig()) return <TeacherListing page={page} />;
  await io();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("public_teacher_directory");
  if (error) {
    console.error("Public teacher directory load failed:", error.code);
    return <section role="alert" className="mx-auto my-10 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950"><h2 className="text-xl font-semibold">Teacher directory temporarily unavailable</h2><p className="mt-3">Please try again later. If you manage ABVN, apply the member management database migration (202610210003_member_management.sql) if it has not been applied.</p></section>;
  }
  const paths = [...new Set(data.map(teacher => teacher.avatar_path).filter((path): path is string => path !== null))];
  const photos = new Map<string, string>();
  let photoWarning = false;
  if (paths.length) {
    const signed = await supabase.storage.from("avatars").createSignedUrls(paths, 3600);
    if (signed.error || !signed.data || signed.data.some(image => image.error || !image.path || !image.signedUrl)) {
      console.error("Public teacher photos could not be loaded.");
      photoWarning = true;
    }
    for (const image of signed.data ?? []) if (image.path && image.signedUrl && !image.error) photos.set(image.path, image.signedUrl);
  }
  const entries: TeacherDirectoryEntry[] = data.map(teacher => ({
    slug: teacher.member_code, href: `/members/${teacher.member_code}`,
    name: teacher.full_name, location: teacher.country || "Country not provided",
    status: teacher.participation_status === "guest" ? "guest" : "active",
    memberSince: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(teacher.created_at)),
    sessions: teacher.lesson_count, portrait: teacher.avatar_path ? photos.get(teacher.avatar_path) ?? null : null,
  }));
  return <>{photoWarning ? <p role="alert" className="mx-auto mt-6 max-w-3xl rounded-xl bg-amber-50 p-4 text-amber-950">Some teacher photos could not be loaded. Initials are shown instead. Please refresh to retry.</p> : null}<TeacherListing page={page} entries={entries} preview={false} /></>;
}

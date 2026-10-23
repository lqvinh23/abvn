import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import SetupNotice from "@/src/components/platform/SetupNotice";
import DashboardShell from "@/src/components/platform/DashboardShell";
import { hasAdminAccess } from "@/src/lib/platform/permissions";

export default async function DashboardPage() {
  if (!getSupabaseConfig())
    return (
      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <SetupNotice />
        </div>
      </main>
    );
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const { profile } = member;
  if (profile.status === "approved" && (profile.role || hasAdminAccess(profile)))
    redirect(`/dashboard/${hasAdminAccess(profile) ? "admin" : profile.role}`);
  return (
    <DashboardShell
      profile={profile}
      title={`Welcome, ${profile.full_name}`}
      description="Your free ABVN learning journey starts with a membership review."
    >
      <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        {profile.status === "pending" && !profile.requested_role ? (
          <>
            <h2 className="text-2xl font-semibold text-slate-950">
              How would you like to join?
            </h2>
            <p className="my-5 text-base leading-7 text-slate-600">
              You are signed in as a guest. Complete an application, follow
              its review, and book an interview once invited. Your teacher or
              student account is activated after the final decision.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/apply" className="inline-flex min-h-12 items-center rounded-lg bg-(--primary) px-5 py-3 font-semibold text-white">Teacher application / progress</Link>
              <Link href="/student-apply" className="inline-flex min-h-12 items-center rounded-lg border border-green-700 px-5 py-3 font-semibold text-green-800">Student application / progress</Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-slate-950">
              {profile.status === "pending"
                ? "Your membership is awaiting review"
                : profile.status === "suspended"
                  ? "Your membership is suspended"
                  : "Your request was not approved"}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Requested role:{" "}
              {profile.requested_role ?? profile.role ?? "Not selected"}.
              Contact ABVN if you need help. You cannot book or publish lessons
              until your account is approved.
            </p>
            <a
              href="mailto:abettervnproject@gmail.com"
              className="mt-5 inline-flex min-h-11 items-center font-semibold text-(--primary) hover:underline"
            >
              Contact ABVN
            </a>
            {!profile.role ? <div className="mt-4 flex flex-wrap gap-4"><Link href="/apply" className="font-semibold text-green-800 underline">Teacher recruitment</Link><Link href="/student-apply" className="font-semibold text-green-800 underline">Student recruitment</Link></div> : null}
          </>
        )}
      </section>
    </DashboardShell>
  );
}

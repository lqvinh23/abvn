import { redirect } from "next/navigation";
import { getCurrentMember } from "@/src/lib/platform/auth";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import SetupNotice from "@/src/components/platform/SetupNotice";
import DashboardShell from "@/src/components/platform/DashboardShell";
import ActionForm from "@/src/components/platform/ActionForm";
import { Select } from "@/src/components/platform/Fields";
import { requestMembership } from "./actions";

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
  if (profile.role && profile.status === "approved")
    redirect(`/dashboard/${profile.role}`);
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
              Choose the role that fits you. ABVN will review your request
              before you can access lessons. This request does not replace
              programme eligibility screening.
            </p>
            <ActionForm
              action={requestMembership}
              submitLabel="Request membership"
            >
              <Select label="I would like to join as" name="role" required>
                <option value="student">A student</option>
                <option value="teacher">A volunteer teacher</option>
              </Select>
            </ActionForm>
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
          </>
        )}
      </section>
    </DashboardShell>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/src/lib/platform/config";
import { getCurrentMember } from "@/src/lib/platform/auth";
import { signInWithGoogle } from "@/src/app/auth/actions";
import SetupNotice from "@/src/components/platform/SetupNotice";
import { InlineLoading } from "@/src/components/RouteLoading";

export const metadata = { title: "Sign in | A Better Vietnam" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="flex-1 bg-(--muted) px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--primary)">
          ABVN learning platform
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Your next conversation starts here.
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">
          Sign in to manage lessons, connect with your teacher or student, and
          follow your progress.
        </p>
        <div className="mt-8">
          <Suspense fallback={<InlineLoading label="Checking sign-in" />}>
            <LoginContent {...props} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function LoginContent({ searchParams }: PageProps<"/login">) {
  if (!getSupabaseConfig()) return <SetupNotice />;
  const member = await getCurrentMember();
  if (member) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      {error ? (
        <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800">
          Sign-in did not complete. Please try again. If it continues, contact
          ABVN.
        </p>
      ) : null}
      <form action={signInWithGoogle}>
        <button className="min-h-12 w-full rounded-full bg-(--primary) px-6 py-3 text-base font-semibold text-white hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--primary)">
          Continue with Google
        </button>
      </form>
      <p className="mt-5 text-sm leading-6 text-slate-600">
        New members join as guests and can apply as a student or teacher after
        sign-in. ABVN reviews your application and interview before activating your account. Google
        sign-in does not automatically grant a teaching or administrator role.
      </p>
    </div>
  );
}

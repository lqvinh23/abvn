import Link from "next/link";

export default function SetupNotice() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-slate-950">
        The learning platform needs setup
      </h2>
      <p className="mt-3 text-base leading-7 text-slate-700">
        Supabase and Google sign-in are not configured yet. An ABVN
        administrator needs to create the Supabase project, apply the database
        migration, and configure the environment variables described in the
        platform setup guide.
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        No demo login or simulated booking is enabled. Your account and lessons
        will be stored in the configured Supabase project.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center font-semibold text-(--primary) hover:underline"
      >
        Back to ABVN
      </Link>
    </div>
  );
}

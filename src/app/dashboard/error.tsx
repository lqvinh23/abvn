"use client";

import Link from "next/link";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="flex-1 px-4 py-16">
      <div
        role="alert"
        className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8"
      >
        <h1 className="text-2xl font-semibold text-slate-950">
          Your dashboard could not be loaded
        </h1>
        <p className="mt-4 leading-7 text-slate-700">
          Please retry. If this continues, check the Supabase setup or contact
          ABVN. No changes have been confirmed.
        </p>
        <button
          onClick={reset}
          className="mt-5 min-h-11 rounded-md bg-(--primary) px-5 py-3 font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/login"
          className="ml-5 inline-flex min-h-11 items-center font-semibold text-(--primary)"
        >
          Return to sign-in
        </Link>
      </div>
    </main>
  );
}

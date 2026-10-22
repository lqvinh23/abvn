export default function TeacherProfileLoading() {
  return (
    <main className="flex-1 px-4 py-14 sm:px-6 lg:px-8" aria-busy="true">
      <div className="mx-auto max-w-7xl">
        <p role="status" className="text-lg font-semibold text-(--primary)">
          Loading teacher profile...
        </p>
        <div
          aria-hidden="true"
          className="mt-8 grid gap-8 motion-safe:animate-pulse md:grid-cols-[18rem_1fr]"
        >
          <div className="aspect-square rounded-3xl bg-slate-100" />
          <div className="space-y-5">
            <div className="h-12 w-2/3 rounded-lg bg-slate-100" />
            <div className="h-6 w-1/2 rounded-lg bg-slate-100" />
            <div className="h-32 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}

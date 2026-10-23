type LoadingVariant = "page" | "dashboard";

export function LoadingStatus({ label }: { label: string }) {
  return <div role="status" aria-live="polite" className="flex items-center gap-3">
    <span aria-hidden="true" className="size-5 rounded-full border-2 border-green-100 border-t-green-700 motion-safe:animate-spin motion-reduce:animate-none" />
    <span className="text-sm font-semibold text-green-900">{label}</span>
  </div>;
}

export function InlineLoading({ label }: { label: string }) {
  return <div aria-busy="true" className="flex min-h-32 flex-col items-center justify-center gap-4 py-8">
    <LoadingStatus label={label} />
    <div aria-hidden="true" className="w-full max-w-2xl space-y-2 motion-safe:animate-pulse motion-reduce:animate-none">
      <div className="h-4 rounded bg-slate-100" />
      <div className="h-4 w-4/5 rounded bg-slate-100" />
    </div>
  </div>;
}

function PageLoading() {
  return <main aria-busy="true" className="min-h-[60vh] flex-1 px-4 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <LoadingStatus label="Loading page" />
      <div aria-hidden="true" className="mt-8 space-y-6 motion-safe:animate-pulse motion-reduce:animate-none">
        <div className="h-10 w-2/3 max-w-xl rounded-lg bg-slate-200" />
        <div className="h-5 w-full max-w-3xl rounded bg-slate-100" />
        <div className="h-5 w-5/6 max-w-2xl rounded bg-slate-100" />
        <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-44 rounded-2xl border border-slate-200 bg-white" />
          <div className="h-44 rounded-2xl border border-slate-200 bg-white" />
          <div className="h-44 rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  </main>;
}

function DashboardLoading() {
  return <main aria-busy="true" className="min-h-0 flex-1 overflow-auto bg-[#f4f8f5] p-3 sm:p-4 lg:p-5">
    <div className="mx-auto flex min-h-full max-w-[100rem] gap-4">
      <aside aria-hidden="true" className="hidden w-64 shrink-0 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 xl:block motion-reduce:animate-none">
        <div className="h-10 w-36 rounded bg-slate-100" />
        <div className="mt-8 space-y-3">{[0, 1, 2, 3, 4].map(item => <div key={item} className="h-11 rounded-lg bg-slate-100" />)}</div>
      </aside>
      <section className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <LoadingStatus label="Loading your dashboard" />
        <div aria-hidden="true" className="mt-7 motion-safe:animate-pulse motion-reduce:animate-none">
          <div className="h-11 w-full rounded-lg bg-slate-100" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(item => <div key={item} className="h-28 rounded-xl border border-slate-200 bg-slate-50" />)}
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
            <div className="h-72 rounded-xl border border-slate-200 bg-slate-50" />
            <div className="h-72 rounded-xl border border-slate-200 bg-slate-50" />
          </div>
        </div>
      </section>
    </div>
  </main>;
}

export default function RouteLoading({ variant }: { variant: LoadingVariant }) {
  return variant === "dashboard" ? <DashboardLoading /> : <PageLoading />;
}

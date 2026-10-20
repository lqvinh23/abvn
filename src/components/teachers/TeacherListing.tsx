import Link from "next/link";
import Image from "next/image";
import ContentPagination from "@/src/components/ContentPagination";
import { getPageItems } from "@/src/lib/content-pagination";
import { teacherProfiles } from "@/src/lib/teacher-profiles";

export default function TeacherListing({ page }: { page: number }) {
  const {
    items: visibleTeachers,
    currentPage,
    totalPages,
    start,
  } = getPageItems(teacherProfiles, page);

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
              Meet the community
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Teachers from around the world
            </h2>
          </div>
        </div>

        <p className="mt-7 text-sm text-slate-600" aria-live="polite">
          Showing {start + 1}–{start + visibleTeachers.length} of{" "}
          {teacherProfiles.length} featured profiles
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTeachers.map(
            ({ slug, name, location, memberSince, sessions, portrait }) => (
              <Link
                key={slug}
                href={`/teachers/${slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
              >
                <div className="relative h-48 overflow-hidden bg-(--muted)">
                  <Image
                    src={portrait}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-slate-900">
                    {name}
                  </h3>
                  <p className="mt-2 text-base text-slate-700">{location}</p>
                  <div className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
                    <p>Member since {memberSince}</p>
                    <p className="mt-1">{sessions} sessions listed</p>
                  </div>
                  <span className="mt-4 inline-flex min-h-10 items-center font-semibold text-(--primary)">
                    View teacher profile
                    <span aria-hidden="true" className="ml-2">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            ),
          )}
        </div>
        <ContentPagination
          basePath="/teachers"
          currentPage={currentPage}
          totalPages={totalPages}
        />

        <div className="mt-12 rounded-2xl bg-(--muted) p-7 sm:p-9">
          <h2 className="text-2xl font-semibold text-slate-950">
            Share your experience with a learner
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
            ABVN welcomes volunteer teachers who want to support young people
            through English education and cultural exchange.
          </p>
          <Link
            href="/apply"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-md bg-(--primary) px-6 py-3 font-semibold text-white transition-colors hover:bg-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            Learn about volunteering
          </Link>
        </div>
      </div>
    </section>
  );
}

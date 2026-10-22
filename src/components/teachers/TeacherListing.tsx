"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ContentPagination from "@/src/components/ContentPagination";
import { getPageItems } from "@/src/lib/content-pagination";
import {
  TEACHERS_PER_PAGE,
  teacherProfiles,
  type TeacherStatus,
  type TeacherProfile,
} from "@/src/lib/teacher-profiles";

export type TeacherDirectoryEntry = Pick<TeacherProfile, "slug" | "name" | "location" | "status" | "memberSince" | "sessions"> & { portrait: string | null; href?: string };

export default function TeacherListing({ page, entries = teacherProfiles, preview = true }: { page: number; entries?: TeacherDirectoryEntry[]; preview?: boolean }) {
  const [status, setStatus] = useState<TeacherStatus>("active");
  const [selectedPage, setSelectedPage] = useState(page);
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const teachers = entries.filter(teacher => teacher.status === status).sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
  const statuses = ["active", "guest"] as const;
  const {
    items: visibleTeachers,
    currentPage,
    totalPages,
    start,
  } = getPageItems(teachers, selectedPage, TEACHERS_PER_PAGE);

  function selectStatus(nextStatus: TeacherStatus) {
    setStatus(nextStatus);
    setSelectedPage(1);
  }

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

        {preview ? <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Preview directory: active/guest status and extended profile details
          are sample content. Includes fictional sample teachers for pagination.
          Portraits are placeholders.
        </p> : null}
        {failedPhotos.length ? <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Some teacher photos could not be displayed. Initials are shown instead. Refresh to retry.</p> : null}

        <div
          role="tablist"
          aria-label="Teacher activity"
          className="mt-7 flex gap-2 border-b border-slate-200"
        >
          {statuses.map((value, index) => (
            <button
              key={value}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`teachers-tab-${value}`}
              aria-selected={status === value}
              aria-controls="teachers-panel"
              tabIndex={status === value ? 0 : -1}
              onClick={() => selectStatus(value)}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                ) {
                  return;
                }
                event.preventDefault();
                const nextIndex =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 1
                      : 1 - index;
                selectStatus(statuses[nextIndex]);
                tabRefs.current[nextIndex]?.focus();
              }}
              className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold capitalize transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) sm:px-6 ${
                status === value
                  ? "border-(--primary) text-(--primary)"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"
              }`}
            >
              {value} teachers
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {entries.filter(teacher => teacher.status === value).length}
              </span>
            </button>
          ))}
        </div>

        <div
          id="teachers-panel"
          role="tabpanel"
          aria-labelledby={`teachers-tab-${status}`}
          tabIndex={0}
          className="pt-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--primary)"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <p aria-live="polite">
              {teachers.length === 0 ? (
                "No teachers in this tab."
              ) : (
                <>
                  Showing {start + 1}–{start + visibleTeachers.length} of{" "}
                  {teachers.length} {status} teachers
                </>
              )}
            </p>
            <p>Most lessons first · Name A–Z · 12 per page</p>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleTeachers.map(
              ({ slug, name, location, memberSince, sessions, portrait, href }) => (
                <Link
                  key={slug}
                  href={href ?? `/teachers/${slug}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors hover:border-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-(--muted)">
                    {portrait && !failedPhotos.includes(slug) ? <Image
                      src={portrait}
                      alt=""
                      fill
                      unoptimized={!!href}
                      onError={() => setFailedPhotos(current => current.includes(slug) ? current : [...current, slug])}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover object-top"
                    /> : <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-green-50 text-5xl font-semibold text-green-800">{name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span>}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {name}
                    </h3>
                    <p className="mt-2 text-base text-slate-700">{location}</p>
                    <div className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
                      <p>Member since {memberSince}</p>
                      <p className="mt-1 font-semibold text-(--primary)">
                        {sessions.toLocaleString("en-US")} lessons
                      </p>
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
            onPageChange={setSelectedPage}
          />
        </div>

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

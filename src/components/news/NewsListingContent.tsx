import Link from "next/link";
import Image from "next/image";
import ContentPagination from "@/src/components/ContentPagination";
import { getPageItems } from "@/src/lib/content-pagination";
import type { EditableArticle } from "@/src/lib/content/schema";

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/a-better-vietnam",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/a_better_vietnam/",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCd1MvLDKJhK2odFskFqF4MA",
  },
];

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function NewsListingContent({ page, articles: newsArticles, onPageChange }: { page: number; articles: EditableArticle[]; onPageChange?: (page: number) => void }) {
  const {
    items: visibleArticles,
    currentPage,
    totalPages,
    start,
  } = getPageItems(newsArticles, page);

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold tracking-tight text-slate-950">
          Latest news
        </h2>
        <p className="mt-5 text-sm text-slate-600" aria-live="polite">
          Showing {visibleArticles.length ? start + 1 : 0}–{start + visibleArticles.length} of{" "}
          {newsArticles.length} stories
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {!visibleArticles.length ? <p className="text-slate-600">There are no published stories yet. Check back soon.</p> : null}
          {visibleArticles.map(
            ({ slug, title, category, date, summary, image, imageAlt }) => (
              <article
                key={slug}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <Link
                  href={`/news/${slug}`}
                  className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--primary)"
                >
                  <div className="relative h-48 overflow-hidden bg-(--muted)">
                    <Image
                      unoptimized
                      src={image}
                      alt={imageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-6">
                    <p className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="font-bold uppercase tracking-[0.12em] text-(--primary)">
                        {category}
                      </span>
                      <time dateTime={date}>
                        {dateFormatter.format(new Date(date))}
                      </time>
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900 group-hover:text-(--primary)">
                      {title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-slate-700">
                      {summary}
                    </p>
                    <span className="mt-4 inline-flex min-h-10 items-center font-semibold text-(--primary)">
                      Read article
                      <span aria-hidden="true" className="ml-2">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </article>
            ),
          )}
        </div>
        <ContentPagination
          basePath="/news"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-7 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Stay connected with A Better Vietnam.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
            Follow our social channels for the latest news and community
            updates.
          </p>
          <ul className="mt-6 flex flex-wrap gap-3">
            {socialLinks.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="button-secondary inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 font-semibold transition-colors"
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/about"
                className="button-primary inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 font-semibold transition-colors"
              >
                About ABVN
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

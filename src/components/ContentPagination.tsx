import Link from "next/link";

type ContentPaginationProps = {
  basePath: string;
  currentPage: number;
  totalPages: number;
};

function getPageHref(basePath: string, page: number) {
  return page === 1 ? basePath : `${basePath}/page/${page}`;
}

export default function ContentPagination({
  basePath,
  currentPage,
  totalPages,
}: ContentPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        <Link
          href={getPageHref(basePath, currentPage - 1)}
          rel="prev"
          className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
        >
          Previous
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
          Previous
        </span>
      )}

      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (page) =>
          page === currentPage ? (
            <span
              key={page}
              aria-current="page"
              className="inline-flex size-11 items-center justify-center rounded-md bg-(--primary) text-sm font-bold text-white"
            >
              {page}
            </span>
          ) : (
            <Link
              key={page}
              href={getPageHref(basePath, page)}
              aria-label={`Go to page ${page}`}
              className="inline-flex size-11 items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-700 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
            >
              {page}
            </Link>
          ),
      )}

      {currentPage < totalPages ? (
        <Link
          href={getPageHref(basePath, currentPage + 1)}
          rel="next"
          className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-(--primary) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
        >
          Next
        </Link>
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
          Next
        </span>
      )}
    </nav>
  );
}

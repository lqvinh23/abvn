import Link from "next/link";
import type { ReactNode } from "react";

type ContentPaginationProps = {
  basePath: string;
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
};

function getPageHref(basePath: string, page: number) {
  return page === 1 ? basePath : `${basePath}/page/${page}`;
}

export default function ContentPagination({
  basePath,
  currentPage,
  totalPages,
  onPageChange,
}: ContentPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  function pageControl(
    page: number,
    children: ReactNode,
    className: string,
    rel?: "prev" | "next",
  ) {
    const label = typeof children === "number" ? `Go to page ${page}` : undefined;

    return onPageChange ? (
      <button
        type="button"
        onClick={() => onPageChange(page)}
        aria-label={label}
        className={className}
      >
        {children}
      </button>
    ) : (
      <Link
        href={getPageHref(basePath, page)}
        rel={rel}
        aria-label={label}
        className={className}
      >
        {children}
      </Link>
    );
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        pageControl(
          currentPage - 1,
          "Previous",
          "button-secondary inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors",
          "prev",
        )
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
            <span key={page}>
              {pageControl(
                page,
                page,
                "button-secondary inline-flex size-11 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
              )}
            </span>
          ),
      )}

      {currentPage < totalPages ? (
        pageControl(
          currentPage + 1,
          "Next",
          "button-secondary inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors",
          "next",
        )
      ) : (
        <span className="inline-flex min-h-11 items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
          Next
        </span>
      )}
    </nav>
  );
}

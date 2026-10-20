export const ITEMS_PER_PAGE = 6;

export function getPageNumber(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getPageItems<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;

  return {
    items: items.slice(start, start + ITEMS_PER_PAGE),
    currentPage,
    totalPages,
    start,
  };
}

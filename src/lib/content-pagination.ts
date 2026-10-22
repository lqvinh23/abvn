export const ITEMS_PER_PAGE = 6;

export function getPageNumber(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getPageItems<T>(
  items: T[],
  page: number,
  itemsPerPage = ITEMS_PER_PAGE,
) {
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * itemsPerPage;

  return {
    items: items.slice(start, start + itemsPerPage),
    currentPage,
    totalPages,
    start,
  };
}

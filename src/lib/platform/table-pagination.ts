export function tablePage(total: number, requestedPage: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(requestedPage, pages));
  const start = (page - 1) * pageSize;
  return { page, pages, start, end: Math.min(start + pageSize, total) };
}

export function tablePageHref(href: string, page: number, pageSize: number) {
  const [pathname, search] = href.split("?");
  const params = new URLSearchParams(search);
  params.set("page", String(page));
  params.set("size", String(pageSize));
  return `${pathname}?${params}`;
}

export async function loadTablePage<T extends { error: { code?: string } | null; count: number | null }>(
  request: (from: number, to: number) => PromiseLike<T>,
  page: number,
  pageSize: number,
  onOutOfRange: (page: number) => never,
): Promise<T> {
  const response = await request((page - 1) * pageSize, page * pageSize - 1);
  if (response.error?.code !== "PGRST103" || page === 1) return response;
  const first = await request(0, 0);
  if (first.error) return first;
  if (first.count === null) throw new Error("The table row count could not be loaded. Please try again.");
  return onOutOfRange(tablePage(first.count, page, pageSize).page);
}

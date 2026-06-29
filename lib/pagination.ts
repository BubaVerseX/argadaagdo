export const DEFAULT_PAGE_SIZE = 12;

export function getTotalPages(totalItems: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampPage(page: number, totalItems: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.min(Math.max(page, 1), getTotalPages(totalItems, pageSize));
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = DEFAULT_PAGE_SIZE
) {
  const safePage = clampPage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages: getTotalPages(items.length, pageSize),
    items: items.slice(start, start + pageSize),
    startIndex: items.length === 0 ? 0 : start + 1,
    endIndex: Math.min(start + pageSize, items.length),
  };
}

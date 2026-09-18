export interface PageView<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
export function pageOf<T>(items: T[], total: number, page: { limit: number; offset: number }): PageView<T> {
  return { items, total, limit: page.limit, offset: page.offset };
}

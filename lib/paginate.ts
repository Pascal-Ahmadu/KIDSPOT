/** Slice a list for page `pageParam` (1-based, clamped to the available pages). */
export function paginate<T>(items: T[], pageParam: string | undefined, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1), pageCount);
  const start = (page - 1) * pageSize;
  return { page, pageCount, rows: items.slice(start, start + pageSize), from: items.length ? start + 1 : 0, to: Math.min(start + pageSize, items.length), total: items.length };
}

/**
 * The message to show a person when something fails. Our own errors (e.g. "Only 2 × Gucci 3-piece left.")
 * are already written for people and pass through. Database errors never reach the screen: their raw
 * text is SQL ("Failed query: insert into …"), so they become a plain sentence and the full detail goes
 * to the server log.
 */
export function userMessage(e: unknown, fallback: string): string {
  const chain: string[] = [];
  for (let err: unknown = e, i = 0; err && i < 5; err = (err as { cause?: unknown }).cause, i++) {
    chain.push(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
  }
  const all = chain.join(" | ");
  const fromDatabase = /Failed query|SQLITE_|LibsqlError|constraint failed|no such (table|column)|syntax error|database is locked|SqliteError/i.test(all);
  if (!fromDatabase) return (e instanceof Error && e.message) || fallback;

  console.error(`[${fallback}]`, e);
  const unique = all.match(/UNIQUE constraint failed: (\w+)\.(\w+)/i);
  if (unique) {
    const [, table, column] = unique;
    const known: Record<string, string> = {
      "products.sku": "A product with that SKU already exists.",
      "products.slug": "A product with that web address already exists. Change the name or the web address.",
      "categories.slug": "A category with that name already exists.",
      "customers.email": "That email is already used by another customer.",
      "accounts.email": "An account with that email already exists.",
      "staff.email": "A team member with that email already exists.",
      "coupons.code": "A discount code with that name already exists.",
      "orders.order_number": "That order number is already used. Please try again.",
      "subscribers.email": "That email is already subscribed.",
    };
    return known[`${table}.${column}`.toLowerCase()] ?? "That already exists. Please use a different value.";
  }
  if (/database is locked|SQLITE_BUSY/i.test(all)) return "The system is busy. Please try again in a moment.";
  if (/FOREIGN KEY constraint failed/i.test(all)) return "This is linked to other records, so it can't be changed that way.";
  if (/NOT NULL constraint failed/i.test(all)) return "A required detail is missing. Please check the form and try again.";
  return fallback;
}

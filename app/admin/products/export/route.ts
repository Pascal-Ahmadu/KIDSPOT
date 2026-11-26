import { getAdminSession } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { IMPORT_COLUMNS, exportRows } from "@/lib/product-import";

export const dynamic = "force-dynamic";

/** All products in the import format, so the file can be edited and uploaded again. */
export async function GET() {
  if (!(await getAdminSession())) return new Response("Not found", { status: 404 });
  return csvResponse([[...IMPORT_COLUMNS], ...await exportRows()], `products-${new Date().toISOString().slice(0, 10)}.csv`);
}

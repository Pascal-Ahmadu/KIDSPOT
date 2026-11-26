import { getAdminSession } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { IMPORT_COLUMNS } from "@/lib/product-import";

export const dynamic = "force-dynamic";

/** An empty import file with the headings and two example rows. */
export async function GET() {
  if (!(await getAdminSession())) return new Response("Not found", { status: 404 });
  return csvResponse(
    [
      [...IMPORT_COLUMNS],
      ["KS-0001", "Pink princess dress with flower appliqué", "Kid's Spot", "Clothing", "130000", "10", "pink|white", "S|M", "girls", "Long tulle dress with flower appliqué", "yes"],
      ["KS-0002", "Baby socks (5 pairs)", "Sunnozy", "Accessories", "", "30", "", "", "unisex", "Leave the price empty to import it hidden", "no"],
    ],
    "products-template.csv",
  );
}

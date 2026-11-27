import { unsubscribeCustomer } from "@/lib/actions/unsubscribe";

/** One-click unsubscribe from the email app's own button (List-Unsubscribe-Post, RFC 8058). */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const ok = await unsubscribeCustomer(Number(url.searchParams.get("c")), url.searchParams.get("t") ?? "");
  return new Response(ok ? "Unsubscribed" : "Invalid link", { status: ok ? 200 : 400 });
}

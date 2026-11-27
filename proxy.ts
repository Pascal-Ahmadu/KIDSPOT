import { NextRequest, NextResponse } from "next/server";
import { isBlockedBot } from "@/lib/bots";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Scraper bots are turned away before any page is built (they cost hosting time, not sales).
  if (isBlockedBot(request.headers.get("user-agent"))) {
    return new NextResponse("Automated access is not allowed. See /robots.txt.", { status: 403, headers: { "Cache-Control": "public, max-age=3600" } });
  }
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  // Pass the path on so the admin layout can check the staff member's role for this page.
  const headers = new Headers(request.headers);
  headers.set("x-admin-path", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Every page and API call; not static files, images, robots.txt or the sitemap.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpe?g|webp|gif|svg|ico|css|js|txt|xml|woff2?)$).*)"],
};

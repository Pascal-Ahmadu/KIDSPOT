import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LinePattern } from "@/components/admin/line-pattern";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/auth";
import { STORE_NAME } from "@/lib/format";

export const metadata: Metadata = { title: "Log in" };

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

/**
 * "Login - Form - Open" design: left half white with the logo in a 96px header and the 360px form
 * centred below; right half light grey with white line patterns (top-right, bottom-left) and a framed
 * screenshot of the Kid's Spot dashboard running off the right edge.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  const { next } = await searchParams;
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className={`${inter.className} grid min-h-screen bg-white lg:grid-cols-2`}>
      {/* Left: header + form */}
      <section className="flex min-h-screen flex-col">
        <header className="flex h-24 items-start p-8">
          <Link href="/" className="flex items-center gap-2" aria-label={`${STORE_NAME} home`}>
            <Image src="/brand/kidspot-logo.png" alt={STORE_NAME} width={113} height={40} priority className="h-10 w-auto" />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 pb-24 sm:px-8">
          <div className="flex w-full max-w-[360px] flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h1 className="text-4xl font-semibold leading-[44px] tracking-[-0.02em] text-ink">Log in</h1>
              <p className="text-base leading-6 text-muted">Welcome back! Please enter your details to manage the store.</p>
            </div>
            <LoginForm next={next} />
            <p className="text-center text-sm leading-5 text-muted">
              Not an admin?{" "}
              <Link href="/" className="font-medium text-brand hover:underline">Back to the store</Link>
            </p>
            {isDev && (
              <p className="rounded-[8px] bg-surface px-3 py-2 text-center text-xs text-muted">
                Development only: default login <code>admin@kidstore.local</code> / <code>admin123</code>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Right: grey panel with line patterns and a framed preview of the real dashboard (Section design) */}
      <section className="relative hidden overflow-hidden bg-surface lg:block" aria-hidden="true">
        <LinePattern className="absolute right-0 top-0 h-[408px] w-[298px]" />
        <LinePattern className="absolute -bottom-64 left-0 h-[408px] w-[298px]" />
        <div className="absolute left-12 top-1/2 w-[min(1000px,90%)] -translate-y-1/2 xl:left-24">
          <div className="overflow-hidden rounded-[12px] border-[5px] border-ink bg-white shadow-[0_24px_48px_-12px_rgba(16,24,40,0.18)]">
            <Image src="/brand/admin-preview.png" alt="" width={1440} height={900} priority sizes="50vw" className="h-auto w-full" />
          </div>
        </div>
      </section>
    </div>
  );
}

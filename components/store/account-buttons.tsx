"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logoutAction } from "@/lib/actions/account";
import { useAccount, type AuthTab } from "@/lib/store/account";

export function OpenAuthButton({ tab = "login", children, className }: { tab?: AuthTab; children: React.ReactNode; className?: string }) {
  const openAuth = useAccount((s) => s.openAuth);
  return (
    <button type="button" onClick={() => openAuth(tab)} className={className}>
      {children}
    </button>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const setMe = useAccount((s) => s.setMe);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logoutAction();
          setMe(null);
          router.push("/");
          router.refresh();
        })
      }
      className={className}
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}

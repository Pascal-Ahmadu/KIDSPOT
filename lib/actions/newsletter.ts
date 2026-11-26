"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { getWelcomeOffer } from "@/lib/queries";

export type NewsletterState = { ok?: boolean; already?: boolean; error?: string; code?: string | null; label?: string | null };

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(120),
  source: z.string().max(40).optional(),
  website: z.string().max(0).optional(), // honeypot
});

/** Newsletter sign-up. Returns the welcome code (if one is active) so the shopper can use it straight away. */
export async function subscribeAction(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true };
    return { error: parsed.error.issues[0]?.message ?? "Please enter a valid email" };
  }
  const email = parsed.data.email.toLowerCase();
  const exists = await db.select({ id: subscribers.id }).from(subscribers).where(eq(subscribers.email, email)).get();
  if (!exists) await db.insert(subscribers).values({ email, source: parsed.data.source || null }).run();
  revalidatePath("/admin/subscribers");
  const offer = await getWelcomeOffer();
  return { ok: true, already: !!exists, code: offer?.code ?? null, label: offer?.label ?? null };
}

export async function deleteSubscriberAction(id: number) {
  if (!(await getAdminSession())) throw new Error("Unauthorised");
  await db.delete(subscribers).where(eq(subscribers.id, id)).run();
  revalidatePath("/admin/subscribers");
}

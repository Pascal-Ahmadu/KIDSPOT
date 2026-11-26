"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONTACT_SUBJECTS } from "@/lib/attributes";
import { contactMessages } from "@/lib/db/schema";

export type ContactState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Please enter a valid email").max(120),
  phone: z.string().trim().max(30).optional(),
  subject: z.enum(CONTACT_SUBJECTS, { message: "Please choose a subject" }),
  message: z.string().trim().min(10, "Please write a little more (at least 10 characters)").max(3000),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

/** Contact page form. Saves the message for the team to read in Admin → Messages. */
export async function sendContactMessageAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    // A filled honeypot means a bot: pretend it worked.
    if (fieldErrors.website) return { ok: true };
    return { error: "Please check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();

  // One message per email per minute keeps accidental double-sends and simple spam out.
  const recent = await db
      .select({ id: contactMessages.id })
      .from(contactMessages)
      .where(and(eq(contactMessages.email, email), gt(contactMessages.createdAt, Math.floor(Date.now() / 1000) - 60)))
      .get();
  if (recent) return { error: "We've just received a message from you. Please wait a minute before sending another." };

  await db.insert(contactMessages).values({ name: d.name, email, phone: d.phone || null, subject: d.subject, message: d.message }).run();
  revalidatePath("/admin", "layout");
  return { ok: true };
}

async function requireAdmin() {
  if (!(await getAdminSession())) throw new Error("Unauthorised");
}

export async function setMessageReadAction(id: number, isRead: boolean) {
  await requireAdmin();
  await db.update(contactMessages).set({ isRead }).where(eq(contactMessages.id, id)).run();
  revalidatePath("/admin", "layout");
}

export async function deleteMessageAction(id: number) {
  await requireAdmin();
  await db.delete(contactMessages).where(eq(contactMessages.id, id)).run();
  revalidatePath("/admin", "layout");
}

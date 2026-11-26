"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { slugify } from "@/lib/format";
import type { ActionState } from "./products";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  description: z.string().trim().optional(),
});

async function requireAdmin() {
  if (!(await getAdminSession())) throw new Error("Unauthorised");
}

export async function saveCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const values = { ...parsed.data, description: parsed.data.description || null, slug: slugify(parsed.data.name) };
  try {
    if (id) await db.update(categories).set(values).where(eq(categories.id, id));
    else await db.insert(categories).values(values);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg.includes("UNIQUE") ? "A category with that name already exists." : msg };
  }
  revalidatePath("/", "layout");
  return { success: id ? "Category updated." : "Category created." };
}

export async function deleteCategoryAction(id: number) {
  await requireAdmin();
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/", "layout");
}

/** Quick add from the product form: creates a category by name and returns it so it can be selected. */
export async function quickAddCategoryAction(rawName: string): Promise<{ category?: { id: number; name: string }; error?: string }> {
  await requireAdmin();
  const parsed = schema.pick({ name: true }).safeParse({ name: rawName });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  const name = parsed.data.name;
  const slug = slugify(name);
  const existing = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing[0]) return { category: existing[0] };
  try {
    const row = db.insert(categories).values({ name, slug }).returning({ id: categories.id, name: categories.name }).get();
    revalidatePath("/", "layout");
    return { category: row };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg.includes("UNIQUE") ? "A category with that name already exists." : "Couldn't add the category." };
  }
}

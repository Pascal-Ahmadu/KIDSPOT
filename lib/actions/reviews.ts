"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { refreshShop } from "@/lib/shop-cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, orderItems, orders, products, reviews } from "@/lib/db/schema";

export type ReviewState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  productId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Please enter your name").max(60),
  email: z.string().trim().email("Please enter a valid email"),
  rating: z.coerce.number().int().min(1, "Please choose a star rating").max(5),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(2000),
  // Honeypot: real people leave this empty.
  website: z.string().max(0).optional(),
});

/** Public: leave a review. One review per email per product; "verified" if that email ordered it. */
export async function submitReviewAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    if (fieldErrors.website) return { ok: true }; // silently drop bots
    return { error: "Please check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();

  const product = await db.select({ id: products.id, slug: products.slug }).from(products).where(eq(products.id, d.productId)).get();
  if (!product) return { error: "That product no longer exists." };

  const existing = await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.productId, d.productId), eq(reviews.email, email))).get();
  if (existing) return { error: "You've already reviewed this product. Thank you!" };

  const bought = await db
      .select({ n: sql<number>`count(*)` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(orderItems.productId, d.productId), eq(customers.email, email), sql`${orders.status} != 'cancelled'`))
      .get();

  await db.insert(reviews)
        .values({ productId: d.productId, name: d.name, email, rating: d.rating, title: d.title || null, body: d.body, verified: (bought?.n ?? 0) > 0 })
        .run();

  revalidatePath(`/products/${product.slug}`);
  return { ok: true };
}

async function requireAdmin() {
  if (!(await getAdminSession())) throw new Error("Unauthorised");
}

export async function setReviewPublishedAction(id: number, isPublished: boolean) {
  await requireAdmin();
  await db.update(reviews).set({ isPublished }).where(eq(reviews.id, id)).run();
  refreshShop();
}

export async function deleteReviewAction(id: number) {
  await requireAdmin();
  await db.delete(reviews).where(eq(reviews.id, id)).run();
  refreshShop();
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import type { Banner } from "@/lib/banners";
import { getSettings, saveSettingsSection } from "@/lib/settings";
import { saveImageFile } from "@/lib/uploads";
import type { ActionState } from "./products";

async function requireAdmin() {
  if (!(await getOwnerSession())) throw new Error("Only the owner can change settings");
}

async function done(list: Banner[]) {
  await saveSettingsSection("banners", list);
  revalidatePath("/", "layout");
}

const link = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "Use a page like /products or a full https:// link");

const schema = z
  .object({
    eyebrow: z.string().trim().max(30, "Keep it short (30 characters)"),
    title: z.string().trim().min(2, "Add a title").max(40, "Keep the title under 40 characters"),
    subtitle: z.string().trim().max(80, "Keep it under 80 characters"),
    imageUrl: z.string().trim().max(300),
    imageAlt: z.string().trim().min(3, "Describe the picture for screen readers").max(200),
    dealPercent: z.union([z.literal(""), z.coerce.number().int().min(1, "1 to 95").max(95, "1 to 95")]),
    primaryLabel: z.string().trim().min(2, "Add a button label").max(30),
    primaryHref: link.refine((v) => v !== "", "Where should the button go?"),
    secondaryLabel: z.string().trim().max(30),
    secondaryHref: link,
    enabled: z.boolean(),
  })
  .refine((d) => !d.secondaryLabel || d.secondaryHref, { message: "Add a link for the second button", path: ["secondaryHref"] });

/** Create (no id) or update a banner. Uploaded picture wins over a pasted link. */
export async function saveBannerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = schema.safeParse({
    eyebrow: formData.get("eyebrow") ?? "",
    title: formData.get("title") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    imageAlt: formData.get("imageAlt") ?? "",
    dealPercent: formData.get("dealPercent") ?? "",
    primaryLabel: formData.get("primaryLabel") ?? "",
    primaryHref: formData.get("primaryHref") ?? "",
    secondaryLabel: formData.get("secondaryLabel") ?? "",
    secondaryHref: formData.get("secondaryHref") ?? "",
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const d = parsed.data;

  let image = d.imageUrl;
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    try {
      image = await saveImageFile(file);
    } catch (e) {
      return { fieldErrors: { imageUrl: e instanceof Error ? e.message : "Couldn't save the picture" } };
    }
  }
  if (!image) return { fieldErrors: { imageUrl: "Upload a picture for this banner" } };

  const banner: Banner = {
    id: id || `b${Date.now().toString(36)}`,
    enabled: d.enabled,
    eyebrow: d.eyebrow,
    title: d.title,
    subtitle: d.subtitle,
    image,
    imageAlt: d.imageAlt,
    dealPercent: d.dealPercent === "" ? undefined : d.dealPercent,
    primary: { label: d.primaryLabel, href: d.primaryHref },
    secondary: { label: d.secondaryLabel, href: d.secondaryHref },
  };

  const { banners } = await getSettings();
  const exists = banners.some((b) => b.id === banner.id);
  await done(exists ? banners.map((b) => (b.id === banner.id ? banner : b)) : [...banners, banner]);
  return { success: exists ? "Banner updated." : "Banner added." };
}

export async function toggleBannerAction(id: string) {
  await requireAdmin();
  const { banners } = await getSettings();
  await done(banners.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
}

export async function moveBannerAction(id: string, direction: "up" | "down") {
  await requireAdmin();
  const { banners } = await getSettings();
  const list = [...banners];
  const i = list.findIndex((b) => b.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await done(list);
}

export async function deleteBannerAction(id: string) {
  await requireAdmin();
  const { banners } = await getSettings();
  await done(banners.filter((b) => b.id !== id));
}

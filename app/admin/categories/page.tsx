import { redirect } from "next/navigation";

/** Categories moved to Settings. */
export default function CategoriesMoved() {
  redirect("/admin/settings/categories");
}

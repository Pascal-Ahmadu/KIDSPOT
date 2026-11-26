import { notFound } from "next/navigation";

/** Any /admin URL that doesn't match a page shows the dashboard 404 (inside the admin layout). */
export default function MissingAdminPage() {
  notFound();
}

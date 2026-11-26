import { notFound } from "next/navigation";

/** Any unknown address renders the store's 404 page (with header and footer). */
export default function Missing() {
  notFound();
}

import { CheckBadgeIcon } from "@heroicons/react/20/solid";
import { Stars } from "./reviews";

export type HappyReview = { id: number; name: string; rating: number; body: string; verified: boolean; productName: string; productSlug: string };

/** "Sarah Lewis" → "Sarah L." so full names aren't published. */
function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

/** "Our Happy Customers": up to three testimonial cards from real published reviews, in a fixed row (no slider). */
export function HappyCustomers({ reviews }: { reviews: HappyReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="happy-customers" className="container-x pt-16 lg:pt-[91px]">
      <div className="mx-auto max-w-[1190px]">
        <h2 id="happy-customers" className="mx-auto max-w-[946px] text-2xl font-bold leading-[42px] text-ink sm:text-[30px]">
          Our Happy Customers
        </h2>
        <ul className="mt-8 grid justify-center gap-[30px] md:grid-cols-2 lg:mt-9 lg:grid-cols-3">
          {reviews.slice(0, 3).map((r, i) => (
            <li
              key={r.id}
              title={`Review of ${r.productName}`}
              className={`flex min-h-[270px] w-full max-w-[458px] flex-col items-center gap-4 rounded-[8px] bg-card px-5 pb-8 pt-[39px] text-center shadow-[0_10px_42px_rgba(1,9,20,0.06)] sm:px-[41px] ${i === 2 ? "md:max-lg:hidden" : ""}`}
            >
              <Stars value={r.rating} size={12} />
              <blockquote className="line-clamp-5 min-h-[105px] max-w-[376px] text-sm leading-[21px] text-ink">&ldquo;{r.body}&rdquo;</blockquote>
              <div className="flex items-center gap-[7px]">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-light text-xs font-bold text-brand" aria-hidden="true">
                  {initialsOf(r.name)}
                </span>
                <span className="text-lg font-bold leading-[23px] text-brand">{shortName(r.name)}</span>
                {r.verified && <CheckBadgeIcon className="h-4 w-4 text-emerald-600" aria-label="Verified buyer" />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

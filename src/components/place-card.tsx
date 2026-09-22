/**
 * One place, rendered as a detail card: the whole point of Access Atlas is that
 * a place is never “accessible: yes” — it is a list of measured, estimated and
 * unpublished details, grouped by where they apply.
 *
 * Presentational only (no state), so the pilot page can server-render all nine
 * cards. Every field row shows its value, its unit and the *type of claim*
 * behind it. An `unknown` row is rendered as “Not published” and is never
 * dropped from the list — hiding an unknown would be the one unforgivable bug
 * in this product.
 */
import { FieldStatusBadge, type FieldStatus } from "~/components/status-badge";
import type { BarcelonaPlace } from "~/lib/pilot-types";

const CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: "entrance", label: "Entrance" },
  { key: "room", label: "Room" },
  { key: "bathroom", label: "Bathroom" },
  { key: "venue", label: "Venue" },
  { key: "terrain", label: "Terrain" },
  { key: "transport", label: "Transport" },
  { key: "contact", label: "Contact" },
];

/** Values equal to the badge label would print “Not published · Not published”. */
function isDuplicateOfStatusLabel(value: string, status: string) {
  if (status !== ("unknown" satisfies FieldStatus)) return false;
  return value.trim().toLowerCase() === "not published";
}

export function PlaceCard({ place }: { place: BarcelonaPlace }) {
  const categories = CATEGORY_ORDER.filter(
    (category) => (place.byCategory[category.key] ?? []).length > 0,
  );

  return (
    <article
      id={`place-${place.slug}`}
      className="flex scroll-mt-20 flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 shadow-sm"
    >
      <header className="border-b border-stone-200 dark:border-stone-800 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="font-display text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {place.name}
          </h3>
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
            {place.kind === "stay" ? "Stay" : "Activity"}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {place.neighborhood} · {place.address}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          {place.summary}
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {place.fieldCount} recorded details · sample data
        </p>
      </header>

      <div className="flex-1 divide-y divide-stone-100 dark:divide-stone-800">
        {categories.map((category) => {
          const fields = place.byCategory[category.key] ?? [];
          return (
            <section key={category.key} aria-labelledby={`${place.slug}-${category.key}`}>
              <h4
                id={`${place.slug}-${category.key}`}
                className="bg-stone-50 dark:bg-stone-900 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400"
              >
                {category.label}
              </h4>
              <dl className="divide-y divide-stone-100 dark:divide-stone-800">
                {fields.map((field) => (
                  <div key={field.field} className="px-5 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <dt className="text-sm text-stone-600 dark:text-stone-400">
                        {field.label}
                      </dt>
                      <dd className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end sm:text-right">
                        {isDuplicateOfStatusLabel(field.value, field.status) ? null : (
                          <span
                            className={
                              "text-sm " +
                              (field.status === "unknown"
                                ? "italic text-stone-600 dark:text-stone-400"
                                : "font-semibold text-stone-900 dark:text-stone-100")
                            }
                          >
                            {field.value}
                            {field.unit ? (
                              <span className="font-normal text-stone-500 dark:text-stone-400">
                                {" "}
                                {field.unit}
                              </span>
                            ) : null}
                          </span>
                        )}
                        <FieldStatusBadge status={field.status} />
                      </dd>
                    </div>
                    {field.note ? (
                      <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                        {field.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </article>
  );
}

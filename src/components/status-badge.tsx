/**
 * The one badge system Access Atlas uses everywhere.
 *
 * Two flavours, deliberately different:
 *
 *  • `StatusBadge` — the *verdict* of a Trip Accessibility Check line
 *    (ok / info / warn). Colour-blind tolerant: a shape-coded glyph plus the
 *    line's own text, never colour alone. This is the badge the landing page
 *    invented; the pilot page renders engine output with the same markup.
 *
 *  • `FieldStatusBadge` — the *type of claim* behind a stored measurement
 *    (measured / estimated / unknown / not applicable). `unknown` is rendered
 *    as “Not published” on purpose: it is a finding, not a gap, and it is the
 *    thing the traveler is told to verify. Nothing here is ever hidden — an
 *    unknown field is shown as loudly as a measured one.
 *
 * Both are pure presentational components with no client state, so they render
 * identically during SSR and hydration.
 */
export type LineKind = "ok" | "info" | "warn";

/** ✓ ok, i info, ! warn — glyph carried in a coloured pill, always beside text. */
export function StatusBadge({ kind }: { kind: LineKind }) {
  if (kind === "ok") {
    return (
      <span
        aria-hidden="true"
        className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-[11px] font-bold leading-none text-emerald-700 dark:text-emerald-300"
      >
        ✓
      </span>
    );
  }
  if (kind === "warn") {
    return (
      <span
        aria-hidden="true"
        className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-100 dark:bg-amber-900 text-[11px] font-bold leading-none text-amber-800 dark:text-amber-200"
      >
        !
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stone-200 dark:bg-stone-700 text-[11px] font-bold leading-none text-stone-600 dark:text-stone-200"
    >
      i
    </span>
  );
}

export type FieldStatus = "measured" | "estimated" | "unknown" | "not_applicable";

type FieldStatusStyle = {
  label: string;
  className: string;
  /** Spoken/written explanation of what this status means as a claim. */
  meaning: string;
};

const FIELD_STATUS: Record<FieldStatus, FieldStatusStyle> = {
  measured: {
    label: "Measured",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    meaning:
      "Someone wrote down a number for this. In this prototype the value is illustrative sample data, not a field-verified measurement.",
  },
  estimated: {
    label: "Estimated",
    className:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    meaning:
      "The business' own approximation. Never treated as a verified fact by the check.",
  },
  unknown: {
    label: "Not published",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200",
    meaning:
      "A profile-relevant detail nobody has published. It is listed as something to verify before booking.",
  },
  not_applicable: {
    label: "Not applicable",
    className: "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200",
    meaning: "This detail does not apply to this kind of place.",
  },
};

const FALLBACK_STATUS: FieldStatusStyle = {
  label: "Unclassified",
  className: "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200",
  meaning: "This row carries a status this build does not know how to read.",
};

export function fieldStatusStyle(status: string): FieldStatusStyle {
  return FIELD_STATUS[status as FieldStatus] ?? FALLBACK_STATUS;
}

export function FieldStatusBadge({ status }: { status: string }) {
  const style = fieldStatusStyle(status);
  return (
    <span
      title={style.meaning}
      className={
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide " +
        style.className
      }
    >
      {style.label}
    </span>
  );
}

/** The four statuses in the order the legend lists them. */
export const FIELD_STATUS_ORDER: FieldStatus[] = [
  "measured",
  "estimated",
  "unknown",
  "not_applicable",
];

/** Legend rows: status badge + the plain-language meaning of the claim type. */
export const FIELD_STATUS_LEGEND: { status: FieldStatus; meaning: string }[] =
  FIELD_STATUS_ORDER.map((status) => ({
    status,
    meaning: FIELD_STATUS[status].meaning,
  }));

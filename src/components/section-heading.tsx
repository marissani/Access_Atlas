/**
 * The eyebrow + display-heading + lead rhythm the landing page uses, kept in
 * one place for the pilot page. Classes are identical to `index.tsx` so the two
 * pages read as one site (stone/indigo, same type scale, same dark variants).
 */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  titleId,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  titleId?: string;
}) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        id={titleId}
        className="mt-3 font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl"
      >
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-lg leading-relaxed text-stone-700 dark:text-stone-300">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

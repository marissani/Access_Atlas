/**
 * The interactive Trip Accessibility Check (Barcelona pilot, phase 2).
 *
 * This is the product in one component: build a profile, pick a stay plus up to
 * three activities, run the check, and read back the engine's verdict leg by
 * leg — ending with the “verify before booking” list, which is the part that
 * actually makes a booking safe.
 *
 * Design rules honoured here:
 *  • all state is component state (no accounts, nothing persisted);
 *  • the result region is a polite live region, so a screen reader hears the
 *    outcome after pressing “Run trip check”;
 *  • the engine's `{ ok: false, reason }` is never swallowed and never dressed
 *    up as a result — a check that could not run says so, and offers a retry;
 *  • every label the picker offers comes from the server's own tag vocabulary,
 *    so the UI cannot invent a profile tag the engine would reject.
 */
import { useState } from "react";

import { StatusBadge } from "~/components/status-badge";
import { SectionHeading } from "~/components/section-heading";
import {
  DEMO_ACTIVITY_SLUGS,
  DEMO_PROFILE_TAGS,
  DEMO_STAY_SLUG,
  MAX_ACTIVITIES,
  TAG_HINTS,
} from "~/lib/pilot-demo";
import type {
  TripCheckOutcome,
  TripCheckSuccess,
  TripLegView,
} from "~/lib/pilot-types";
import { runTripCheck } from "~/server/barcelona";

export type PlaceOption = { slug: string; name: string; neighborhood: string };

type Props = {
  profileTags: readonly string[];
  stays: PlaceOption[];
  activities: PlaceOption[];
  /** The demo check the page ran on the server for its first render. */
  initialResult: TripCheckOutcome | null;
};

function sameSet(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, i) => value === right[i]);
}

/** Plain-language copy per engine rejection reason — no reason is left bare. */
const REASON_COPY: Record<string, string> = {
  "no-db":
    "The pilot database is not reachable from this server right now, so there is no data to check against. Nothing is guessed — a check that cannot run returns no verdict instead of a plausible-looking one.",
  "db-error":
    "The pilot database answered with an error while this check was running, so the trip was not evaluated.",
  "no-profile-tags":
    "Choose at least one profile tag — the whole check compares your trip against your profile.",
  "invalid-input":
    "The check received a malformed request. Try again, or reset to the demo trip.",
  "invalid-trip":
    "The trip selection was incomplete. Choose one stay and up to three activities.",
  "too-many-activities":
    `The pilot keeps the check to ${MAX_ACTIVITIES} activities so the results stay readable.`,
};

function reasonCopy(reason: string) {
  if (REASON_COPY[reason]) return REASON_COPY[reason];
  return `The engine refused this check (${reason}). Reset to the demo trip and run it again.`;
}

export function TripCheckPanel({ profileTags, stays, activities, initialResult }: Props) {
  const [tags, setTags] = useState<string[]>([...DEMO_PROFILE_TAGS]);
  const [staySlug, setStaySlug] = useState<string>(DEMO_STAY_SLUG);
  const [activitySlugs, setActivitySlugs] = useState<string[]>([...DEMO_ACTIVITY_SLUGS]);
  const [result, setResult] = useState<TripCheckOutcome | null>(initialResult);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const activitiesFull = activitySlugs.length >= MAX_ACTIVITIES;

  function toggleTag(tag: string) {
    setFormError(null);
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function toggleActivity(slug: string) {
    setActivitySlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_ACTIVITIES) return prev;
      return [...prev, slug];
    });
  }

  async function run() {
    if (tags.length === 0) {
      setFormError("Choose at least one profile tag first.");
      return;
    }
    if (!staySlug) {
      setFormError("Choose where you would sleep first.");
      return;
    }
    setFormError(null);
    setFailed(null);
    setRunning(true);
    try {
      const next = await runTripCheck({
        data: { profileTags: tags, trip: { staySlug, activitySlugs } },
      });
      setResult(next);
    } catch (err) {
      console.error("Trip check request failed:", err);
      setResult(null);
      setFailed(
        "The check could not reach the server. Your selections are still here — try again.",
      );
    } finally {
      setRunning(false);
    }
  }

  function resetToDemo() {
    setTags([...DEMO_PROFILE_TAGS]);
    setStaySlug(DEMO_STAY_SLUG);
    setActivitySlugs([...DEMO_ACTIVITY_SLUGS]);
    setFormError(null);
  }

  const stale =
    result !== null &&
    result.ok &&
    (result.trip.staySlug !== staySlug ||
      !sameSet(result.trip.activitySlugs, activitySlugs) ||
      !sameSet(result.profileTags, tags));

  return (
    <section
      id="check"
      aria-labelledby="check-title"
      className="scroll-mt-20 border-t border-stone-200 bg-white py-16 dark:border-stone-800 dark:bg-stone-950 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          titleId="check-title"
          eyebrow="Trip Accessibility Check"
          title="Check the whole trip against your profile."
          lead="Not a yes/no badge: the real engine, the same rules the product will ship, evaluated against stored rows — one leg per place, then the list of what to verify before you book."
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
          aria-describedby="demo-note"
        >
          <p
            id="demo-note"
            className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-relaxed text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-100"
          >
            <strong className="font-semibold">Interactive demo.</strong> A profile and a
            trip are pre-selected, and the check below already ran on them when this page
            loaded — so there is nothing to set up. Change anything and run it again: it
            is the same engine and the same stored rows either way, not a mock-up.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <fieldset className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
              <legend className="px-2 text-sm font-semibold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                1 · Your profile
              </legend>
              <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                Pick the details that matter to you. The check only speaks to the tags you
                choose — it never guesses the rest.
              </p>
              <ul className="mt-4 space-y-1">
                {profileTags.map((tag) => (
                  <li key={tag}>
                    <label className="-mx-2 flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-white dark:hover:bg-stone-950">
                      <input
                        type="checkbox"
                        checked={tags.includes(tag)}
                        onChange={() => toggleTag(tag)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-700 dark:accent-indigo-400"
                      />
                      <span>
                        <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                          {tag}
                        </span>
                        {TAG_HINTS[tag] ? (
                          <span className="block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                            {TAG_HINTS[tag]}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <fieldset className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
              <legend className="px-2 text-sm font-semibold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                2 · Your trip
              </legend>

              <label
                htmlFor="stay-select"
                className="block text-sm font-medium text-stone-900 dark:text-stone-100"
              >
                Where you sleep{" "}
                <span className="font-normal text-stone-500 dark:text-stone-400">
                  (one stay)
                </span>
              </label>
              <select
                id="stay-select"
                value={staySlug}
                onChange={(event) => setStaySlug(event.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
              >
                {stays.map((stay) => (
                  <option key={stay.slug} value={stay.slug}>
                    {stay.name} — {stay.neighborhood}
                  </option>
                ))}
              </select>

              <p
                id="activity-hint"
                className="mt-6 text-sm font-medium text-stone-900 dark:text-stone-100"
              >
                Things you do{" "}
                <span className="font-normal text-stone-500 dark:text-stone-400">
                  ({activitySlugs.length} of {MAX_ACTIVITIES} selected)
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                Up to {MAX_ACTIVITIES}. Once {MAX_ACTIVITIES} are selected the others stay
                ticked-off until you untick one.
              </p>
              <ul className="mt-3 space-y-1">
                {activities.map((activity) => {
                  const checked = activitySlugs.includes(activity.slug);
                  const disabled = !checked && activitiesFull;
                  return (
                    <li key={activity.slug}>
                      <label
                        className={
                          "-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 " +
                          (disabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:bg-white dark:hover:bg-stone-950")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          aria-describedby="activity-hint"
                          onChange={() => toggleActivity(activity.slug)}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-700 dark:accent-indigo-400"
                        />
                        <span className="text-sm text-stone-900 dark:text-stone-100">
                          {activity.name}{" "}
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {activity.neighborhood}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="submit"
              disabled={running || tags.length === 0 || !staySlug}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-indigo-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus-visible:ring-indigo-300 dark:focus-visible:ring-offset-stone-950"
            >
              {running ? "Checking…" : "Run trip check"}
            </button>
            <button
              type="button"
              onClick={resetToDemo}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:hover:border-stone-500 dark:hover:bg-stone-800"
            >
              Reset to the demo trip
            </button>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="mt-3 min-h-5 text-sm font-medium text-amber-800 dark:text-amber-200"
          >
            {formError ?? ""}
          </p>
        </form>

        <div
          id="check-result"
          role="region"
          aria-label="Trip accessibility check result"
          aria-live="polite"
          aria-busy={running}
          className="mt-8 scroll-mt-20"
        >
          {running ? (
            <p className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
              Checking the trip against your profile — reading every stored row for the
              chosen places…
            </p>
          ) : failed ? (
            <ErrorPanel title="The check did not run" text={failed} onRetry={run} />
          ) : result && !result.ok ? (
            <ErrorPanel
              title="The check did not run"
              text={reasonCopy(result.reason)}
              code={result.reason}
              onRetry={run}
            />
          ) : result && result.ok ? (
            <CheckResult
              result={result}
              stale={stale}
              stayName={stays.find((stay) => stay.slug === result.trip.staySlug)?.name}
            />
          ) : (
            <ErrorPanel
              title="No check has run yet"
              text="Pick a profile and a trip above, then run the check."
              onRetry={run}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ErrorPanel({
  title,
  text,
  code,
  onRetry,
}: {
  title: string;
  text: string;
  code?: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 dark:border-amber-700 dark:bg-amber-950 sm:p-8">
      <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight text-amber-900 dark:text-amber-200">
        <span
          aria-hidden="true"
          className="grid h-7 w-7 place-items-center rounded-full bg-amber-200 text-sm font-bold leading-none text-amber-900 dark:bg-amber-800 dark:text-amber-200"
        >
          !
        </span>
        {title}
      </h3>
      <p className="mt-3 max-w-3xl leading-relaxed text-amber-900 dark:text-amber-200">
        {text}
      </p>
      {code ? (
        <p className="mt-2 font-mono text-xs text-amber-800 dark:text-amber-300">
          reason: {code}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
      >
        Try again
      </button>
    </div>
  );
}

function CheckResult({
  result,
  stale,
  stayName,
}: {
  result: TripCheckSuccess;
  stale: boolean;
  stayName?: string;
}) {
  const { counts, legs, toVerify } = result;
  const lineCounts = legs
    .flatMap((leg) => leg.lines)
    .reduce(
      (acc, line) => {
        acc[line.kind] += 1;
        return acc;
      },
      { ok: 0, info: 0, warn: 0 },
    );

  return (
    <>
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-700 text-lg text-white dark:bg-indigo-600"
            >
              🏨
            </span>
            <div>
              <p className="font-display text-lg font-bold text-stone-900 dark:text-stone-100">
                {stayName ?? result.trip.staySlug} +{" "}
                {result.trip.activitySlugs.length}{" "}
                {result.trip.activitySlugs.length === 1 ? "activity" : "activities"}
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Barcelona pilot · checked against {result.profileTags.length} profile{" "}
                {result.profileTags.length === 1 ? "tag" : "tags"}
              </p>
            </div>
          </div>
          <ul aria-label="Profile applied to this check" className="flex flex-wrap gap-2">
            {result.profileTags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-sm text-stone-700 dark:text-stone-300">
          <strong className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
            {counts.legs} legs · {counts.dataPoints} data points · {counts.toVerify} to
            verify
          </strong>
          <span className="text-stone-600 dark:text-stone-400">
            {" "}
            · {lineCounts.ok} ok · {lineCounts.info} info · {lineCounts.warn} warn
          </span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <strong className="font-semibold text-stone-700 dark:text-stone-300">
            {result.notice}.
          </strong>{" "}
          The engine, the rules and the database are real; the measurements they read are
          not field-verified.
        </p>
      </div>

      {stale ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-100"
        >
          You changed the profile or the trip since this result was produced — run the
          check again to see the new verdict.
        </p>
      ) : null}

      <ul className="mt-8 grid gap-5 md:grid-cols-2">
        {legs.map((leg: TripLegView, i) => (
          <li
            key={`${leg.title}-${i}`}
            className={
              i === legs.length - 1 && legs.length > 1
                ? "rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6 md:col-span-2"
                : "rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6"
            }
          >
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="text-2xl">
                {leg.icon}
              </span>
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                  {leg.title}
                </h3>
                {leg.subtitle ? (
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {leg.subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {leg.lines.map((line, j) => (
                <li
                  key={j}
                  className="flex items-start gap-2.5 text-sm leading-snug text-stone-700 dark:text-stone-300"
                >
                  <StatusBadge kind={line.kind} />
                  <span>{line.text}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <aside
        aria-labelledby="verify-title"
        className="mt-10 rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 dark:border-amber-700 dark:bg-amber-950 sm:p-8"
      >
        <h3
          id="verify-title"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-amber-900 dark:text-amber-200"
        >
          <span
            aria-hidden="true"
            className="grid h-7 w-7 place-items-center rounded-full bg-amber-200 text-sm font-bold leading-none text-amber-900 dark:bg-amber-800 dark:text-amber-200"
          >
            !
          </span>
          Things you should verify before booking
        </h3>
        <p className="mt-3 max-w-3xl leading-relaxed text-amber-900 dark:text-amber-200">
          This is the Access Atlas promise: we show you exactly where the uncertainty is,
          so you verify the last 10% before you book — not at check-in.
        </p>
        {toVerify.length === 0 ? (
          <p className="mt-6 leading-relaxed text-amber-900 dark:text-amber-200">
            Nothing to verify for this trip: every detail your profile asks about is
            published for the places you chose. Treat that as a claim to check, not a
            guarantee — the whole dataset is still sample data.
          </p>
        ) : (
          <ul className="mt-6 space-y-5">
            {toVerify.map((item, i) => (
              <li key={`${item.title}-${i}`} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-200 text-[11px] font-bold leading-none text-amber-900 dark:bg-amber-800 dark:text-amber-200"
                >
                  !
                </span>
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-50">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                    {item.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}

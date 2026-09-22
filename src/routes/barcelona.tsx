/**
 * /barcelona — the pilot destination page (phase 2 of the Barcelona pilot).
 *
 * Two things live here:
 *  1. the nine sample places as detail cards, straight out of Postgres via
 *     `getBarcelonaData()` — grouped by category, every field carrying its value
 *     and its *type of claim*, with unpublished details shown, never hidden;
 *  2. the interactive Trip Accessibility Check (`runTripCheck()`), which the
 *     loader also runs once for the demo profile so a first visit lands on a
 *     finished result instead of an empty form.
 *
 * Integrity framing: every place, address and measurement on this page is
 * fictional sample data (`sample = true` on every row), flagged at the top of
 * the page and in the data itself. The schema, the engine, the database and the
 * rules are real. Copy here must never soften an “unknown” into a fact.
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PlaceCard } from "~/components/place-card";
import { SectionHeading, Eyebrow } from "~/components/section-heading";
import { FIELD_STATUS_LEGEND, FieldStatusBadge } from "~/components/status-badge";
import { ThemeToggle } from "~/components/theme-toggle";
import { TripCheckPanel } from "~/components/trip-check-panel";
import {
  DEMO_ACTIVITY_SLUGS,
  DEMO_PROFILE_TAGS,
  DEMO_STAY_SLUG,
  SAMPLE_NOTICE_FALLBACK,
} from "~/lib/pilot-demo";
import type { PilotDataResult, TripCheckOutcome } from "~/lib/pilot-types";
import { getBarcelonaData, runTripCheck } from "~/server/barcelona";

const PAGE_TITLE = "Barcelona pilot — Access Atlas";
const PAGE_DESCRIPTION =
  "The Access Atlas Barcelona pilot: nine sample places recorded field by field, and a working Trip Accessibility Check that shows exactly what to verify before booking. Prototype sample data — not yet field-verified.";

export const Route = createFileRoute("/barcelona")({
  loader: async () => {
    // Both calls go through the real server functions, so the first render —
    // including the demo check below — is served from the database.
    const [data, demoCheck] = await Promise.all([
      getBarcelonaData(),
      runTripCheck({
        data: {
          profileTags: [...DEMO_PROFILE_TAGS],
          trip: { staySlug: DEMO_STAY_SLUG, activitySlugs: [...DEMO_ACTIVITY_SLUGS] },
        },
      }),
    ]);
    return { data, demoCheck };
  },
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
    ],
  }),
  component: BarcelonaPage,
});

const PILOT_NAV = [
  { href: "#places", label: "The places" },
  { href: "#how-to-read", label: "Reading a card" },
  { href: "#check", label: "Trip check" },
];

function BarcelonaPage() {
  const loaderData = Route.useLoaderData();
  const [data, setData] = useState<PilotDataResult>(loaderData.data);
  const [demoCheck, setDemoCheck] = useState<TripCheckOutcome | null>(
    loaderData.demoCheck,
  );
  const [reloading, setReloading] = useState(false);

  // A later navigation may hand down fresher loader data than the state above.
  useEffect(() => {
    setData(loaderData.data);
    setDemoCheck(loaderData.demoCheck);
  }, [loaderData.data, loaderData.demoCheck]);

  async function reloadData() {
    setReloading(true);
    try {
      const [nextData, nextCheck] = await Promise.all([
        getBarcelonaData(),
        runTripCheck({
          data: {
            profileTags: [...DEMO_PROFILE_TAGS],
            trip: { staySlug: DEMO_STAY_SLUG, activitySlugs: [...DEMO_ACTIVITY_SLUGS] },
          },
        }),
      ]);
      setData(nextData);
      setDemoCheck(nextCheck);
    } catch (err) {
      console.error("Reloading Barcelona pilot data failed:", err);
    } finally {
      setReloading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-indigo-700 focus:px-4 focus:py-2 focus:font-semibold focus:text-white dark:focus:bg-indigo-300 dark:focus:text-stone-950"
      >
        Skip to content
      </a>

      <PilotHeader />

      <main id="main" className="flex-1">
        <SampleNotice notice={data.ok ? data.notice : SAMPLE_NOTICE_FALLBACK} />

        {data.ok ? (
          <>
            <PilotHero data={data} />
            <HowToReadSection />
            <PlacesSection data={data} />
            <TripCheckPanel
              profileTags={data.profileTags}
              stays={data.places
                .filter((place) => place.kind === "stay")
                .map((place) => ({
                  slug: place.slug,
                  name: place.name,
                  neighborhood: place.neighborhood,
                }))}
              activities={data.places
                .filter((place) => place.kind === "activity")
                .map((place) => ({
                  slug: place.slug,
                  name: place.name,
                  neighborhood: place.neighborhood,
                }))}
              initialResult={demoCheck}
            />
            <LimitsSection />
          </>
        ) : (
          <DataUnavailableSection
            reason={data.reason}
            reloading={reloading}
            onRetry={reloadData}
          />
        )}
      </main>

      <PilotFooter />
    </div>
  );
}

function PilotHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/90 backdrop-blur dark:border-stone-800/80 dark:bg-stone-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-700 text-sm text-white dark:bg-indigo-600"
          >
            ♿
          </span>
          <span className="whitespace-nowrap">Access Atlas</span>
        </a>
        <nav aria-label="Barcelona pilot sections" className="hidden items-center gap-1 md:flex">
          {PILOT_NAV.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="/"
            className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            <span aria-hidden="true">←</span> Home
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * The honesty banner. It sits above everything else on the page, carries the
 * exact `notice` string the server attaches to every response, and spells out
 * what is sample and what is real.
 */
function SampleNotice({ notice }: { notice: string }) {
  return (
    <div
      id="sample-notice"
      role="note"
      aria-label="Sample data notice"
      className="border-b-2 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-4 sm:px-6">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-200 text-sm font-bold leading-none text-amber-900 dark:bg-amber-800 dark:text-amber-200"
        >
          !
        </span>
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-100">{notice}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            All nine places below are fictional, and every measurement is illustrative
            sample data — nobody has measured anything in Barcelona for this pilot, and
            no real business is described. What is real: the schema, the rule engine, the
            database, and the way an unpublished detail is surfaced instead of hidden.
          </p>
        </div>
      </div>
    </div>
  );
}

function PilotHero({ data }: { data: Extract<PilotDataResult, { ok: true }> }) {
  const { counts } = data;
  const tiles = [
    { value: String(counts.places), label: "sample places in the pilot" },
    { value: String(counts.fields), label: "individual recorded details" },
    { value: String(counts.byStatus.measured ?? 0), label: "rows with a written-down number" },
    {
      value: String(counts.byStatus.unknown ?? 0),
      label: "unpublished details — each one to verify",
    },
  ];

  return (
    <section aria-labelledby="pilot-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-100/70 blur-3xl dark:bg-indigo-500/10"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <Eyebrow>Barcelona pilot</Eyebrow>
        <h1
          id="pilot-title"
          className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl"
        >
          One city, recorded detail by detail — and honest about what is missing.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-700 dark:text-stone-300">
          Barcelona is the first destination built on the Access Atlas data model:{" "}
          {counts.stays} stays and {counts.activities} activities, each one recorded as
          individual facts — door widths, thresholds, turning circles, shower trays,
          gradients, noise, transport — instead of one “accessible: yes”. Below, every
          one of those {counts.fields} rows is on the page, including the{" "}
          {counts.byStatus.unknown ?? 0} nobody has published.
        </p>
        <dl className="mt-12 grid grid-cols-2 overflow-hidden rounded-xl border border-stone-200 bg-stone-200 dark:border-stone-800 dark:bg-stone-800 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="bg-stone-50 px-5 py-4 dark:bg-stone-900">
              <dt className="font-display text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {tile.value}
              </dt>
              <dd className="mt-1 text-sm leading-snug text-stone-600 dark:text-stone-400">
                {tile.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HowToReadSection() {
  return (
    <section
      id="how-to-read"
      aria-labelledby="how-to-read-title"
      className="scroll-mt-20 border-t border-stone-200 bg-white py-16 dark:border-stone-800 dark:bg-stone-950 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          titleId="how-to-read-title"
          eyebrow="How to read a card"
          title="Every detail says what kind of claim it is."
          lead="A measurement and an estimate are not the same thing, and neither is a detail nobody has published. Each row on the cards below carries its type of claim, so you can tell them apart at a glance."
        />
        <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FIELD_STATUS_LEGEND.map((entry) => (
            <div
              key={entry.status}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-800 dark:bg-stone-900"
            >
              <dt>
                <FieldStatusBadge status={entry.status} />
              </dt>
              <dd className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                {entry.meaning}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function PlacesSection({ data }: { data: Extract<PilotDataResult, { ok: true }> }) {
  const stays = data.places.filter((place) => place.kind === "stay");
  const activities = data.places.filter((place) => place.kind === "activity");

  return (
    <section
      id="places"
      aria-labelledby="places-title"
      className="scroll-mt-20 border-t border-stone-200 bg-stone-50 py-16 dark:border-stone-800 dark:bg-stone-900 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          titleId="places-title"
          eyebrow="The sample places"
          title="Nine places, field by field."
          lead="Grouped by where the detail applies: entrance, room, bathroom, venue, terrain, transport and contact. Unpublished details stay in the list, marked as such — they are the reason the Trip Accessibility Check can tell you what to ask before you book."
        />

        <h3
          id="stays"
          className="mt-14 scroll-mt-20 font-display text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100"
        >
          Stays{" "}
          <span className="text-base font-normal text-stone-500 dark:text-stone-400">
            ({stays.length}) · where you sleep
          </span>
        </h3>
        <ul className="mt-6 grid items-start gap-5 md:grid-cols-2">
          {stays.map((place) => (
            <li key={place.slug} className="h-full">
              <PlaceCard place={place} />
            </li>
          ))}
        </ul>

        <h3
          id="activities"
          className="mt-14 scroll-mt-20 font-display text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100"
        >
          Activities{" "}
          <span className="text-base font-normal text-stone-500 dark:text-stone-400">
            ({activities.length}) · what you do
          </span>
        </h3>
        <ul className="mt-6 grid items-start gap-5 md:grid-cols-2">
          {activities.map((place) => (
            <li key={place.slug} className="h-full">
              <PlaceCard place={place} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LimitsSection() {
  return (
    <section
      aria-labelledby="limits-title"
      className="border-t border-stone-200 bg-stone-50 py-16 dark:border-stone-800 dark:bg-stone-900 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          titleId="limits-title"
          eyebrow="Where this stops"
          title="What this prototype is — and what it is not."
        />
        <ul className="mt-8 grid gap-5 text-base leading-relaxed text-stone-700 dark:text-stone-300 md:grid-cols-2">
          <li className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <strong className="font-semibold text-stone-900 dark:text-stone-100">
              Real:
            </strong>{" "}
            the database schema, the field vocabulary, the Trip Accessibility Check engine
            and its rules, the server functions, and the fact that an unpublished detail
            is treated as a finding rather than as a pass.
          </li>
          <li className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <strong className="font-semibold text-stone-900 dark:text-stone-100">
              Sample:
            </strong>{" "}
            every place name, address and measurement. The nine places are invented, each
            row is flagged <code className="font-mono text-sm">sample = true</code> in the
            database, and no real business is described anywhere on this page.
          </li>
          <li className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <strong className="font-semibold text-stone-900 dark:text-stone-100">
              Real geography:
            </strong>{" "}
            the neighborhoods (Eixample, Gothic Quarter, Gràcia, Barceloneta, Poblenou)
            are real Barcelona neighborhoods, so the demo trip reads like a place.
          </li>
          <li className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
            <strong className="font-semibold text-stone-900 dark:text-stone-100">
              Not yet:
            </strong>{" "}
            accounts, saved trips or booking. Your profile and trip live in this page while
            it is open, and nothing about them is sent anywhere except the check itself.
          </li>
        </ul>
      </div>
    </section>
  );
}

function DataUnavailableSection({
  reason,
  reloading,
  onRetry,
}: {
  reason: string;
  reloading: boolean;
  onRetry: () => void;
}) {
  return (
    <section aria-labelledby="unavailable-title" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1
        id="unavailable-title"
        className="font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl"
      >
        The pilot data is not reachable right now.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-stone-700 dark:text-stone-300">
        This page reads every detail from the pilot database, so with no database there is
        nothing honest to show — and a plausible-looking page built from nothing is worse
        than an empty one. No place, measurement or verdict is invented to fill the space.
      </p>
      <p className="mt-4 font-mono text-sm text-stone-500 dark:text-stone-400">
        reason: {reason}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={reloading}
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-md bg-indigo-700 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500"
      >
        {reloading ? "Trying…" : "Try again"}
      </button>
    </section>
  );
}

function PilotFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-stone-500 dark:text-stone-400 sm:flex-row sm:items-center sm:px-6">
        <p>© 2026 Access Atlas · Prototype sample data — not yet field-verified.</p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <a
                href="/"
                className="rounded-md transition-colors hover:text-stone-900 dark:hover:text-stone-100"
              >
                Access Atlas home
              </a>
            </li>
            <li>
              <a
                href="/#profiles"
                className="rounded-md transition-colors hover:text-stone-900 dark:hover:text-stone-100"
              >
                Profiles
              </a>
            </li>
            <li>
              <a
                href="/#cta"
                className="rounded-md transition-colors hover:text-stone-900 dark:hover:text-stone-100"
              >
                Early access
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

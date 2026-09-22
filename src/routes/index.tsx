import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { StatusBadge, type LineKind } from "~/components/status-badge";
import { ThemeToggle } from "~/components/theme-toggle";
import { addToWaitlist } from "~/server/waitlist";

export const Route = createFileRoute("/")({
  component: Home,
});

/* ------------------------------------------------------------------ */
/* Shared content                                                      */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#profiles", label: "Profiles" },
  { href: "#trip-check", label: "Trip check" },
  { href: "#audiences", label: "For you" },
  { href: "#data", label: "The data" },
];

const PROFILE_TAGS = [
  "Cannot use stairs",
  "Manual wheelchair",
  "Requires roll-in shower",
  "Needs space beside bed",
  "Prefers text over phone",
  "Avoids very loud environments",
  "Needs flexible itineraries",
  "Needs accessible transportation",
];

const DATA_CHIPS = [
  "door_width: 34 in",
  "step_height: 0 in",
  "shower_tray: 30×60 in",
  "turning_circle: 60 in",
  "bed_height: 24 in",
  "toilet_height: 18 in",
  "gradient: 1:12",
  "elevator: operational",
  "noise_level: quiet",
  "transfer_space: 36 in",
  "seating: accessible",
  "entrance: rear, step-free",
];

const HERO_STATS = [
  { value: "34″", label: "door widths, not “wide enough”" },
  { value: "1:12", label: "ramp gradients, not “level”" },
  { value: "0", label: "yes/no flags on our cards" },
  { value: "~10%", label: "left for you to verify — we show you where" },
];

const ROOM_DETAIL = [
  { label: "Step-free entrance", value: "Verified", verified: true },
  { label: "Door width", value: "34 in" },
  { label: "Bed height", value: "24 in" },
  { label: "Space beside bed", value: "36 in" },
  { label: "Roll-in shower", value: "Verified", verified: true },
  { label: "Shower seat", value: "Removable" },
  { label: "Grab bars", value: "Fixed" },
  { label: "Toilet height", value: "18 in" },
];

type Leg = {
  icon: string;
  title: string;
  subtitle?: string;
  lines: { kind: LineKind; text: string }[];
};

const TRIP_LEGS: Leg[] = [
  {
    icon: "✈️",
    title: "Flight",
    subtitle: "SFO → CDG · Air France 83",
    lines: [
      { kind: "ok", text: "Airport assistance pre-booked at both ends" },
      { kind: "ok", text: "Wheelchair stored in the hold, returned at the gate" },
      { kind: "info", text: "Aisle chair available — request it at booking (48h notice)" },
      { kind: "info", text: "Seats 31A/C: 24″ aisle transfer space, armrests lift" },
    ],
  },
  {
    icon: "🚕",
    title: "Airport → hotel",
    subtitle: "40 min · level route",
    lines: [
      { kind: "ok", text: "Accessible taxi with ramp available — ~€55 flat fare" },
      { kind: "ok", text: "Hotel is a 5-minute level walk from the taxi drop-off" },
      { kind: "info", text: "RER B is step-free to the platform, but elevator outages were reported at two stations this month" },
    ],
  },
  {
    icon: "🏨",
    title: "Hôtel du Nord — Room 204",
    lines: [
      { kind: "ok", text: "Step-free entrance (rear door, 36″)" },
      { kind: "ok", text: "Elevator to all floors — 32″ doors, 6×5 ft cabin" },
      { kind: "ok", text: "Bathroom: roll-in shower, fixed grab bars, 18″ toilet" },
      { kind: "warn", text: "No shower dimensions published — see what to verify below" },
      { kind: "info", text: "Bed 24″ high; 36″ clear space on both sides" },
    ],
  },
  {
    icon: "🎭",
    title: "Activities",
    lines: [
      { kind: "ok", text: "Louvre: step-free entrance at Porte des Lions (rear)" },
      { kind: "ok", text: "Eiffel Tower: elevator to all floors — accessible tickets must be pre-booked" },
      { kind: "ok", text: "Seine cruise: level boarding at Pont Neuf, space for 4 wheelchairs" },
      { kind: "info", text: "Atelier des Lumières: step-free foyer, but seismic seating rows are fixed" },
    ],
  },
  {
    icon: "🚇",
    title: "Getting around",
    lines: [
      { kind: "ok", text: "Metro line 14 is fully step-free; 4 of the 7 stations on your route have elevators confirmed working" },
      { kind: "ok", text: "Low-floor buses on lines 21 & 47 — the hotel is 2 stops from both" },
      { kind: "info", text: "Hotel → Louvre: 400 m flat, then 150 m of cobblestones" },
      { kind: "info", text: "Châtelet station elevator status is checked weekly — last confirmed operational" },
    ],
  },
];

const VERIFY_ITEMS = [
  {
    title: "Hotel bathroom — no dimensions published",
    text: "The hotel confirms a roll-in shower and grab bars, but gives no tray size or turning circle. Ask for a photo or room plan before you book — this is the detail that makes or breaks a stay.",
  },
  {
    title: "One metro transfer depends on an elevator",
    text: "The transfer at Châtelet uses an elevator whose status can change day to day. Confirm it the morning of travel, and keep buses 21/47 as your fallback.",
  },
  {
    title: "The Louvre’s step-free entrance is around the back",
    text: "The main entrance has stairs; Porte des Lions is step-free but adds roughly 15 minutes. Plan your museum time and your taxi drop-off accordingly.",
  },
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

/*
 * The ✓ / i / ! status badge now lives in `~/components/status-badge`, so the
 * Barcelona pilot renders the engine's own ok/info/warn lines with exactly this
 * styling. Nothing about the badge changed — only where it is defined.
 */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-indigo-700 focus:px-4 focus:py-2 focus:font-semibold focus:text-white dark:focus:bg-indigo-300 dark:focus:text-stone-950"
      >
        Skip to content
      </a>

      <Header />
      <main id="main" className="flex-1">
        <Hero />
        <ProblemSection />
        <ProfilesSection />
        <TripCheckSection />
        <AudiencesSection />
        <DataSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <a href="#main" className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-700 dark:bg-indigo-600 text-sm text-white"
          >
            ♿
          </span>
          <span className="whitespace-nowrap">Access Atlas</span>
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="/barcelona"
            className="rounded-md border border-indigo-300 dark:border-indigo-700 px-3 py-2 text-sm font-semibold text-indigo-800 dark:text-indigo-200 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950"
          >
            <span className="sm:hidden">Pilot</span>
            <span className="hidden sm:inline">Barcelona pilot</span>
          </a>
          <a
            href="#cta"
            className="rounded-md bg-indigo-700 dark:bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 dark:hover:bg-indigo-500 sm:px-4"
          >
            Early access
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* decorative wash — pointer-events-none, purely visual */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-100/70 dark:bg-indigo-500/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-3.5 py-1.5 text-sm font-medium text-indigo-800 dark:text-indigo-200">
          <span aria-hidden="true">📏</span>
          Measured detail — not “accessible: yes/no”
        </p>
        <h1
          id="hero-title"
          className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-100 sm:text-6xl"
        >
          Don’t take <span className="text-indigo-700 dark:text-indigo-300">“accessible”</span> for an answer.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-700 dark:text-stone-300 sm:text-xl">
          Access Atlas is the world’s most detailed accessibility travel database. We
          measure what other sites only claim — door widths, shower dimensions, step-free
          entrances, elevator status — and score your whole trip against your own
          Accessibility Profile.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#trip-check"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-700 dark:bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 dark:hover:bg-indigo-500"
          >
            See how a trip check works
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#cta"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-6 py-3 text-base font-semibold text-stone-800 dark:text-stone-100 transition-colors hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Get early access
          </a>
        </div>
        <dl className="mt-16 grid grid-cols-2 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-200 dark:bg-stone-800 lg:grid-cols-4">
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="bg-stone-50 dark:bg-stone-900 px-5 py-4">
              <dt className="font-display text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {stat.value}
              </dt>
              <dd className="mt-1 text-sm leading-snug text-stone-600 dark:text-stone-400">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-4 text-lg leading-relaxed text-stone-700 dark:text-stone-300">{lead}</p> : null}
    </div>
  );
}

function ProblemSection() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-title"
      className="scroll-mt-20 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="The problem"
          title="“Accessible” doesn’t mean it works for you."
          lead="A yes/no flag can’t tell you whether you can get into the shower, turn around in the room, or reach the front desk. Here is the difference."
        />
        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1fr_auto_1.2fr]">
          <BeforeCard />
          <div aria-hidden="true" className="flex items-center justify-center gap-3 text-stone-400 dark:text-stone-500">
            <span className="h-px w-12 bg-stone-300 dark:bg-stone-700 lg:h-24 lg:w-px" />
            <span className="rounded-full border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              vs
            </span>
            <span className="h-px w-12 bg-stone-300 dark:bg-stone-700 lg:h-24 lg:w-px" />
          </div>
          <AfterCard />
        </div>
        <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
          Same hotel, same room. One “yes” — or a page of truth you can verify.
        </p>
      </div>
    </section>
  );
}

function BeforeCard() {
  return (
    <figure className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-6">
      <figcaption className="sr-only">What a typical booking site shows</figcaption>
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        A typical booking site
      </p>
      <div className="mt-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-4 shadow-sm">
        <p className="flex items-start gap-2 font-medium text-stone-900 dark:text-stone-100">
          <span aria-hidden="true" className="text-base">♿</span>
          Hôtel de France — Paris
        </p>
        <p className="mt-1 pl-7 text-sm text-stone-600 dark:text-stone-400">Accessible rooms available</p>
        <p className="mt-3 pl-7 text-xs text-stone-500 dark:text-stone-400">
          ✓ Free cancellation &nbsp;·&nbsp; ✓ Breakfast included
        </p>
      </div>
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        <li>Which room? Which floor? Which entrance?</li>
        <li>Can you shower? Turn around? Reach the bed?</li>
        <li>Who measured it — and is it still true?</li>
      </ul>
    </figure>
  );
}

function AfterCard() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 shadow-sm">
      <figcaption className="sr-only">What Access Atlas shows for the same hotel</figcaption>
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-5 py-4">
        <p className="font-semibold text-stone-900 dark:text-stone-100">Hôtel du Nord — Room 204</p>
        <span className="rounded-full bg-emerald-100 dark:bg-emerald-900 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          Measured
        </span>
      </div>
      <dl className="divide-y divide-stone-100 dark:divide-stone-800">
        {ROOM_DETAIL.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3">
            <dt className="text-sm text-stone-600 dark:text-stone-400">{row.label}</dt>
            <dd
              className={
                row.verified
                  ? "flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                  : "text-sm font-medium text-stone-900 dark:text-stone-100"
              }
            >
              {row.verified && (
                <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-[11px] font-bold leading-none">
                  ✓
                </span>
              )}
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-5 py-3 text-xs text-stone-500 dark:text-stone-400">
        Measured Mar 2026 · confirmed by 2 local contributors
      </p>
    </figure>
  );
}

function ProfilesSection() {
  return (
    <section
      id="profiles"
      aria-labelledby="profiles-title"
      className="scroll-mt-20 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Accessibility Profiles"
              title="One type of “accessible” is not another."
              lead="Build a profile once — the details that matter to you — and every trip is scored against it, leg by leg."
            />
            <ul className="mt-7 space-y-3 text-base leading-relaxed text-stone-700 dark:text-stone-300">
              <li className="flex items-start gap-2.5">
                <StatusBadge kind="ok" />
                <span>
                  <strong className="font-semibold text-stone-900 dark:text-stone-100">Can’t use stairs?</strong>{" "}
                  We check every step-free entrance — and where the step-free route actually goes.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <StatusBadge kind="ok" />
                <span>
                  <strong className="font-semibold text-stone-900 dark:text-stone-100">Use a manual wheelchair?</strong>{" "}
                  We measure door widths, turning circles, gradients and transfer space.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <StatusBadge kind="ok" />
                <span>
                  <strong className="font-semibold text-stone-900 dark:text-stone-100">Need a roll-in shower?</strong>{" "}
                  We record shower trays, seats, grab bars and toilet heights — not “accessible bathroom”.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <StatusBadge kind="ok" />
                <span>
                  <strong className="font-semibold text-stone-900 dark:text-stone-100">Prefer text over phone?</strong>{" "}
                  We flag the places whose only contact is a phone line.
                </span>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">
              Your profile is made of details like these:
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {PROFILE_TAGS.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3.5 py-1.5 text-sm text-stone-800 dark:text-stone-100"
                >
                  {tag}
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm font-semibold text-stone-500 dark:text-stone-400">
              Same hotel, two travelers, two different trips:
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-5">
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  Maya <span className="text-sm font-normal text-stone-500 dark:text-stone-400">· manual wheelchair, roll-in shower</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  Room 204 works — 34″ door, roll-in shower, elevator to every floor. But the only
                  level entrance is at the rear: verify it from the taxi drop-off.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-5">
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  Jonas <span className="text-sm font-normal text-stone-500 dark:text-stone-400">· low vision, text-first, quiet</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  The hotel replies by text and the room is quiet — good. But the museum nearby uses
                  audio-only guides, and the bar hosts live music Thu–Sat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TripCheckSection() {
  return (
    <section
      id="trip-check"
      aria-labelledby="trip-check-title"
      className="scroll-mt-20 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Trip Accessibility Check"
          title="The whole trip, checked against your profile."
          lead="Not just the hotel. The flight, the transfer, the museum, the metro — every leg of the journey scored against one profile."
        />

        {/* Trip summary bar */}
        <div className="mt-10 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-700 dark:bg-indigo-600 text-lg text-white"
              >
                ✈️
              </span>
              <div>
                <p className="font-display text-lg font-bold text-stone-900 dark:text-stone-100">
                  San Francisco → Paris
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400">June 12–19 · 7 nights · 1 traveler + wheelchair</p>
              </div>
            </div>
            <ul aria-label="Profile applied to this check" className="flex flex-wrap gap-2">
              {["Manual wheelchair", "Roll-in shower", "Cannot use stairs"].map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 text-xs font-medium text-indigo-800 dark:text-indigo-200"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
            Profile: <strong className="font-semibold text-stone-900 dark:text-stone-100">Maya</strong> — manual
            wheelchair, requires roll-in shower, cannot use stairs · 5 legs checked · 23 data
            points · 3 to verify
          </p>
        </div>

        {/* Leg-by-leg breakdown */}
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {TRIP_LEGS.map((leg, i) => (
            <li
              key={leg.title}
              className={
                i === TRIP_LEGS.length - 1
                  ? "rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-5 sm:p-6 md:col-span-2"
                  : "rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-5 sm:p-6"
              }
            >
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="text-2xl">
                  {leg.icon}
                </span>
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100">{leg.title}</h3>
                  {leg.subtitle ? <p className="text-xs text-stone-500 dark:text-stone-400">{leg.subtitle}</p> : null}
                </div>
              </div>
              <ul className="mt-4 space-y-2.5">
                {leg.lines.map((line, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm leading-snug text-stone-700 dark:text-stone-300">
                    <StatusBadge kind={line.kind} />
                    <span>{line.text}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {/* The gold: verify-before-booking panel */}
        <aside
          aria-labelledby="verify-title"
          className="mt-10 rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-6 sm:p-8"
        >
          <h3
            id="verify-title"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-amber-900 dark:text-amber-200"
          >
            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-full bg-amber-200 dark:bg-amber-800 text-sm font-bold leading-none text-amber-900 dark:text-amber-200"
            >
              !
            </span>
            Things you should verify before booking
          </h3>
          <p className="mt-3 max-w-3xl leading-relaxed text-amber-900 dark:text-amber-200">
            This is the Access Atlas promise: we show you exactly where the uncertainty is, so
            you verify the last 10% before you book — not at check-in.
          </p>
          <ul className="mt-6 space-y-5">
            {VERIFY_ITEMS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-200 dark:bg-amber-800 text-[11px] font-bold leading-none text-amber-900 dark:text-amber-200"
                >
                  !
                </span>
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-50">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-amber-900 dark:text-amber-200">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

function AudiencesSection() {
  const audiences = [
    {
      icon: "🧳",
      title: "Travelers",
      text: "Find places and things to do that genuinely work for you. Search on the details that matter — door widths, showers, seating, noise, terrain, transportation — and see exactly what to verify before you commit.",
    },
    {
      icon: "🏨",
      title: "Businesses",
      text: "Hotels, tours, attractions and venues — publish measured, verifiable profiles instead of one vague badge. Prove your accessibility claims with detail guests can check before they arrive.",
    },
    {
      icon: "📐",
      title: "Local contributors",
      text: "Submit measurements, photos and notes on places you’ve stayed. One measured detail from you makes the database honest for someone else’s trip.",
    },
  ];
  return (
    <section
      id="audiences"
      aria-labelledby="audiences-title"
      className="scroll-mt-20 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="For everyone who travels"
          title="Built for travelers, businesses, and the people on the ground."
          lead="A two-sided community from day one: people who need real answers, and businesses who want to prove their accessibility claims."
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {audiences.map((audience) => (
            <li
              key={audience.title}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-6"
            >
              <span aria-hidden="true" className="text-3xl">
                {audience.icon}
              </span>
              <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {audience.title}
              </h3>
              <p className="mt-2 leading-relaxed text-stone-700 dark:text-stone-300">{audience.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DataSection() {
  return (
    <section
      id="data"
      aria-labelledby="data-title"
      className="scroll-mt-20 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>The data underneath</Eyebrow>
          <h2
            id="data-title"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl"
          >
            Measured. Structured. Queryable.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-stone-700 dark:text-stone-300">
            Every Access Atlas card is built from real, structured detail — not yes/no flags.
            Door widths, shower trays, step heights, elevator status, gradients, turning
            circles, bed heights, noise levels.
          </p>
        </div>
        <ul aria-label="Examples of measured data fields" className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
          {DATA_CHIPS.map((chip) => (
            <li
              key={chip}
              className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-1.5 font-mono text-xs text-stone-600 dark:text-stone-400"
            >
              {chip}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          A database built to be asked questions of — by travelers, by businesses, and by the
          tools you already use.
        </p>
      </div>
    </section>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistStatus = "idle" | "submitting" | "success" | "duplicate" | "invalid" | "error";

const WAITLIST_MESSAGES: Record<WaitlistStatus, string> = {
  idle: "",
  submitting: "Adding you to the list…",
  success: "You’re on the list — we’ll email first.",
  duplicate: "You’re already on the list.",
  invalid: "Please enter a valid email address.",
  error: "Couldn’t save that right now — try again.",
};

function CtaSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<WaitlistStatus>("idle");

  const message = WAITLIST_MESSAGES[status];
  const hasError = status === "invalid" || status === "error";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");
    try {
      const result = await addToWaitlist({ data: trimmed });
      if (result.ok) {
        setStatus(result.added ? "success" : "duplicate");
      } else {
        setStatus(result.reason === "invalid" ? "invalid" : "error");
      }
    } catch (err) {
      // Network / serialization failure — never report success.
      console.error("Waitlist submit failed:", err);
      setStatus("error");
    }
  }

  return (
    <section id="cta" aria-labelledby="cta-title" className="scroll-mt-20 bg-indigo-700">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="cta-title"
            className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Be first when Access Atlas opens.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-indigo-100">
            We’re building the database now — measuring, verifying, mapping. Early access
            opens soon, and the first people in line will hear from us first.
          </p>
          <form onSubmit={handleSubmit} noValidate className="mx-auto mt-8 max-w-md text-left">
            <label
              htmlFor="waitlist-email"
              className="block text-sm font-semibold text-white"
            >
              Email address
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
              <input
                id="waitlist-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "invalid" || status === "error") setStatus("idle");
                }}
                aria-invalid={hasError}
                aria-describedby={hasError ? "waitlist-message" : undefined}
                placeholder="you@example.com"
                className="min-h-[44px] w-full rounded-md border border-white/40 bg-white px-4 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-white px-6 py-3 text-base font-semibold text-indigo-800 shadow-sm transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "submitting" ? "Adding…" : "Join the waitlist"}
              </button>
            </div>
            <p
              id="waitlist-message"
              role="status"
              aria-live="polite"
              className={
                "mt-3 min-h-5 text-sm font-medium " +
                (status === "invalid" || status === "error"
                  ? "text-amber-200"
                  : status === "success" || status === "duplicate"
                    ? "text-emerald-200"
                    : "text-indigo-100")
              }
            >
              {message}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-indigo-200">
              No spam, no account yet — one short email when early access opens. Access Atlas
              is in early build.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-stone-500 dark:text-stone-400 sm:flex-row sm:px-6">
        <p>© 2026 Access Atlas · Measured accessibility, verified before you book.</p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="rounded-md transition-colors hover:text-stone-900 dark:hover:text-stone-100">
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/barcelona"
                className="rounded-md font-medium transition-colors hover:text-stone-900 dark:hover:text-stone-100"
              >
                Barcelona pilot
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
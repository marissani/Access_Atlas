/**
 * The demo defaults for the Barcelona pilot page.
 *
 * They exist so a first visit shows the product working immediately: a real
 * profile, a real trip over the sample rows, run through the real engine on the
 * server — labelled as an interactive demo on the page. Nothing here is
 * privileged or cached; the same three tags and the same four places are what
 * the phase-1 verification harness uses.
 */
export const DEMO_PROFILE_TAGS = [
  "Manual wheelchair",
  "Requires roll-in shower",
  "Cannot use stairs",
] as const;

export const DEMO_STAY_SLUG = "hotel-marbre-eixample";

export const DEMO_ACTIVITY_SLUGS = [
  "museu-ciutat-vella-gotic",
  "galeria-llum-nova-eixample",
  "parc-turo-verd-gracia",
] as const;

/** The engine accepts up to 12; the pilot picker keeps the check readable. */
export const MAX_ACTIVITIES = 3;

/**
 * The honesty label, available without the database: the page must never look
 * like a live dataset while it is showing nothing, so the marker is local.
 * The server sends the same string on every successful response.
 */
export const SAMPLE_NOTICE_FALLBACK = "Prototype sample data — not yet field-verified";

/** One line per profile tag: what the engine actually looks at for it. */
export const TAG_HINTS: Record<string, string> = {
  "Cannot use stairs": "Step-free entrances, which door is step-free, and elevators.",
  "Manual wheelchair":
    "Door widths, thresholds, turning circles, and how you reach the toilet.",
  "Requires roll-in shower":
    "The shower tray, seat and grab bars — the detail that decides a stay.",
  "Needs space beside bed": "Clear space beside the bed, plus bed and toilet heights.",
  "Prefers text over phone": "Whether the place can be asked in writing at all.",
  "Avoids very loud environments":
    "Published noise levels, and whether a quieter session exists.",
  "Needs flexible itineraries": "Timed entry, fixed slots, and room-change policies.",
  "Needs accessible transportation":
    "Step-free metro, lifts, and the accessible taxi drop-off.",
};

/**
 * Barcelona pilot — the Trip Accessibility Check engine (phase 1).
 *
 * Pure, database-free rules over `PlaceRow[]` (see `barcelona-schema.ts`), so it
 * can be unit-driven from a script as well as from the server function in
 * `barcelona.ts`.
 *
 * ## How a verdict is produced
 *
 * Every rule maps ONE profile tag to ONE stored field and a small check:
 *
 *   status = measured  → check passes            → `ok`
 *                        check is borderline     → `info`
 *                        check fails             → `warn`  (+ verify item if the rule has one)
 *   status = estimated → check passes/borderline → `info`  (an estimate is never "ok")
 *                        check fails             → `warn`  (the business' own estimate is incompatible)
 *   status = unknown   → `warn`                            (unknown-but-relevant, + verify item)
 *   status = not_applicable → rule skipped
 *   field absent       → rule's `absent` policy: skip | info | warn
 *
 * Rules only run where the place **has** that category of data at all and where
 * the place kind matches (`appliesTo`). That is what makes "not_relevant → skip"
 * work: an activity is never warned about a shower it does not have, and a stay
 * is never warned about a venue's stage door.
 *
 * Unknowns are FEATURES, not gaps: a `warn` with a verify prompt lands in
 * `toVerify` — the "verify the last 10% before you book" list from the landing
 * page.
 */
import { SAMPLE_NOTICE } from "./barcelona-seed";
import type { AccessFieldRow, PlaceRow } from "./barcelona-schema";
import type { FieldCategory, PlaceKind } from "./barcelona-seed";

export type LineKind = "ok" | "info" | "warn";
export type CheckLine = { kind: LineKind; text: string };
export type TripLeg = { title: string; icon: string; subtitle?: string; lines: CheckLine[] };
export type VerifyItem = { title: string; text: string };

/** The profile vocabulary the landing page promises (its "Profiles" section). */
export const KNOWN_PROFILE_TAGS = [
  "Cannot use stairs",
  "Manual wheelchair",
  "Requires roll-in shower",
  "Needs space beside bed",
  "Prefers text over phone",
  "Avoids very loud environments",
  "Needs flexible itineraries",
  "Needs accessible transportation",
] as const;
export type ProfileTag = (typeof KNOWN_PROFILE_TAGS)[number];

const TAG_SET: ReadonlySet<string> = new Set<string>(KNOWN_PROFILE_TAGS);

export type TripCheckInput = {
  profileTags: string[];
  trip: { staySlug: string; activitySlugs: string[] };
};

export type TripCheckSuccess = {
  ok: true;
  sample: true;
  notice: string;
  trip: { staySlug: string; activitySlugs: string[] };
  profileTags: ProfileTag[];
  legs: TripLeg[];
  toVerify: VerifyItem[];
  counts: { legs: number; dataPoints: number; toVerify: number };
};
export type TripCheckResult = TripCheckSuccess | { ok: false; reason: string };

/* ────────────────────────────── checks ────────────────────────────────── */

type CheckOutcome = "good" | "middle" | "bad" | "neutral";

type Check =
  | { kind: "yes-no" }
  | { kind: "keywords"; warn: string[]; middle?: string[]; good: string[] }
  | { kind: "min"; min: number }
  | { kind: "max"; max: number }
  | { kind: "range"; okAt: number; infoAt: number }
  | { kind: "ratio-min"; threshold: number }
  | { kind: "present" }
  | { kind: "always-info" };

function firstNumber(value: string): number | null {
  const m = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** All `1:N` gradients in the value; the steepest (smallest N) decides. */
export function steepestRatio(value: string): { ratio: number; steepest: number } | null {
  const ratios = [...value.matchAll(/1\s*:\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (!ratios.length) return null;
  return { ratio: ratios[0], steepest: Math.min(...ratios) };
}

function evalCheck(check: Check, value: string, status: string): CheckOutcome {
  const v = value.toLowerCase();
  switch (check.kind) {
    case "yes-no": {
      if (/^\s*yes\b/.test(v)) return "good";
      if (/^\s*no\b/.test(v)) return "bad";
      return "neutral";
    }
    case "keywords": {
      // Warning tokens win: "stairs only from the square; step-free route is via
      // Jaume Nord" must read as a warning, not as a pass.
      if (check.warn.some((t) => v.includes(t))) return "bad";
      if (check.good.some((t) => v.includes(t))) return status === "estimated" ? "middle" : "good";
      if (check.middle?.some((t) => v.includes(t))) return "middle";
      return "neutral";
    }
    case "min": {
      const n = firstNumber(v);
      return n === null ? "neutral" : n >= check.min ? "good" : "bad";
    }
    case "max": {
      const n = firstNumber(v);
      return n === null ? "neutral" : n <= check.max ? "good" : "bad";
    }
    case "range": {
      const n = firstNumber(v);
      if (n === null) return "neutral";
      if (n >= check.okAt) return "good";
      return n >= check.infoAt ? "middle" : "bad";
    }
    case "ratio-min": {
      const r = steepestRatio(v);
      if (!r) return "neutral";
      return r.steepest >= check.threshold ? "good" : "bad";
    }
    case "present":
      return status === "estimated" ? "middle" : "good";
    case "always-info":
      return "neutral";
  }
}

/* ────────────────────────────── rules ────────────────────────────────── */

type SourceRef = { category: FieldCategory; field: string };

type Rule = {
  id: string;
  tag: ProfileTag;
  /** Place kinds the rule applies to — a stay is never asked about a stage door. */
  appliesTo: PlaceKind[];
  /** Candidate sources, first match wins (e.g. venue noise, else room noise). */
  sources: SourceRef[];
  check: Check;
  /** What to do when the place has no row for any source. */
  absent: "skip" | "info" | "warn";
  texts: { ok: string; info?: string; warn: string; unknown?: string; absent?: string };
  /** Prompt added to `toVerify` when this rule warns. `{…}` fields are templated. */
  verify?: { title: string; text: string };
};

const STAY: PlaceKind[] = ["stay"];
const BOTH: PlaceKind[] = ["stay", "activity"];

export const RULES: Rule[] = [
  /* ── Cannot use stairs ─────────────────────────────────────────────── */
  {
    id: "stairs.step_free_entrance",
    tag: "Cannot use stairs",
    appliesTo: BOTH,
    sources: [{ category: "entrance", field: "step_free_entrance" }],
    check: { kind: "yes-no" },
    absent: "warn",
    texts: {
      ok: "Step-free entrance — {value}",
      info: "Step-free entrance described by {source}, not measured: {value}",
      warn: "Not step-free: {value}",
      unknown: "Whether there is a step-free entrance is not published",
      absent: "No step-free entrance on record for this place",
    },
    verify: {
      title: "{place} — step-free entrance",
      text: "Ask {place} to describe the step-free entrance in writing (photo or video of the door, and any step or ramp). {note}",
    },
  },
  {
    id: "stairs.entrance_used",
    tag: "Cannot use stairs",
    appliesTo: BOTH,
    sources: [{ category: "entrance", field: "entrance_used" }],
    check: { kind: "present" },
    absent: "info",
    texts: {
      ok: "Step-free route is the {value}",
      info: "Which entrance is step-free: {value} (not measured)",
      warn: "Which entrance is step-free is not published",
      unknown: "Which entrance is step-free is not published",
      absent: "Which entrance is step-free is not recorded — the main door may have steps",
    },
    verify: {
      title: "{place} — which entrance is step-free",
      text: "Confirm the step-free entrance before you book and plan the taxi drop-off for that door: a step-free entrance around the back changes the arrival. {note}",
    },
  },
  {
    id: "stairs.elevator_status",
    tag: "Cannot use stairs",
    appliesTo: STAY,
    sources: [{ category: "room", field: "elevator_status" }],
    check: {
      kind: "keywords",
      warn: ["no elevator", "no lift", "stairs only", "out of service", "not working"],
      good: ["operational", "serves all floors", "step-free", "lifts", "works"],
    },
    absent: "warn",
    texts: {
      ok: "Elevator: {value}",
      info: "Elevator (business estimate): {value}",
      warn: "Elevator: {value}",
      unknown: "Elevator status not published",
      absent: "No elevator information recorded for this stay",
    },
    verify: {
      title: "{place} — getting to the room",
      text: "Confirm how you reach the room: {value}. Ask for a photo of the lift door and cabin (or whether a ground-floor room exists). {note}",
    },
  },

  /* ── Manual wheelchair ─────────────────────────────────────────────── */
  {
    id: "wheelchair.door_width",
    tag: "Manual wheelchair",
    appliesTo: BOTH,
    sources: [{ category: "entrance", field: "door_width" }],
    check: { kind: "min", min: 32 },
    absent: "warn",
    texts: {
      ok: "Entrance door {value} clear — wider than the 32 in a manual wheelchair needs",
      info: "Entrance door {value} (the business' own estimate)",
      warn: "Entrance door {value} — narrower than the 32 in a manual wheelchair needs",
      unknown: "Entrance door width is not published",
      absent: "No entrance door width recorded for this place",
    },
    verify: {
      title: "{place} — entrance door width",
      text: "Ask for the clear opening width in writing (frame to frame, door open), ideally a photo with a tape measure across the opening. {note}",
    },
  },
  {
    id: "wheelchair.threshold",
    tag: "Manual wheelchair",
    appliesTo: BOTH,
    sources: [{ category: "entrance", field: "threshold" }],
    check: { kind: "max", max: 2 },
    absent: "info",
    texts: {
      ok: "Entrance threshold {value} — no lip worth mentioning",
      info: "Entrance threshold {value} (the business' own estimate)",
      warn: "Entrance threshold {value} — needs a ramp or someone to help",
      unknown: "Entrance threshold height is not published",
      absent: "No entrance threshold height recorded for this place",
    },
    verify: {
      title: "{place} — entrance threshold",
      text: "Ask whether a portable ramp is available at the entrance and who fits it. {note}",
    },
  },
  {
    id: "wheelchair.room_door_width",
    tag: "Manual wheelchair",
    appliesTo: STAY,
    sources: [{ category: "room", field: "room_door_width" }],
    check: { kind: "min", min: 32 },
    absent: "warn",
    texts: {
      ok: "Room door {value} clear",
      info: "Room door {value} (the business' own estimate)",
      warn: "Room door {value} — narrower than the 32 in a manual wheelchair needs",
      unknown: "Room door width is not published",
      absent: "No room door width recorded for this stay",
    },
    verify: {
      title: "{place} — room door width",
      text: "Ask the hotel for the room door's clear opening width (bathroom door too) before booking. {note}",
    },
  },
  {
    id: "wheelchair.turning_circle",
    tag: "Manual wheelchair",
    appliesTo: STAY,
    sources: [{ category: "room", field: "turning_circle" }],
    check: { kind: "min", min: 60 },
    absent: "warn",
    texts: {
      ok: "Turning circle in the room: {value}",
      info: "Turning circle in the room: {value} (the business' own estimate)",
      warn: "Turning circle in the room: {value} — tight for a 5 ft turn",
      unknown: "Room turning circle is not published",
      absent: "No room turning circle recorded for this stay",
    },
    verify: {
      title: "{place} — room turning circle",
      text: "Ask for the free floor space (or a room plan) so you can see whether you can turn. {note}",
    },
  },
  {
    id: "wheelchair.bathroom_turning_circle",
    tag: "Manual wheelchair",
    appliesTo: STAY,
    sources: [{ category: "bathroom", field: "bathroom_turning_circle" }],
    check: { kind: "min", min: 60 },
    absent: "skip",
    texts: {
      ok: "Turning circle in the bathroom: {value}",
      info: "Turning circle in the bathroom: {value} (the business' own estimate)",
      warn: "Turning circle in the bathroom: {value} — tight",
      unknown: "Bathroom turning circle is not published",
    },
    verify: {
      title: "{place} — bathroom turning circle",
      text: "Ask for the bathroom's free floor space with the door open. {note}",
    },
  },
  {
    id: "wheelchair.accessible_toilet",
    tag: "Manual wheelchair",
    appliesTo: BOTH,
    sources: [{ category: "bathroom", field: "accessible_toilet" }],
    check: { kind: "yes-no" },
    absent: "skip",
    texts: {
      ok: "Accessible toilet — {value}",
      info: "Accessible toilet described, not measured: {value}",
      warn: "Accessible toilet: {value}",
      unknown: "Accessible toilet dimensions are not published",
    },
    verify: {
      title: "{place} — accessible toilet",
      text: "Ask for the toilet's transfer side and clear space (or a photo with the door open), and whether there is another accessible toilet on the same level. {note}",
    },
  },

  /* ── Requires roll-in shower ───────────────────────────────────────── */
  {
    id: "shower.roll_in_shower",
    tag: "Requires roll-in shower",
    appliesTo: STAY,
    sources: [{ category: "bathroom", field: "roll_in_shower" }],
    check: { kind: "yes-no" },
    absent: "warn",
    texts: {
      ok: "Roll-in shower — {value}",
      info: "A roll-in shower is described but not measured: {value}",
      warn: "No roll-in shower: {value}",
      unknown: "Roll-in shower not confirmed",
      absent: "No roll-in shower recorded for this stay",
    },
    verify: {
      title: "{place} — roll-in shower",
      text: "Confirm the shower entry in writing and ask for photos of the bathroom with the shower door open. {note}",
    },
  },
  {
    id: "shower.tray_dimensions",
    tag: "Requires roll-in shower",
    appliesTo: STAY,
    sources: [{ category: "bathroom", field: "shower_tray_dimensions" }],
    check: { kind: "present" },
    // Absent or unknown tray dimensions are exactly what this profile must verify.
    absent: "warn",
    texts: {
      ok: "Shower tray {value} — published and measured",
      info: "Shower tray {value} (the business' own figure, not measured)",
      warn: "Shower tray dimensions not published",
      unknown: "Shower tray dimensions not published",
      absent: "No shower tray dimensions on record for this stay",
    },
    verify: {
      title: "{place} — shower tray dimensions",
      text: "{note}Ask for the tray dimensions (width × depth) and the entry lip height, ideally a photo of the tray with the door open — this is the detail that makes or breaks a stay.",
    },
  },
  {
    id: "shower.seat",
    tag: "Requires roll-in shower",
    appliesTo: STAY,
    sources: [{ category: "bathroom", field: "shower_seat" }],
    check: { kind: "keywords", warn: ["none", "no seat"], good: ["fixed", "fold", "removable", "seat", "stool"] },
    absent: "skip",
    texts: {
      ok: "Shower seat: {value}",
      info: "Shower seat (business estimate): {value}",
      warn: "Shower seat: {value}",
      unknown: "Shower seat is not published",
    },
    verify: {
      title: "{place} — shower seat",
      text: "Ask whether a fixed or removable seat can be fitted, and at what height. {note}",
    },
  },
  {
    id: "shower.grab_bars",
    tag: "Requires roll-in shower",
    appliesTo: STAY,
    sources: [{ category: "bathroom", field: "grab_bars" }],
    check: { kind: "keywords", warn: ["none", "no bars"], good: ["fixed", "bars", "installed", "grab"] },
    absent: "skip",
    texts: {
      ok: "Grab bars: {value}",
      info: "Grab bars (business estimate): {value}",
      warn: "Grab bars: {value}",
      unknown: "Grab bars are not published",
    },
    verify: {
      title: "{place} — grab bars",
      text: "Ask for photos of the grab bars and whether additional bars can be installed. {note}",
    },
  },

  /* ── Needs space beside bed ────────────────────────────────────────── */
  {
    id: "bed.transfer_space",
    tag: "Needs space beside bed",
    appliesTo: STAY,
    sources: [{ category: "room", field: "transfer_space_beside_bed" }],
    check: { kind: "range", okAt: 36, infoAt: 30 },
    absent: "info",
    texts: {
      ok: "Clear space beside the bed: {value} — room to transfer on both sides",
      info: "Clear space beside the bed: {value} — reported, not measured",
      warn: "Clear space beside the bed: {value} — tight for a transfer",
      unknown: "Clear space beside the bed is not published",
      absent: "No space-beside-bed figure recorded for this stay",
    },
    verify: {
      title: "{place} — space beside the bed",
      text: "{note}Ask the hotel to confirm the clear space beside the bed and on which side, in writing.",
    },
  },
  {
    id: "bed.bed_height",
    tag: "Needs space beside bed",
    appliesTo: STAY,
    sources: [{ category: "room", field: "bed_height" }],
    check: { kind: "always-info" },
    absent: "skip",
    texts: { ok: "Bed height: {value}", info: "Bed height: {value}", warn: "Bed height: {value}", unknown: "Bed height is not published" },
  },
  {
    id: "bed.toilet_height",
    tag: "Needs space beside bed",
    appliesTo: BOTH,
    sources: [{ category: "bathroom", field: "toilet_height" }],
    check: { kind: "always-info" },
    absent: "skip",
    texts: { ok: "Toilet height: {value}", info: "Toilet height: {value}", warn: "Toilet height: {value}", unknown: "Toilet height is not published" },
  },
  {
    id: "bed.toilet_transfer_side",
    tag: "Needs space beside bed",
    appliesTo: BOTH,
    sources: [{ category: "bathroom", field: "toilet_transfer_side" }],
    check: { kind: "present" },
    absent: "skip",
    texts: {
      ok: "Toilet transfer side: {value}",
      info: "Toilet transfer side: {value} (not measured)",
      warn: "Toilet transfer side not published",
      unknown: "Toilet transfer side not published",
    },
    verify: {
      title: "{place} — toilet transfer side",
      text: "Ask which side the toilet transfers from and how much clear space there is. {note}",
    },
  },

  /* ── Prefers text over phone ───────────────────────────────────────── */
  {
    id: "contact.preference",
    tag: "Prefers text over phone",
    appliesTo: BOTH,
    sources: [{ category: "contact", field: "contact_preference" }],
    check: {
      kind: "keywords",
      warn: ["phone only", "phone-only", "telephone only", "phone booking only"],
      good: ["email", "web form", "text", "sms", "whatsapp", "writing", "chat"],
    },
    absent: "warn",
    texts: {
      ok: "Answers in writing — {value}",
      info: "Contact channel (unverified): {value}",
      warn: "Phone only — {value}",
      unknown: "No contact channel is published",
      absent: "No contact channel recorded for this place",
    },
    verify: {
      title: "{place} — no written contact channel",
      text: "{note}Ask for an email address (or send your questions in a voice note and ask for a written reply) so the answers are on record before you book.",
    },
  },

  /* ── Avoids very loud environments ─────────────────────────────────── */
  {
    id: "noise.level",
    tag: "Avoids very loud environments",
    appliesTo: BOTH,
    sources: [
      { category: "venue", field: "noise_level" },
      { category: "room", field: "noise_level" },
    ],
    check: {
      kind: "keywords",
      warn: ["loud", "very loud", "amplified", "echoing", "noisy"],
      middle: ["moderate", "average", "some noise", "occasional"],
      good: ["quiet"],
    },
    absent: "info",
    texts: {
      ok: "Quiet — {value}",
      info: "Noise: {value}",
      warn: "Loud environment — {value}",
      unknown: "Noise level is not published",
      absent: "No noise level recorded for this place",
    },
    verify: {
      title: "{place} — noise",
      text: "{note}Ask which hours or performances are quietest, and whether there is a quieter room or session.",
    },
  },
  {
    id: "noise.quiet_option",
    tag: "Avoids very loud environments",
    appliesTo: BOTH,
    sources: [{ category: "venue", field: "quiet_hours" }],
    check: { kind: "present" },
    absent: "skip",
    texts: {
      ok: "Quieter option available — {value}",
      info: "Quieter option: {value} (not confirmed)",
      warn: "Quieter option not confirmed",
      unknown: "Whether quieter times exist is not published",
    },
    verify: {
      title: "{place} — quieter times",
      text: "Ask whether a quieter session or time slot exists (and how it is booked). {note}",
    },
  },

  /* ── Needs flexible itineraries ────────────────────────────────────── */
  {
    id: "flex.timed_entry",
    tag: "Needs flexible itineraries",
    appliesTo: BOTH,
    sources: [{ category: "venue", field: "timed_entry" }],
    check: {
      kind: "keywords",
      warn: ["timed entry", "fixed", "doors close", "in advance", "advance booking"],
      good: ["open entry", "no timed slot", "any time", "flexible", "valid all day"],
    },
    absent: "skip",
    texts: {
      ok: "Flexible timing — {value}",
      info: "Entry timing (unverified): {value}",
      warn: "Fixed timing — {value}",
      unknown: "Entry timing is not published",
    },
    verify: {
      title: "{place} — fixed entry times",
      text: "{note}Ask whether the slot can be moved or exchanged on the day, and how late you can arrive.",
    },
  },
  {
    id: "flex.room_move",
    tag: "Needs flexible itineraries",
    appliesTo: STAY,
    sources: [{ category: "venue", field: "room_move_policy" }],
    check: {
      kind: "keywords",
      warn: ["no room changes", "no changes", "non-refundable", "no refunds"],
      good: ["will move guests", "can move guests", "flexible", "cancel"],
    },
    absent: "skip",
    texts: {
      ok: "Room changes allowed — {value}",
      info: "Room-change policy (unverified): {value}",
      warn: "No room changes after booking — {value}",
      unknown: "Room-change policy is not published",
    },
    verify: {
      title: "{place} — no room changes after booking",
      text: "Ask what happens if a measured detail turns out wrong on arrival — can the booking move to another room or date? {note}",
    },
  },

  /* ── Needs accessible transportation ───────────────────────────────── */
  {
    id: "transport.metro",
    tag: "Needs accessible transportation",
    appliesTo: BOTH,
    sources: [{ category: "transport", field: "nearest_accessible_metro" }],
    check: {
      kind: "keywords",
      warn: ["stairs only", "no elevator", "no lift", "not step-free", "status changes"],
      good: ["step-free", "step free", "lifts to", "elevator to", "lift to"],
    },
    absent: "info",
    texts: {
      ok: "Step-free transport — {value}",
      info: "Transport (estimate, not confirmed): {value}",
      warn: "Stairs-only or unconfirmed access — {value}",
      unknown: "Step-free transport information is not published",
      absent: "No transport information recorded for this place",
    },
    verify: {
      title: "{place} — step-free transport on the day",
      text: "Confirm the step-free route the morning you travel: {value} Keep a low-floor bus or an accessible taxi as the fallback.",
    },
  },
  {
    id: "transport.taxi_dropoff",
    tag: "Needs accessible transportation",
    appliesTo: BOTH,
    sources: [{ category: "transport", field: "accessible_taxi_dropoff" }],
    check: {
      kind: "keywords",
      warn: ["steps", "cobble", "stairs", "up to the door"],
      good: ["level"],
    },
    absent: "info",
    texts: {
      ok: "Level drop-off — {value}",
      info: "Drop-off (estimate, not confirmed): {value}",
      warn: "Drop-off is not level — {value}",
      unknown: "Drop-off conditions are not published",
      absent: "No drop-off information recorded for this place",
    },
    verify: {
      title: "{place} — the last few metres",
      text: "Plan the final stretch: {value} Ask the venue to meet you at the vehicle, or book a taxi with a ramp that can pull up to the door.",
    },
  },
];

/* ──────────────────────────── evaluation ─────────────────────────────── */

function fieldOf(place: PlaceRow, ref: SourceRef): AccessFieldRow | undefined {
  return place.fields.find((f) => f.category === ref.category && f.field === ref.field);
}

function hasCategory(place: PlaceRow, category: FieldCategory): boolean {
  return place.fields.some((f) => f.category === category);
}

function render(template: string, place: PlaceRow, field: AccessFieldRow | undefined): string {
  const value = field ? `${field.value}${field.unit ? ` ${field.unit}` : ""}` : "";
  return template
    .replaceAll("{place}", place.name)
    .replaceAll("{neighborhood}", place.neighborhood)
    .replaceAll("{value}", value)
    .replaceAll("{label}", field?.label ?? "")
    .replaceAll("{status}", field?.status ?? "")
    .replaceAll("{source}", field?.source ?? "an unknown source")
    // {note} is rendered with a trailing space so it cannot glue onto the next
    // sentence ("…before booking.Ask for…").
    .replaceAll("{note}", field?.note ? `${field.note.trim()} ` : "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type RuleOutcome = { line?: CheckLine; verify?: VerifyItem; used?: AccessFieldRow };

/** Apply one rule to one place. Returns nothing when the rule is not relevant. */
function applyRule(rule: Rule, place: PlaceRow): RuleOutcome {
  if (!rule.appliesTo.includes(place.kind)) return {};
  // A rule only runs where the place records data in one of its categories at
  // all — a stay with no `venue` rows is not "missing" a venue detail, it simply
  // has none (not_relevant → skip).
  if (!rule.sources.some((ref) => hasCategory(place, ref.category))) return {};

  const field = rule.sources.map((ref) => fieldOf(place, ref)).find(Boolean);
  if (field && field.status === "not_applicable") return {};

  const line = (kind: LineKind, template: string): CheckLine => ({
    kind,
    text: render(template, place, field),
  });
  const verify: VerifyItem | undefined = rule.verify
    ? { title: render(rule.verify.title, place, field), text: render(rule.verify.text, place, field) }
    : undefined;

  // No row at all for this field.
  if (!field) {
    if (rule.absent === "skip") return {};
    if (rule.absent === "info") {
      return { line: line("info", rule.texts.absent ?? rule.texts.info ?? rule.texts.warn) };
    }
    return {
      line: line("warn", rule.texts.absent ?? rule.texts.warn),
      verify,
    };
  }

  // Unknown-but-relevant: never "ok" — it is exactly what the traveler can verify.
  if (field.status === "unknown") {
    return { line: line("warn", rule.texts.unknown ?? rule.texts.warn), verify, used: field };
  }

  const outcome = evalCheck(rule.check, field.value, field.status);
  if (field.status === "estimated") {
    // An estimate can never be "ok"; an incompatible estimate is still a warning.
    const kind: LineKind = outcome === "bad" ? "warn" : "info";
    return {
      line: line(kind, kind === "warn" ? rule.texts.warn : (rule.texts.info ?? rule.texts.ok)),
      verify: kind === "warn" ? verify : undefined,
      used: field,
    };
  }

  if (outcome === "bad") return { line: line("warn", rule.texts.warn), verify, used: field };
  if (outcome === "good") return { line: line("ok", rule.texts.ok), used: field };
  return { line: line("info", rule.texts.info ?? rule.texts.ok), used: field };
}

const KIND_ICON: Record<PlaceKind, string> = { stay: "🏨", activity: "🎭" };

/** "Getting around" — terrain and transport across the whole chosen set. */
function buildGettingAroundLeg(
  chosen: PlaceRow[],
  tags: ProfileTag[],
): { leg: TripLeg; verify: VerifyItem[] } {
  const wheelchair = tags.includes("Manual wheelchair");
  const stairsFree = tags.includes("Cannot use stairs");
  const transportTag = tags.includes("Needs accessible transportation");
  const lines: CheckLine[] = [];
  const verify: VerifyItem[] = [];

  const cobbled: PlaceRow[] = [];
  const steep: PlaceRow[] = [];
  const level: PlaceRow[] = [];

  for (const place of chosen) {
    const surface = fieldOf(place, { category: "terrain", field: "approach_surface" });
    const gradient = fieldOf(place, { category: "terrain", field: "gradient" });
    const surfaceText = surface?.value ?? "";
    // "no cobbles" is a *positive* finding, so strip the negation before matching
    // — otherwise "Paved, level sidewalk — no cobbles" reads as cobbled.
    if (/cobble/i.test(surfaceText.replace(/no cobbles?/gi, ""))) {
      cobbled.push(place);
    } else if (surface) {
      level.push(place);
    }

    const ratio = gradient ? steepestRatio(gradient.value) : null;
    if (ratio && ratio.steepest < 12) {
      steep.push(place);
      const kind: LineKind = wheelchair || stairsFree ? "warn" : "info";
      lines.push({
        kind,
        text: `${place.name}: gradient ${gradient?.value} — steeper than 1:12`,
      });
      if (kind === "warn") {
        verify.push({
          title: `${place.name} — steep approach`,
          text: `The published gradient (${gradient?.value}) is steeper than the 1:12 most profiles need. Ask for the gentlest route to the entrance, or whether the entrance can be reached by vehicle.`,
        });
      }
    }
  }

  // Transport summary across the chosen places.
  const transport = chosen.map((place) => ({
    place,
    field: fieldOf(place, { category: "transport", field: "nearest_accessible_metro" }),
  }));
  const isStairsOnly = (value: string) =>
    ["stairs only", "no elevator", "no lift", "not step-free", "status changes"].some((token) =>
      value.toLowerCase().includes(token),
    );
  const stairsOnly = transport.filter((t) => t.field && isStairsOnly(t.field.value));
  const confirmed = transport.filter(
    (t) =>
      t.field &&
      t.field.status === "measured" &&
      !isStairsOnly(t.field.value) &&
      ["step-free", "lifts to", "elevator to", "lift to"].some((token) =>
        t.field!.value.toLowerCase().includes(token),
      ),
  );
  if (transport.some((t) => t.field)) {
    lines.push({
      kind: stairsOnly.length ? (transportTag ? "warn" : "info") : "ok",
      text: `Step-free transport confirmed at ${confirmed.length} of ${chosen.length} chosen places; ${stairsOnly.length} are stairs-only or have an access whose status changes.`,
    });
  }
  if (cobbled.length) {
    const detail = cobbled
      .map((place) => {
        const surface = fieldOf(place, { category: "terrain", field: "approach_surface" });
        return `${place.name} (${surface?.value ?? "surface not described"})`;
      })
      .join("; ");
    const kind: LineKind = wheelchair ? "warn" : "info";
    lines.push({
      kind,
      text: `Cobblestones on the approach to ${cobbled.length} of ${chosen.length} chosen places: ${detail}`,
    });
    if (wheelchair) {
      verify.push({
        title: `Cobblestone approaches (${cobbled.length})`,
        text: `Cobblestones shake a manual wheelchair and need more push effort: ${cobbled
          .map((p) => p.name)
          .join(", ")}. Ask each place for the flattest route from the drop-off, or plan the accessible taxi to the door.`,
      });
    }
  }
  if (level.length) {
    lines.push({
      kind: "ok",
      text: `Level, paved approach (no cobbles) at ${level.length} of ${chosen.length} chosen places.`,
    });
  }
  if (transportTag && stairsOnly.length) {
    verify.push({
      title: "Step-free transport between legs",
      text: `${stairsOnly.map((t) => t.place.name).join(", ")} ${stairsOnly.length === 1 ? "has" : "have"} no confirmed step-free route. Confirm the accessible bus or taxi route for those legs on the day you travel.`,
    });
  }

  const subtitleParts = [
    cobbled.length ? `${cobbled.length} cobblestone approach${cobbled.length === 1 ? "" : "es"}` : null,
    steep.length ? `${steep.length} gradient warning${steep.length === 1 ? "" : "s"}` : null,
  ].filter((part): part is string => Boolean(part));
  const leg: TripLeg = {
    title: "Getting around",
    icon: "🚇",
    subtitle: subtitleParts.join(" · ") || "Terrain and transport across your chosen places",
    lines,
  };
  return { leg, verify };
}

/* ───────────────────────────── entry point ───────────────────────────── */

export function runTripCheckOnPlaces(places: PlaceRow[], input: TripCheckInput): TripCheckResult {
  if (!input || typeof input !== "object") return { ok: false, reason: "invalid-input" };
  const rawTags = input.profileTags;
  if (!Array.isArray(rawTags) || rawTags.some((t) => typeof t !== "string")) {
    return { ok: false, reason: "invalid-profile-tags" };
  }
  if (rawTags.length === 0) return { ok: false, reason: "no-profile-tags" };
  for (const tag of rawTags) {
    if (!TAG_SET.has(tag)) return { ok: false, reason: `unknown-profile-tag: "${tag}"` };
  }
  const profileTags = [...new Set(rawTags)] as ProfileTag[];

  const trip = input.trip;
  if (!trip || typeof trip !== "object" || typeof trip.staySlug !== "string") {
    return { ok: false, reason: "invalid-trip" };
  }
  const activitySlugs = Array.isArray(trip.activitySlugs) ? trip.activitySlugs : [];
  if (activitySlugs.length > 12) return { ok: false, reason: "too-many-activities" };
  if (activitySlugs.some((s) => typeof s !== "string")) {
    return { ok: false, reason: "invalid-activity-slugs" };
  }

  const bySlug = new Map(places.map((p) => [p.slug, p]));
  const stay = bySlug.get(trip.staySlug);
  if (!stay) return { ok: false, reason: `unknown-stay-slug: "${trip.staySlug}"` };
  if (stay.kind !== "stay") return { ok: false, reason: `not-a-stay: "${trip.staySlug}"` };

  const activities: PlaceRow[] = [];
  for (const slug of [...new Set(activitySlugs)]) {
    const activity = bySlug.get(slug);
    if (!activity) return { ok: false, reason: `unknown-activity-slug: "${slug}"` };
    if (activity.kind !== "activity") return { ok: false, reason: `not-an-activity: "${slug}"` };
    activities.push(activity);
  }

  const chosen = [stay, ...activities];
  const legs: TripLeg[] = [];
  const toVerify: VerifyItem[] = [];
  const pushVerify = (item: VerifyItem | undefined) => {
    if (!item) return;
    if (toVerify.some((v) => v.title === item.title)) return;
    if (toVerify.length >= 10) return;
    toVerify.push(item);
  };

  for (const place of chosen) {
    const lines: CheckLine[] = [];
    // Rules run in RULES order, so lines read consistently: entrances first,
    // then room/bathroom (stays), then venue, transport and contact.
    for (const rule of RULES) {
      if (!profileTags.includes(rule.tag)) continue;
      const { line, verify } = applyRule(rule, place);
      if (line && !lines.some((l) => l.text === line.text)) lines.push(line);
      if (line?.kind === "warn") pushVerify(verify);
    }
    if (!lines.length) {
      lines.push({
        kind: "info",
        text: "No profile-relevant detail recorded for this place yet — the sample dataset is still partial, so this leg is all still to verify.",
      });
    }
    const activityIndex = activities.indexOf(place);
    legs.push({
      icon: KIND_ICON[place.kind],
      title: place.name,
      subtitle:
        place.kind === "stay"
          ? `${place.neighborhood} · where you sleep`
          : `${place.neighborhood} · activity ${activityIndex + 1}`,
      lines,
    });
  }

  // "Getting around" closes the check, like the landing page's demo.
  const gettingAround = buildGettingAroundLeg(chosen, profileTags);
  const earlierTexts = new Set(legs.flatMap((l) => l.lines.map((x) => x.text)));
  gettingAround.leg.lines = gettingAround.leg.lines.filter((l) => !earlierTexts.has(l.text));
  if (gettingAround.leg.lines.length) {
    legs.push(gettingAround.leg);
    for (const item of gettingAround.verify) pushVerify(item);
  }

  return {
    ok: true,
    sample: true,
    notice: SAMPLE_NOTICE,
    trip: { staySlug: stay.slug, activitySlugs: activities.map((a) => a.slug) },
    profileTags,
    legs,
    toVerify,
    counts: {
      legs: legs.length,
      dataPoints: chosen.reduce((sum, p) => sum + p.fields.length, 0),
      toVerify: toVerify.length,
    },
  };
}

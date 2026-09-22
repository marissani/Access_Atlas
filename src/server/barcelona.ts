/**
 * Barcelona pilot — server functions (phase 1, data layer).
 *
 * Same shape as `src/server/waitlist.ts`: `createServerFn` handlers that open the
 * lazy `pg` pool through `src/db.ts`, return **JSON-safe primitives only**, and
 * map a missing/unusable `DATABASE_URL` to a typed `{ ok: false, reason }`
 * instead of throwing.
 *
 * Two functions, both safe to import into a client component (TanStack replaces
 * the server reference with a fetch call):
 *   • `getBarcelonaData()` — every place with its measured fields, grouped by
 *     category, plus the profile vocabulary the engine understands.
 *   • `runTripCheck({ profileTags, trip })` — the Trip Accessibility Check:
 *     applies the profile rules (see `src/server/trip-check.ts`) to real stored
 *     rows and returns legs + the verify-before-booking list.
 *
 * All pilot data is SAMPLE data (`sample = true` on every row; fictional place
 * names) and both responses carry `notice` so the UI can say so out loud.
 */
import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import {
  countBarcelonaRows,
  ensureBarcelonaData,
  loadBarcelonaPlaces,
  type AccessFieldRow,
  type PlaceRow,
} from "./barcelona-schema";
import type { FieldCategory } from "./barcelona-seed";
import {
  KNOWN_PROFILE_TAGS,
  runTripCheckOnPlaces,
  type TripCheckInput,
  type TripCheckResult,
} from "./trip-check";
import { SAMPLE_NOTICE } from "./barcelona-seed";

type Db = ReturnType<typeof sql>;

function openDb(): { db: Db } | { error: { ok: false; reason: "no-db" } } {
  try {
    return { db: sql() };
  } catch (err) {
    console.error("[barcelona] DATABASE_URL missing or unusable:", err);
    return { error: { ok: false, reason: "no-db" } };
  }
}

/** Serialise a place for the wire: JSON-safe primitives only. */
function serializePlace(place: PlaceRow) {
  const byCategory: Record<string, AccessFieldRow[]> = {};
  for (const field of place.fields) {
    (byCategory[field.category] ??= []).push(field);
  }
  return {
    id: String(place.id),
    slug: place.slug,
    kind: place.kind,
    name: place.name,
    neighborhood: place.neighborhood,
    address: place.address,
    summary: place.summary,
    sample: place.sample,
    fieldCount: place.fields.length,
    fields: place.fields,
    byCategory: byCategory as Record<string, AccessFieldRow[]>,
  };
}

export type BarcelonaData =
  | {
      ok: true;
      sample: true;
      notice: string;
      profileTags: readonly string[];
      vocabulary: { categories: FieldCategory[]; statuses: string[]; sources: string[] };
      counts: { places: number; stays: number; activities: number; fields: number; byStatus: Record<string, number> };
      places: ReturnType<typeof serializePlace>[];
    }
  | { ok: false; reason: "no-db" | "db-error" };

/** All Barcelona pilot places, with their fields grouped by category. */
export const getBarcelonaData = createServerFn({ method: "GET" }).handler(
  async (): Promise<BarcelonaData> => {
    const opened = openDb();
    if ("error" in opened) return opened.error;
    try {
      await ensureBarcelonaData(opened.db);
      const [places, counts] = await Promise.all([
        loadBarcelonaPlaces(opened.db),
        countBarcelonaRows(opened.db),
      ]);
      return {
        ok: true,
        sample: true,
        notice: SAMPLE_NOTICE,
        profileTags: KNOWN_PROFILE_TAGS,
        vocabulary: {
          categories: ["entrance", "room", "bathroom", "venue", "transport", "terrain", "contact"],
          statuses: ["measured", "estimated", "unknown", "not_applicable"],
          sources: ["business", "contributor", "public_info", "demo"],
        },
        counts,
        places: places.map(serializePlace),
      };
    } catch (err) {
      console.error("[barcelona] getBarcelonaData failed:", err);
      return { ok: false, reason: "db-error" };
    }
  },
);

/** The Trip Accessibility Check, evaluated against the stored rows. */
export const runTripCheck = createServerFn({ method: "POST" })
  .validator((input: TripCheckInput) => ({
    profileTags: Array.isArray(input?.profileTags) ? input.profileTags : [],
    trip: {
      staySlug: typeof input?.trip?.staySlug === "string" ? input.trip.staySlug : "",
      activitySlugs: Array.isArray(input?.trip?.activitySlugs) ? input.trip.activitySlugs : [],
    },
  }))
  .handler(async ({ data }): Promise<TripCheckResult | { ok: false; reason: "no-db" | "db-error" }> => {
    const opened = openDb();
    if ("error" in opened) return opened.error;
    try {
      await ensureBarcelonaData(opened.db);
      const places = await loadBarcelonaPlaces(opened.db);
      return runTripCheckOnPlaces(places, data);
    } catch (err) {
      console.error("[barcelona] runTripCheck failed:", err);
      return { ok: false, reason: "db-error" };
    }
  });

/**
 * Barcelona pilot — schema + idempotent sample seed (phase 1, data layer).
 *
 * This module is deliberately **plain functions** (no `createServerFn`, no `~/`
 * alias imports) so it can be driven directly from a throwaway verification
 * script under bun — see `/home/team/shared/scripts/verify-barcelona-pilot.ts`.
 * The server functions in `src/server/barcelona.ts` are thin wrappers over it.
 *
 * Idempotency (the whole point of this file):
 *   • `CREATE TABLE IF NOT EXISTS` for both tables;
 *   • places upserted `ON CONFLICT (slug) DO UPDATE`;
 *   • fields upserted `ON CONFLICT (place_id, category, field) DO UPDATE`;
 * so re-running seeds/updates in place and never duplicates a row.
 *
 * Both tables carry `sample BOOLEAN NOT NULL DEFAULT TRUE`: we have measured
 * nothing in Barcelona and every place name here is fictional, so the UI can
 * always render "prototype sample data — not yet field-verified".
 *
 * The seed itself is bulk-inserted through `jsonb_to_recordset` (one statement
 * for all places, one for all fields) because every `${…}` in the `sql()` tagged
 * template is a query parameter — literal DDL only, data as JSON.
 */
import type { Sql } from "../db";
import {
  SEED_FIELDS,
  SEED_PLACES,
  type FieldCategory,
  type FieldSource,
  type FieldStatus,
  type PlaceKind,
} from "./barcelona-seed";

export type AccessFieldRow = {
  category: FieldCategory;
  field: string;
  label: string;
  value: string;
  unit: string | null;
  status: FieldStatus;
  source: FieldSource;
  note: string | null;
};

export type PlaceRow = {
  id: string;
  slug: string;
  kind: PlaceKind;
  name: string;
  neighborhood: string;
  address: string;
  summary: string;
  sample: boolean;
  fields: AccessFieldRow[];
};

// Memoized per server process: tables + seed are ensured once on first use, not
// on every request. Reset on failure so a transient error retries next time.
let ensured: Promise<void> | null = null;

async function seed(db: Sql): Promise<void> {
  // ★ DDL stays as literal text INSIDE the tagged template. Every `${…}` in
  // `db\`…\`` is sent as a `$1`-style query parameter, so a `${DDL_STRING}`
  // (the obvious refactor) would arrive at Postgres as data and fail.
  await db`
    CREATE TABLE IF NOT EXISTS places (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('stay','activity')),
      name TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      address TEXT NOT NULL,
      summary TEXT NOT NULL,
      sample BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS access_fields (
      id BIGSERIAL PRIMARY KEY,
      place_id BIGINT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK (category IN ('entrance','room','bathroom','venue','transport','terrain','contact')),
      field TEXT NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      unit TEXT,
      status TEXT NOT NULL CHECK (status IN ('measured','estimated','unknown','not_applicable')),
      source TEXT NOT NULL CHECK (source IN ('business','contributor','public_info','demo')),
      note TEXT,
      sample BOOLEAN NOT NULL DEFAULT TRUE,
      modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (place_id, category, field)
    )
  `;

  // Places: one statement, upsert on the natural key `slug`.
  await db`
    INSERT INTO places (slug, kind, name, neighborhood, address, summary, sample)
    SELECT x.slug, x.kind, x.name, x.neighborhood, x.address, x.summary, TRUE
    FROM jsonb_to_recordset(${JSON.stringify(SEED_PLACES)}::jsonb)
      AS x(slug text, kind text, name text, neighborhood text, address text, summary text)
    ON CONFLICT (slug) DO UPDATE SET
      kind = EXCLUDED.kind,
      name = EXCLUDED.name,
      neighborhood = EXCLUDED.neighborhood,
      address = EXCLUDED.address,
      summary = EXCLUDED.summary,
      sample = TRUE
  `;

  // Fields: joined to `places` by slug, upserted on (place_id, category, field).
  await db`
    INSERT INTO access_fields (place_id, category, field, label, value, unit, status, source, note, sample)
    SELECT p.id, x.category, x.field, x.label, x.value, x.unit, x.status, x.source, x.note, TRUE
    FROM jsonb_to_recordset(${JSON.stringify(SEED_FIELDS)}::jsonb)
      AS x(slug text, category text, field text, label text, value text, unit text, status text, source text, note text)
    JOIN places p ON p.slug = x.slug
    ON CONFLICT (place_id, category, field) DO UPDATE SET
      label = EXCLUDED.label,
      value = EXCLUDED.value,
      unit = EXCLUDED.unit,
      status = EXCLUDED.status,
      source = EXCLUDED.source,
      note = EXCLUDED.note,
      sample = TRUE,
      modified_at = now()
  `;
}

/** Create the tables and apply the sample seed, once per process. Idempotent. */
export function ensureBarcelonaData(db: Sql): Promise<void> {
  if (!ensured) {
    ensured = seed(db).catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}

type JoinedRow = {
  id: string;
  slug: string;
  kind: PlaceKind;
  name: string;
  neighborhood: string;
  address: string;
  summary: string;
  sample: boolean;
  category: FieldCategory | null;
  field: string | null;
  label: string | null;
  value: string | null;
  unit: string | null;
  status: FieldStatus | null;
  source: FieldSource | null;
  note: string | null;
};

/** All places with their fields, ordered stably by insertion order. */
export async function loadBarcelonaPlaces(db: Sql): Promise<PlaceRow[]> {
  const rows = (await db`
    SELECT
      p.id::text AS id, p.slug, p.kind, p.name, p.neighborhood, p.address, p.summary, p.sample,
      f.category, f.field, f.label, f.value, f.unit, f.status, f.source, f.note
    FROM places p
    LEFT JOIN access_fields f ON f.place_id = p.id
    ORDER BY p.id, f.id
  `) as unknown as JoinedRow[];

  const bySlug = new Map<string, PlaceRow>();
  for (const r of rows) {
    let place = bySlug.get(r.slug);
    if (!place) {
      place = {
        id: String(r.id),
        slug: r.slug,
        kind: r.kind,
        name: r.name,
        neighborhood: r.neighborhood,
        address: r.address,
        summary: r.summary,
        sample: Boolean(r.sample),
        fields: [],
      };
      bySlug.set(r.slug, place);
    }
    if (r.category && r.field && r.label !== null) {
      place.fields.push({
        category: r.category,
        field: r.field,
        label: r.label,
        value: r.value ?? "",
        unit: r.unit ?? null,
        status: r.status ?? "unknown",
        source: r.source ?? "demo",
        note: r.note ?? null,
      });
    }
  }
  return [...bySlug.values()];
}

/** Row counts, for verification. */
export async function countBarcelonaRows(
  db: Sql,
): Promise<{ places: number; stays: number; activities: number; fields: number; byStatus: Record<string, number> }> {
  const [places, fields, statuses] = await Promise.all([
    db`SELECT kind, count(*)::text AS n FROM places GROUP BY kind` as unknown as Promise<{ kind: PlaceKind; n: string }[]>,
    db`SELECT count(*)::text AS n FROM access_fields` as unknown as Promise<{ n: string }[]>,
    db`SELECT status, count(*)::text AS n FROM access_fields GROUP BY status ORDER BY status` as unknown as Promise<
      { status: string; n: string }[]
    >,
  ]);
  const countOf = (kind: PlaceKind) =>
    Number(places.find((p) => p.kind === kind)?.n ?? 0);
  return {
    places: Number(places.reduce((sum, p) => sum + Number(p.n), 0)),
    stays: countOf("stay"),
    activities: countOf("activity"),
    fields: Number(fields[0]?.n ?? 0),
    byStatus: Object.fromEntries(statuses.map((s) => [s.status, Number(s.n)])),
  };
}

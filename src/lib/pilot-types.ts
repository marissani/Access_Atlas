/**
 * Type-only views of the two Barcelona pilot server functions.
 *
 * `import type` is erased at build time (tsconfig has `verbatimModuleSyntax`),
 * so nothing in `src/server/**` — and therefore no database code — can end up
 * in a client bundle through these aliases. The shapes are derived from the
 * server functions themselves so the UI cannot drift from them.
 */
import type { BarcelonaData, getBarcelonaData, runTripCheck } from "~/server/barcelona";

export type BarcelonaSuccess = Extract<BarcelonaData, { ok: true }>;
export type BarcelonaFailure = Extract<BarcelonaData, { ok: false }>;
export type BarcelonaPlace = BarcelonaSuccess["places"][number];
export type BarcelonaField = BarcelonaPlace["fields"][number];
export type FieldCategoryKey = keyof BarcelonaPlace["byCategory"] & string;

export type PilotDataResult = Awaited<ReturnType<typeof getBarcelonaData>>;
export type TripCheckOutcome = Awaited<ReturnType<typeof runTripCheck>>;
export type TripCheckSuccess = Extract<TripCheckOutcome, { ok: true }>;
export type TripCheckFailure = Extract<TripCheckOutcome, { ok: false }>;
export type TripLegView = TripCheckSuccess["legs"][number];
export type VerifyItemView = TripCheckSuccess["toVerify"][number];
export type CheckLineView = TripLegView["lines"][number];

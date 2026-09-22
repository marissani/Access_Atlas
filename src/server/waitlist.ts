import { createServerFn } from "@tanstack/react-start";

import { sql } from "~/db";

/**
 * Waitlist signup.
 *
 * Creates the table on first use, inserts the email, and never errors on
 * duplicates. Designed to work the moment the owner's DATABASE_URL secret
 * arrives: the `sql` helper is a lazy `pg` (node-postgres) Pool over TCP/TLS
 * (Tiger Cloud — plain Postgres), so nothing connects at module load and a
 * missing or unusable secret surfaces as a clear error here (and the form shows
 * its error state) instead of crashing the page or the build.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistResult =
  | { ok: true; added: boolean }
  | { ok: false; reason: "invalid" | "no-db" | "db-error" };

// Memoized per server process: the table is ensured once on first use, not on
// every signup. Reset on failure so a transient error retries next time.
// Note: the DDL must stay as literal text inside the tagged template — an
// interpolation (`${...}`) would be sent as a query parameter, not as SQL.
let tableEnsured: Promise<void> | null = null;

function ensureTable(db: ReturnType<typeof sql>) {
  if (!tableEnsured) {
    tableEnsured = db`
      CREATE TABLE IF NOT EXISTS waitlist (
        id BIGSERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
      .then(() => undefined)
      .catch((err) => {
        tableEnsured = null;
        throw err;
      });
  }
  return tableEnsured;
}

export const addToWaitlist = createServerFn({ method: "POST" })
  .validator((email: string) => email.trim().toLowerCase())
  .handler(async ({ data: email }): Promise<WaitlistResult> => {
    // Server-side validation — never trust the client.
    if (!EMAIL_RE.test(email)) {
      return { ok: false, reason: "invalid" };
    }

    let db: ReturnType<typeof sql>;
    try {
      db = sql();
    } catch (err) {
      console.error("[waitlist] DATABASE_URL missing:", err);
      return { ok: false, reason: "no-db" };
    }

    try {
      await ensureTable(db);
      // ON CONFLICT DO NOTHING + RETURNING: a row comes back only when the
      // email was newly inserted; zero rows means it was already on the list.
      const rows = await db`
        INSERT INTO waitlist (email)
        VALUES (${email})
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;
      return { ok: true, added: rows.length > 0 };
    } catch (err) {
      console.error("[waitlist] insert failed:", err);
      return { ok: false, reason: "db-error" };
    }
  });
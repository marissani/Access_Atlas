import { Pool, type QueryResultRow } from "pg";

/**
 * Server-only handle to the team's database.
 *
 * The database is **plain Postgres over TCP/TLS** (Tiger Cloud / TigerData), so
 * this uses `pg` (node-postgres) — NOT `@neondatabase/serverless`, whose HTTP
 * mode only speaks Neon's protocol and cannot connect here.
 *
 * The connection string comes from `DATABASE_URL`, which the owner connects via
 * the database card and which is injected into the sandbox and passed to the
 * live host on publish. Shape (Tiger Cloud):
 *
 *   postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require
 *
 * Everything is resolved **lazily, per call** — no Pool is constructed at module
 * load — so the site still builds and serves before a database is connected: the
 * error only surfaces if a query actually runs without a usable `DATABASE_URL`.
 *
 * Use it only inside a `createServerFn()` handler or an `src/routes/api/*` route
 * (never client code):
 *
 *   const getPosts = createServerFn().handler(async () => {
 *     const rows = await sql()`select id, title, created_at from posts`;
 *     // Coerce non-primitive columns (timestamps come back as JS Dates) to
 *     // strings before returning to the client, or React will refuse to render:
 *     return rows.map((r) => ({ ...r, created_at: String(r.created_at) }));
 *   });
 */

/** Thrown when no database is connected yet — the waitlist form turns this into its honest error state. */
export const MISSING_DATABASE_URL_MESSAGE =
  "DATABASE_URL is not set — connect a database (via the database card) before running queries.";

/**
 * A usable connection string is a `postgres://` / `postgresql://` URL (or a
 * libpq keyword string). Anything else — e.g. a bare service id pasted into the
 * secret — is rejected up front with a clear message instead of a connection
 * timeout that looks like an outage.
 */
function isConnectionString(value: string): boolean {
  return /^postgres(ql)?:\/\//i.test(value) || /(^|\s)(host|hostaddr|service)=/i.test(value);
}

/**
 * Drop the `sslmode` query parameter from a connection string before handing it
 * to `pg`.
 *
 * Why: `pg`'s connection-string parser turns any `sslmode`/`sslcert`/… parameter
 * into `ssl: {}`, and `ConnectionParameters` then does
 * `Object.assign({}, config, parse(config.connectionString))` — i.e. the parsed
 * value **overrides** the `ssl` option passed to the `Pool`. So passing
 * `ssl: { rejectUnauthorized: false }` alongside a `?sslmode=require` URL is
 * silently ignored (pg 8.23 then treats `require` as `verify-full` and prints a
 * deprecation warning). Removing the parameter is what actually lets our
 * explicit TLS settings take effect.
 *
 * Only the query separator and `sslmode`/`uselibpqcompat` are touched: the rest
 * of the string is preserved byte-for-byte, so no credentials are re-encoded.
 */
const SSL_PARAMS_TO_DROP = new Set(["sslmode", "uselibpqcompat"]);

function connectionStringFor(url: string): string {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return url;
  const base = url.slice(0, queryStart);
  const kept = url
    .slice(queryStart + 1)
    .split("&")
    .filter((pair) => !SSL_PARAMS_TO_DROP.has(pair.split("=")[0].toLowerCase()));
  return kept.length > 0 ? `${base}?${kept.join("&")}` : base;
}

let pool: Pool | undefined;

/**
 * The lazy `pg` Pool. Created on first successful call, reused for the life of
 * the process (the live site restarts whenever the owner changes a secret, so
 * there is no need to re-read `DATABASE_URL` per query).
 */
export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(MISSING_DATABASE_URL_MESSAGE);
  }
  if (!isConnectionString(url)) {
    throw new Error(
      "DATABASE_URL is not a Postgres connection string — reconnect the database (via the database card) before running queries.",
    );
  }
  if (!pool) {
    pool = new Pool({
      connectionString: connectionStringFor(url),
      // Tiger Cloud requires TLS. Its certificate *is* chain-verified from this
      // sandbox, but verification is relaxed here so a rotated cert or a leaner
      // CA store on the live host cannot turn an otherwise working database
      // connection into a hard failure. The connection stays encrypted; it is
      // just not certificate-pinned. (See connectionStringFor above: `sslmode`
      // must be stripped or this option is ignored.)
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    // An idle client erroring must not take down the server process.
    pool.on("error", (err) => console.error("[db] idle client error:", err));
  }
  return pool;
}

/** Tagged-template query helper: resolves to the array of rows. */
export type Sql = <T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T[]>;

/**
 * Tagged-template query helper with the same ergonomics as before, backed by the
 * `pg` Pool: `await sql()`select * from t where id = ${id}``.
 *
 * Every `${value}` is interpolated as a **`$1`-style query parameter** — never
 * as raw SQL. DDL (e.g. `CREATE TABLE`) must therefore stay as literal text
 * inside the template; a `${variable}` would be sent as a parameter and the
 * statement would fail.
 *
 * Resolves to `rows` directly (not the full `pg` QueryResult) so call sites read
 * `const rows = await db\`…\`` and `rows.length`.
 */
export const sql = (): Sql => {
  const client = getPool();
  return async (strings, ...values) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) {
      text += `$${i + 1}` + strings[i + 1];
    }
    const result = await client.query(text, values);
    return result.rows;
  };
};

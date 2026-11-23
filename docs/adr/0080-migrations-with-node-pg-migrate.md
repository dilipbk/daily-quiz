# 0080. Migrations run from the API image with node-pg-migrate on `pg`, under their own connection

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-23 |
| **Ticket** | `FND-07a` |
| **Requirements** | Roadmap §3.1 (Data access, Jobs and schedules), §7 (Data, queries and concurrency; Security and privacy), SEC-01; ADR 0051, 0053, 0054, 0055 |

## Context

Roadmap §7 asks for migrations that are expand, migrate, contract, with indexes built concurrently, and for an application role that can't alter the schema. Roadmap §3.1 and ADR 0054 choose Drizzle as the query builder only. No document names a migration tool, a Postgres driver or a Postgres version. This ADR fills that gap and supersedes nothing. ADR 0054's "move to 1.0 before the first production migration" is about the builder's version, not about how migrations run.

Postgres refuses `CREATE INDEX CONCURRENTLY` inside a transaction. Checked on 2026-11-23:

- **Drizzle's migrator** (drizzle-orm 0.45.4, `pg-core/dialect.ts`) runs all pending migrations in one transaction, lets no migration opt out and takes no lock. 1.0.0-rc.6 is the same, and its notes removed `.concurrently()` from indexes for that reason; issues #860 and #874 are open.
- **node-pg-migrate 9.0.0** (2026-07-17) lets a JavaScript or TypeScript migration opt out with `pgm.noTransaction()`. It takes a session-level advisory lock, checks the order of applied migrations, and accepts a connected `pg` client. A plain `.sql` file can opt out only from 10.0 (alpha).
- **pg-boss** 12.39.0 depends on `pg ^8.23.1`, and Drizzle supports `node-postgres`.
- **Neon's pooled endpoint** (PgBouncer, transaction mode) doesn't support session-level advisory locks. Neon's default major for new projects is Postgres 18, and Postgres 19.0 was released 2026-11-19.

## Decision

1. **Runner and driver.** `migrate` (`node apps/api/src/main.ts migrate`, ADR 0079) runs node-pg-migrate 9 on `pg` 8, the one Postgres driver for the API, Drizzle and pg-boss. It applies `apps/api/migrations`, which holds no product schema until BE-02. The history table is `public.pgmigrations`.
2. **Migration files.** Migrations are `.sql` files with `-- Up Migration` and `-- Down Migration` sections. One that builds an index concurrently is a `.ts` file calling `pgm.noTransaction()`, alone in its migration.
3. **Settings, passed explicitly** (the tool's docs and source disagree on one default):
   - `singleTransaction: true`: a run's migrations commit together, except that a `noTransaction` migration commits those before it and runs on its own;
   - `checkOrder: true`;
   - `advisoryLockMode: 'fail'`: a second run while one holds the lock exits non-zero and changes nothing.
4. **Connection.** It reads only `MIGRATION_DATABASE_URL`, never `DATABASE_URL`, so it can run as a role of its own. It connects with a 10 s timeout. It exits 0 when the database is up to date and 1 otherwise, and nothing it prints contains the connection string. TLS follows the URL's `sslmode`.
5. **Local and CI** run Postgres 18.7 (`postgres:18.7-trixie`, pinned by digest).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Drizzle's migrator or `drizzle-kit migrate` | One transaction for all, no opt-out, no lock: indexes can't be built concurrently. `drizzle-kit generate` can still draft SQL for a migration. |
| Graphile Migrate | Per-file `--! no-transaction` and a lock, but its stable line dates from 2022 and 2.0 is a release candidate. |
| dbmate, Atlas | A Go binary beside Node in the image; dbmate's lock is opt-in; Atlas's community build lacks views and functions. |
| Flyway | A Java runtime in the image. |
| postgres-shift, umzug | postgres.js only, or no transactions and no lock built in. |
| A runner of our own | About 100 lines that every schema change would trust, with no one else using them. |
| `postgres` (postgres.js) as the driver | pg-boss depends on `pg`, so it would be a second driver. |
| Postgres 19 | Days old, and not Neon's default. |

## Consequences

- **BE-02:**
  - adds `DATABASE_URL` for the application's role and gives `MIGRATION_DATABASE_URL` the migration role, so the application can't alter the schema (roadmap §7);
  - can put pg-boss's schema in a migration (ADR 0055);
  - replaces the root Vitest include with the API's own project on real Postgres (ADR 0065).
- **FND-07b:**
  - runs `migrate` as Fly's `release_command`, which keeps the ENTRYPOINT;
  - uses Neon's direct, non-pooler string with `sslmode=verify-full` (pg 8 treats `require` as `verify-full` today, with a warning), because the advisory lock and concurrent index builds need a session;
  - keeps releases in sequence with a workflow concurrency group, since overlapping runs fail rather than wait.
- Postgres leaves an invalid index behind when a concurrent build fails. node-pg-migrate writes the history row only after the statement succeeds (read in its source, not tested here), so the next run retries the migration. A concurrent-index migration therefore starts with `DROP INDEX CONCURRENTLY IF EXISTS` for its index.
- The smoke script proves on every pull request:
  - a halfway failure leaves nothing;
  - a concurrent index builds valid;
  - a second run at the same time is refused;
  - a repeat run changes nothing;
  - an unreachable database exits non-zero.
- `pg` 9 will need a node-pg-migrate release that accepts it (its peer range is `<9`). Revisit when node-pg-migrate 10 is stable (`-- noTransaction` in `.sql`), or if Drizzle's migrator gains per-migration transactions and a lock.

import type { MigrationBuilder } from 'node-pg-migrate';

// Roadmap §7 builds indexes concurrently, which Postgres refuses inside a transaction. In
// node-pg-migrate 9 only a JavaScript or TypeScript migration can opt out of one (ADR 0080).
export function up(pgm: MigrationBuilder): void {
  pgm.noTransaction();
  pgm.createIndex('smoke_sample', 'label', { name: 'smoke_sample_label', concurrently: true });
}

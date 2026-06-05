import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hard no-duplicate-guest constraint: within an event, no two guests may share
 * ANY (first name x last name) combination.
 *
 * Mechanism: guest_name_pairs materializes every normalized combination per
 * guest; its composite PRIMARY KEY (event_id, first_norm, last_norm) IS the
 * constraint — enforced by Postgres, atomic under concurrency.
 *
 * Normalization lives in ONE place: the guest_name_norm() SQL function
 * (unicode-trim + NFKC + lower), used by the insert path, the pre-check and
 * this backfill — never reimplemented in JS (NBSP / NFC-vs-NFD / case-fold
 * divergences between JS and Postgres would silently bypass the constraint).
 *
 * Pre-existing duplicate guests are grandfathered: the backfill keeps one
 * pairs row per combination (ON CONFLICT DO NOTHING) and logs what it found.
 * Legacy guests without a last name get last_norm = '' (new guests must have
 * at least one last name — enforced in the API).
 */
export class AddGuestNamePairs1780620000000 implements MigrationInterface {
  name = 'AddGuestNamePairs1780620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // \s in Postgres regex does not cover NBSP/zero-width chars — list them.
    const ws = '\\s\u00A0\u200B\uFEFF'; // space class + NBSP + zero-width + BOM
    const trimPattern = `^[${ws}]+|[${ws}]+$`;
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION guest_name_norm(value text) RETURNS text
      LANGUAGE sql IMMUTABLE STRICT
      RETURN lower(normalize(regexp_replace(value, '${trimPattern}', '', 'g'), NFKC))
    `);

    // Composite FK target so a pairs row can never reference a guest from
    // another event.
    await queryRunner.query(
      `ALTER TABLE "guests" ADD CONSTRAINT "UQ_guests_event_id_id" UNIQUE ("event_id", "id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "guest_name_pairs" (
        "event_id"   uuid NOT NULL,
        "first_norm" text NOT NULL,
        "last_norm"  text NOT NULL,
        "guest_id"   uuid NOT NULL,
        CONSTRAINT "PK_guest_name_pairs" PRIMARY KEY ("event_id", "first_norm", "last_norm"),
        CONSTRAINT "FK_guest_name_pairs_guest" FOREIGN KEY ("event_id", "guest_id")
          REFERENCES "guests" ("event_id", "id") ON DELETE CASCADE
      )
    `);

    // Report pre-existing duplicates before grandfathering them.
    const dups: { event_id: string; first_norm: string; last_norm: string; guests: string }[] =
      await queryRunner.query(`
        SELECT g.event_id, guest_name_norm(f.value) AS first_norm,
               COALESCE(guest_name_norm(l.value), '') AS last_norm,
               count(DISTINCT g.id)::text AS guests
        FROM guests g
        JOIN guest_names f ON f.guest_id = g.id AND f.kind = 'first'
        LEFT JOIN guest_names l ON l.guest_id = g.id AND l.kind = 'last'
        GROUP BY 1, 2, 3
        HAVING count(DISTINCT g.id) > 1
      `);
    if (dups.length > 0) {
      console.warn(
        `[AddGuestNamePairs] GRANDFATHERED ${dups.length} duplicate name combination(s) — ` +
          `these existing guests keep coexisting, but the names stay claimed:`,
        dups,
      );
    }

    await queryRunner.query(`
      INSERT INTO "guest_name_pairs" ("event_id", "first_norm", "last_norm", "guest_id")
      SELECT DISTINCT ON (g.event_id, guest_name_norm(f.value), COALESCE(guest_name_norm(l.value), ''))
             g.event_id, guest_name_norm(f.value), COALESCE(guest_name_norm(l.value), ''), g.id
      FROM guests g
      JOIN guest_names f ON f.guest_id = g.id AND f.kind = 'first'
      LEFT JOIN guest_names l ON l.guest_id = g.id AND l.kind = 'last'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "guest_name_pairs"`);
    await queryRunner.query(`ALTER TABLE "guests" DROP CONSTRAINT "UQ_guests_event_id_id"`);
    await queryRunner.query(`DROP FUNCTION guest_name_norm(text)`);
  }
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * One row per normalized (first x last) name combination per guest.
 * The composite primary key (event_id, first_norm, last_norm) IS the hard
 * "no duplicate guests" constraint.
 *
 * synchronize:false — this table is migration-managed only (composite FK and
 * the guest_name_norm() SQL function aren't expressible as entity metadata,
 * and local DATABASE_SYNC must not fight the migration).
 */
@Entity({ name: 'guest_name_pairs', synchronize: false })
export class GuestNamePair {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @PrimaryColumn({ name: 'first_norm', type: 'text' })
  firstNorm!: string;

  @PrimaryColumn({ name: 'last_norm', type: 'text' })
  lastNorm!: string;

  @Column({ name: 'guest_id', type: 'uuid' })
  guestId!: string;
}

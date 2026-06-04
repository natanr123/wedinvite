import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Guest } from './guest.entity';

@Entity('relations')
export class Relation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column({ name: 'guest_a_id', type: 'uuid' })
  guestAId!: string;

  @ManyToOne(() => Guest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_a_id' })
  guestA!: Guest;

  @Column({ name: 'guest_b_id', type: 'uuid' })
  guestBId!: string;

  @ManyToOne(() => Guest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_b_id' })
  guestB!: Guest;

  /** Denormalized type label, e.g. "Sister", "Friend", or a custom label. */
  @Column({ name: 'type_label', type: 'text' })
  typeLabel!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

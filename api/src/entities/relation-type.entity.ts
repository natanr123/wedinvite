import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Event } from './event.entity';

/**
 * User-defined relation types, scoped to an event.
 * Built-in presets are not stored here — see relations/presets.ts.
 */
@Entity('relation_types')
@Unique(['eventId', 'label'])
export class RelationType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event!: Event;

  @Column('text')
  label!: string;
}

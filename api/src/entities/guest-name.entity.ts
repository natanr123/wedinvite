import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Guest } from './guest.entity';

export type NameKind = 'first' | 'last';

@Entity('guest_names')
export class GuestName {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'guest_id', type: 'uuid' })
  guestId!: string;

  @ManyToOne(() => Guest, (guest) => guest.names, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_id' })
  guest!: Guest;

  /** 'first' or 'last' */
  @Column({ type: 'text' })
  kind!: NameKind;

  @Column('text')
  value!: string;

  /** Ordering within the kind; position 0 is the primary display name. */
  @Column({ type: 'int', default: 0 })
  position!: number;
}

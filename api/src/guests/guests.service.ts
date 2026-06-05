import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { GuestName, NameKind } from '../entities/guest-name.entity';
import { Guest } from '../entities/guest.entity';
import { EventsService } from '../events/events.service';
import { CreateGuestDto } from './dto/create-guest.dto';

/** Trim, drop empties and case-insensitive duplicates, preserving order. */
function cleanNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code ===
      '23505'
  );
}

/**
 * Materializes every normalized (first x last) combination of the guest.
 * The composite PK on guest_name_pairs is the hard "no duplicate guests"
 * constraint; guest_name_norm() (SQL) is the single normalization authority —
 * JS never computes norms.
 */
const INSERT_PAIRS = `
  INSERT INTO guest_name_pairs (event_id, first_norm, last_norm, guest_id)
  SELECT DISTINCT $1::uuid, guest_name_norm(f.value), guest_name_norm(l.value), $2::uuid
  FROM guest_names f, guest_names l
  WHERE f.guest_id = $2 AND f.kind = 'first'
    AND l.guest_id = $2 AND l.kind = 'last'
`;

/**
 * Finds a guest already claiming any of the proposed name combinations,
 * optionally ignoring one guest (the one being edited).
 */
const FIND_CONFLICT = `
  SELECT p.guest_id AS "guestId"
  FROM guest_name_pairs p
  WHERE p.event_id = $1::uuid
    AND ($4::uuid IS NULL OR p.guest_id <> $4::uuid)
    AND (p.first_norm, p.last_norm) IN (
      SELECT guest_name_norm(f), guest_name_norm(l)
      FROM unnest($2::text[]) AS f, unnest($3::text[]) AS l
    )
  LIMIT 1
`;

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest)
    private readonly guests: Repository<Guest>,
    private readonly eventsService: EventsService,
  ) {}

  async create(eventId: string, dto: CreateGuestDto): Promise<Guest> {
    await this.eventsService.ensureExists(eventId);
    const { firstNames, lastNames } = this.validateNames(dto);

    // Friendly pre-check; the pairs PK below is the race-proof authority.
    await this.throwIfConflicting(eventId, firstNames, lastNames);

    try {
      return await this.guests.manager.transaction(async (manager) => {
        const guest = await manager.getRepository(Guest).save(
          manager.getRepository(Guest).create({
            eventId,
            phone: dto.phone?.trim() || null,
            address: dto.address?.trim() || null,
            names: this.buildNames(firstNames, lastNames),
          }),
        );
        await manager.query(INSERT_PAIRS, [eventId, guest.id]);
        return guest;
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        // Lost a race — re-query to name the winner in the error message.
        await this.throwIfConflicting(eventId, firstNames, lastNames);
      }
      throw err;
    }
  }

  /** Full replacement: names, phone and address are all set from the dto. */
  async update(eventId: string, id: string, dto: CreateGuestDto): Promise<Guest> {
    const existing = await this.guests.findOne({ where: { id, eventId } });
    if (!existing) {
      throw new NotFoundException(`Guest ${id} not found in event ${eventId}`);
    }
    const { firstNames, lastNames } = this.validateNames(dto);

    // Friendly pre-check, ignoring the guest's own claimed combinations.
    await this.throwIfConflicting(eventId, firstNames, lastNames, id);

    try {
      return await this.guests.manager.transaction(async (manager) => {
        await manager.getRepository(GuestName).delete({ guestId: id });
        await manager.query('DELETE FROM guest_name_pairs WHERE guest_id = $1', [id]);
        await manager.getRepository(Guest).save({
          id,
          phone: dto.phone?.trim() || null,
          address: dto.address?.trim() || null,
        });
        await manager
          .getRepository(GuestName)
          .insert(this.buildNames(firstNames, lastNames).map((n) => ({ ...n, guestId: id })));
        await manager.query(INSERT_PAIRS, [eventId, id]);
        return manager.getRepository(Guest).findOneOrFail({
          where: { id },
          relations: { names: true },
          order: { names: { kind: 'ASC', position: 'ASC' } },
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        await this.throwIfConflicting(eventId, firstNames, lastNames, id);
      }
      throw err;
    }
  }

  private validateNames(dto: CreateGuestDto): {
    firstNames: string[];
    lastNames: string[];
  } {
    const firstNames = cleanNames(dto.firstNames);
    const lastNames = cleanNames(dto.lastNames);
    if (firstNames.length === 0) {
      throw new BadRequestException('At least one first name is required');
    }
    if (lastNames.length === 0) {
      throw new BadRequestException('At least one last name is required');
    }
    return { firstNames, lastNames };
  }

  private buildNames(firstNames: string[], lastNames: string[]): GuestName[] {
    const toNames = (values: string[], kind: NameKind) =>
      values.map((value, position) => ({ kind, value, position }) as GuestName);
    return [...toNames(firstNames, 'first'), ...toNames(lastNames, 'last')];
  }

  /** Throws 409 naming the existing guest when any name combination is taken. */
  private async throwIfConflicting(
    eventId: string,
    firstNames: string[],
    lastNames: string[],
    excludeGuestId: string | null = null,
  ): Promise<void> {
    const rows: { guestId: string }[] = await this.guests.query(FIND_CONFLICT, [
      eventId,
      firstNames,
      lastNames,
      excludeGuestId,
    ]);
    if (rows.length === 0) return;

    const existing = await this.guests.findOne({
      where: { id: rows[0].guestId },
      relations: { names: true },
    });
    const display = existing
      ? [
          existing.names
            .filter((n) => n.kind === 'first')
            .sort((a, b) => a.position - b.position)[0]?.value,
          existing.names
            .filter((n) => n.kind === 'last')
            .sort((a, b) => a.position - b.position)[0]?.value,
        ]
          .filter(Boolean)
          .join(' ')
      : 'another guest';

    throw new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: `A guest named "${display}" is already on this list (name combinations must be unique)`,
      conflictingGuestId: rows[0].guestId,
      conflictingGuestName: display,
    });
  }

  async findAll(eventId: string): Promise<Guest[]> {
    await this.eventsService.ensureExists(eventId);
    return this.guests.find({
      where: { eventId },
      relations: { names: true },
      order: { createdAt: 'ASC', names: { kind: 'ASC', position: 'ASC' } },
    });
  }

  async remove(eventId: string, id: string): Promise<void> {
    const result = await this.guests.delete({ id, eventId });
    if (!result.affected) {
      throw new NotFoundException(`Guest ${id} not found in event ${eventId}`);
    }
  }
}

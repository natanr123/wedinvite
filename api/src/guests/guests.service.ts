import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest)
    private readonly guests: Repository<Guest>,
    private readonly eventsService: EventsService,
  ) {}

  async create(eventId: string, dto: CreateGuestDto): Promise<Guest> {
    await this.eventsService.ensureExists(eventId);

    const firstNames = cleanNames(dto.firstNames);
    const lastNames = cleanNames(dto.lastNames ?? []);
    if (firstNames.length === 0) {
      throw new BadRequestException('At least one first name is required');
    }

    const toNames = (values: string[], kind: NameKind) =>
      values.map((value, position) => ({ kind, value, position }) as GuestName);

    const guest = this.guests.create({
      eventId,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      names: [...toNames(firstNames, 'first'), ...toNames(lastNames, 'last')],
    });
    return this.guests.save(guest);
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

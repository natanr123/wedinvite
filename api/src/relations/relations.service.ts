import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { RelationType } from '../entities/relation-type.entity';
import { Relation } from '../entities/relation.entity';
import { Guest } from '../entities/guest.entity';
import { EventsService } from '../events/events.service';
import { CreateRelationDto } from './dto/create-relation.dto';
import { isPresetType, PRESET_CONNECTION_TYPES } from './presets';

export interface RelationTypesResponse {
  presets: string[];
  custom: string[];
}

@Injectable()
export class RelationsService {
  constructor(
    @InjectRepository(Relation)
    private readonly relations: Repository<Relation>,
    @InjectRepository(RelationType)
    private readonly relationTypes: Repository<RelationType>,
    @InjectRepository(Guest)
    private readonly guests: Repository<Guest>,
    private readonly eventsService: EventsService,
  ) {}

  async listTypes(eventId: string): Promise<RelationTypesResponse> {
    await this.eventsService.ensureExists(eventId);
    const custom = await this.relationTypes.find({
      where: { eventId },
      order: { label: 'ASC' },
    });
    return {
      presets: [...PRESET_CONNECTION_TYPES],
      custom: custom.map((t) => t.label).filter((label) => !isPresetType(label)),
    };
  }

  /**
   * Registers a custom relation type for the event. Idempotent: presets and
   * already-registered labels (case-insensitive) return the canonical label.
   */
  async addType(eventId: string, rawLabel: string): Promise<{ label: string }> {
    await this.eventsService.ensureExists(eventId);
    const label = rawLabel.trim();
    if (!label) {
      throw new BadRequestException('Relation type label must not be empty');
    }

    const preset = PRESET_CONNECTION_TYPES.find(
      (p) => p.toLowerCase() === label.toLowerCase(),
    );
    if (preset) {
      return { label: preset };
    }

    const existing = await this.findCustomType(eventId, label);
    if (existing) {
      return { label: existing.label };
    }

    try {
      await this.relationTypes.save(this.relationTypes.create({ eventId, label }));
    } catch (err) {
      // A concurrent request registered the same label between our check and
      // insert (unique constraint, Postgres 23505) — reuse the winner's label.
      const code = (err as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code;
      if (err instanceof QueryFailedError && code === '23505') {
        const winner = await this.findCustomType(eventId, label);
        if (winner) return { label: winner.label };
      }
      throw err;
    }
    return { label };
  }

  private findCustomType(eventId: string, label: string): Promise<RelationType | null> {
    return this.relationTypes
      .createQueryBuilder('type')
      .where('type.event_id = :eventId', { eventId })
      .andWhere('LOWER(type.label) = LOWER(:label)', { label })
      .getOne();
  }

  async create(eventId: string, dto: CreateRelationDto): Promise<Relation> {
    await this.eventsService.ensureExists(eventId);

    if (dto.guestAId === dto.guestBId) {
      throw new BadRequestException('Cannot connect a guest to themselves');
    }

    const guests = await this.guests.find({
      where: { id: In([dto.guestAId, dto.guestBId]), eventId },
    });
    if (guests.length !== 2) {
      throw new BadRequestException('Both guests must belong to this event');
    }

    const { label } = await this.addType(eventId, dto.typeLabel);

    const duplicate = await this.relations
      .createQueryBuilder('relation')
      .where('relation.event_id = :eventId', { eventId })
      .andWhere(
        '((relation.guest_a_id = :a AND relation.guest_b_id = :b) OR (relation.guest_a_id = :b AND relation.guest_b_id = :a))',
        { a: dto.guestAId, b: dto.guestBId },
      )
      .andWhere('LOWER(relation.type_label) = LOWER(:label)', { label })
      .getOne();
    if (duplicate) {
      throw new ConflictException('This relation already exists');
    }

    const saved = await this.relations.save(
      this.relations.create({
        eventId,
        guestAId: dto.guestAId,
        guestBId: dto.guestBId,
        typeLabel: label,
      }),
    );
    return this.findOne(eventId, saved.id);
  }

  async findAll(eventId: string): Promise<Relation[]> {
    await this.eventsService.ensureExists(eventId);
    return this.relations.find({
      where: { eventId },
      relations: { guestA: { names: true }, guestB: { names: true } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(eventId: string, id: string): Promise<Relation> {
    const relation = await this.relations.findOne({
      where: { id, eventId },
      relations: { guestA: { names: true }, guestB: { names: true } },
    });
    if (!relation) {
      throw new NotFoundException(`Relation ${id} not found in event ${eventId}`);
    }
    return relation;
  }

  async remove(eventId: string, id: string): Promise<void> {
    const result = await this.relations.delete({ id, eventId });
    if (!result.affected) {
      throw new NotFoundException(`Relation ${id} not found in event ${eventId}`);
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
  ) {}

  create(dto: CreateEventDto): Promise<Event> {
    const event = this.events.create({
      title: dto.title.trim(),
      eventDate: dto.eventDate ?? null,
    });
    return this.events.save(event);
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return event;
  }

  /** Throws NotFoundException when the event does not exist. */
  async ensureExists(id: string): Promise<void> {
    const exists = await this.events.exists({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Event ${id} not found`);
    }
  }
}

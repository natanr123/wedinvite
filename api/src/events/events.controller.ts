import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Event } from '../entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Tighter cap than the global default: this is the one endpoint reachable
  // with no prior capability URL, so it's the cheapest blind DB-inflation
  // vector. 10 new events/min/IP is ample for a real user.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post()
  create(@Body() dto: CreateEventDto): Promise<Event> {
    return this.eventsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Event> {
    return this.eventsService.findOne(id);
  }
}

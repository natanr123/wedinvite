import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Guest } from '../entities/guest.entity';
import { CreateGuestDto } from './dto/create-guest.dto';
import { GuestsService } from './guests.service';

@Controller('events/:eventId/guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateGuestDto,
  ): Promise<Guest> {
    return this.guestsService.create(eventId, dto);
  }

  @Get()
  findAll(@Param('eventId', ParseUUIDPipe) eventId: string): Promise<Guest[]> {
    return this.guestsService.findAll(eventId);
  }

  /** Full replacement of names + contact details. */
  @Patch(':id')
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGuestDto,
  ): Promise<Guest> {
    return this.guestsService.update(eventId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.guestsService.remove(eventId, id);
  }
}

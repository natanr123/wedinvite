import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Relation } from '../entities/relation.entity';
import {
  RelationsService,
  RelationTypesResponse,
} from './relations.service';
import { CreateRelationTypeDto } from './dto/create-relation-type.dto';
import { CreateRelationDto } from './dto/create-relation.dto';

@Controller('events/:eventId/relations')
export class RelationsController {
  constructor(private readonly relationsService: RelationsService) {}

  @Post()
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateRelationDto,
  ): Promise<Relation> {
    return this.relationsService.create(eventId, dto);
  }

  @Get()
  findAll(@Param('eventId', ParseUUIDPipe) eventId: string): Promise<Relation[]> {
    return this.relationsService.findAll(eventId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.relationsService.remove(eventId, id);
  }
}

@Controller('events/:eventId/relation-types')
export class RelationTypesController {
  constructor(private readonly relationsService: RelationsService) {}

  @Get()
  listTypes(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<RelationTypesResponse> {
    return this.relationsService.listTypes(eventId);
  }

  @Post()
  addType(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateRelationTypeDto,
  ): Promise<{ label: string }> {
    return this.relationsService.addType(eventId, dto.label);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelationType } from '../entities/relation-type.entity';
import { Relation } from '../entities/relation.entity';
import { Guest } from '../entities/guest.entity';
import { EventsModule } from '../events/events.module';
import {
  RelationsController,
  RelationTypesController,
} from './relations.controller';
import { RelationsService } from './relations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Relation, RelationType, Guest]),
    EventsModule,
  ],
  controllers: [RelationsController, RelationTypesController],
  providers: [RelationsService],
})
export class RelationsModule {}

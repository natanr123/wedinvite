import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestName } from '../entities/guest-name.entity';
import { Guest } from '../entities/guest.entity';
import { EventsModule } from '../events/events.module';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, GuestName]), EventsModule],
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule {}

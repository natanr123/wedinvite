import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { RelationsModule } from './relations/relations.module';
import { EventsModule } from './events/events.module';
import { GuestsModule } from './guests/guests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url:
          config.get<string>('DATABASE_URL') ??
          'postgres://wedinvite:wedinvite@127.0.0.1:54329/wedinvite',
        autoLoadEntities: true,
        // Local development only — switch to migrations before Supabase/production.
        synchronize: true,
      }),
    }),
    EventsModule,
    GuestsModule,
    RelationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

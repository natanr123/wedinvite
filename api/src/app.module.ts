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
        // Schema sync is local-dev only (DATABASE_SYNC=true in api/.env).
        // Production schema is managed exclusively by migrations.
        synchronize: config.get('DATABASE_SYNC') === 'true',
        // Supabase requires SSL; node-postgres needs the relaxed cert check
        // because the pooler presents a self-signed chain.
        ssl:
          config.get('DATABASE_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
        // Pool sizing is per serverless function instance (Fluid Compute) —
        // small max, short idle so connections return to Supavisor quickly.
        // Harmless for local docker postgres.
        extra: {
          max: 8,
          min: 1,
          idleTimeoutMillis: 5_000,
          connectionTimeoutMillis: 5_000,
        },
      }),
    }),
    EventsModule,
    GuestsModule,
    RelationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

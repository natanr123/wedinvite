import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { RelationsModule } from './relations/relations.module';
import { EventsModule } from './events/events.module';
import { GuestsModule } from './guests/guests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // The API is unauthenticated by design — throttle per IP so a leaked
    // event link (or blind POST /events) can't flood the DB / connection pool.
    // In-memory store is per serverless instance (defense-in-depth alongside
    // Vercel's platform WAF); main.ts enables trust-proxy so the real client
    // IP (x-forwarded-for) is used, not Vercel's edge IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
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
  providers: [
    // Enforce rate limits in production only — local dev and the e2e suite
    // legitimately burst from a single IP. @Throttle decorators stay in place
    // as documentation and take effect whenever the guard is registered.
    ...(process.env.NODE_ENV === 'production'
      ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
      : []),
  ],
})
export class AppModule {}

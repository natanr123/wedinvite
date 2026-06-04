import { DataSource } from 'typeorm';

/**
 * TypeORM CLI datasource — used by the migration commands only (the app wires
 * TypeORM through AppModule). Run via the npm scripts, which load the right
 * env file with dotenv-cli:
 *
 *   npm run migration:run         → .env       (local docker postgres)
 *   npm run migration:run:prod    → .env.prod  (Supabase, session mode)
 *
 * Migrations must NOT go through the transaction pooler (port 6543) — use the
 * session-mode/direct connection (DIRECT_DATABASE_URL).
 */
export default new DataSource({
  type: 'postgres',
  url:
    process.env.DIRECT_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgres://wedinvite:wedinvite@127.0.0.1:54329/wedinvite',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});

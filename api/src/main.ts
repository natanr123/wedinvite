import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // Live data — never let browsers cache/revalidate. Express's default ETag +
  // max-age=0 produced 304s that some mobile browsers surface to fetch() as
  // failures (observed on Mi Browser), breaking the app for those users.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  app.getHttpAdapter().getInstance().set('etag', false);
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // Prod: WEB_ORIGIN allow-list (comma-separated). Local: any origin —
  // the Next.js dev server runs on another port.
  const webOrigin = process.env.WEB_ORIGIN;
  app.enableCors({
    origin: webOrigin ? webOrigin.split(',').map((o) => o.trim()) : true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();

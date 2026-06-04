import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /** Health check. */
  @Get()
  health(): { status: string } {
    return { status: 'ok' };
  }
}

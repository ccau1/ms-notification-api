import { Controller, Get } from '@nestjs/common';

@Controller('')
export class HomeController {
  @Get()
  public async main(): Promise<string> {
    return `${process.env.APP_NAME} (${process.env.NODE_ENV ||
      'development'}) - v${process.env.APP_VERSION}`;
  }
}

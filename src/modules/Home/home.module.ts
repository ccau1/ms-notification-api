import { Module } from '@nestjs/common';

import { HomeController } from './home.controller';

@Module({
  imports: [],
  controllers: [HomeController],
  providers: [],
  exports: [],
})
export class HomeModule {}

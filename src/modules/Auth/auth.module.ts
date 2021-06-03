import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthSchema } from './schemas/auth.schema';
import { BearerStrategy } from './Passport/strategies';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Auths', schema: AuthSchema }])],
  controllers: [],
  providers: [BearerStrategy],
  exports: [],
})
export class AuthModule {}

'user strict';

import {Module, forwardRef} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';

import {AuthModule} from '../Auth/auth.module';

import {UserNotificationService} from './userNotification.service';
import {UserNotificationSocket} from './userNotification.socket';
import {UserNotificationController} from './userNotification.controller';
import {UserNotificationSchema} from './schemas/userNotification.schemas';

@Module({
  imports: [MongooseModule.forFeature([{name: 'UserNotifications', schema: UserNotificationSchema}]), forwardRef(() => AuthModule)],
  controllers: [UserNotificationController],
  providers: [UserNotificationService, UserNotificationSocket],
  exports: [UserNotificationService, UserNotificationSocket]
})
export class UserNotificationModule {}

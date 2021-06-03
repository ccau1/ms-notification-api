import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './interfaces/user';
import { AuthGuard } from '../Auth/user.auth.guard';
import { CurrentUser } from '../../core/decorators/currentUser.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  @UseGuards(AuthGuard())
  public async getCurrentUser(
    @Request() req,
    @CurrentUser() currentUser,
  ): Promise<User> {
    return currentUser;
  }
}

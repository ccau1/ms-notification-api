"use strict";

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Response,
  Query,
  Request,
  UseFilters,
  HttpStatus,
  Delete,
  Put,
} from "@nestjs/common";
import { UseGuards } from "@nestjs/common";
// core
import { extractPaginateOptions } from "../../core/mongo/paginate";
// modules
import { UserNotificationService } from "./userNotification.service";

import { UserNotificationSocket } from "./userNotification.socket";
import { CurrentUser } from "src/core/decorators/currentUser.decorator";
import { AuthGuard } from "../Auth/user.auth.guard";

// @UseFilters(HttpExceptionFilter)
@UseGuards(AuthGuard())
@Controller("user-notifications")
export class UserNotificationController {
  constructor(
    private readonly userNotificationService: UserNotificationService,
    private readonly userNotificationSocket: UserNotificationSocket
  ) {}

  /**
   * find by user id
   * @param req
   * @param res
   * @param query
   */
  @Get()
  public async findByUserId(@Request() req, @Response() res, @Query() query) {
    const result = await this.userNotificationService.findByUserId(
      req.user._id,
      extractPaginateOptions(query)
    );
    result.docs = result.docs.map((d) => {
      return this.userNotificationService.dto(d, {
        localize: query.localize === "" || query.localize === "true",
        lang:
          (req.user && req.user.preferences && req.user.preferences.language) ||
          req.locale.currentLanguage,
        userId: req.user._id,
      });
    });
    return res.status(HttpStatus.OK).json(result);
  }

  @Get("/count")
  public async getUserNotificationCount(
    @Request() req,
    @Response() res,
    @Query() query,
    @CurrentUser() currentUser
  ) {
    const result = await this.userNotificationService.getUserNotificationCount(
      currentUser._id.toString(),
      query.read !== undefined
        ? query.read === "" || query.read === "true"
        : false
    );
    return res.status(HttpStatus.OK).json(result);
  }

  /**
   * delete one by _id
   * @param req
   * @param res
   * @param param
   */
  @Delete("/:_id")
  public async deleteById(@Request() req, @Response() res, @Param() param) {
    const result = await this.userNotificationService.delete(param._id);
    return res.status(HttpStatus.OK).json(result);
  }

  /**
   * update by _id
   * @param req
   * @param res
   * @param param
   * @query set - status number
   */
  @Put("/:_id/read")
  public async updateStatus(
    @Request() req,
    @Response() res,
    @Param() param,
    @Query() query
  ) {
    const result = await this.userNotificationService.updateToRead(
      param._id,
      req.user._id
    );
    return res.status(HttpStatus.OK).json(
      this.userNotificationService.dto(result, {
        localize: query.localize === "" || query.localize === "true",
        lang:
          (req.user && req.user.preferences && req.user.preferences.language) ||
          req.locale.currentLanguage,
        userId: req.user._id,
      })
    );
  }

  /**
   * create
   * @param req
   * @param res
   * @param body
   */
  @Post()
  public async create(@Request() req, @Response() res, @Body() body) {
    const result = await this.userNotificationService.create(body);
    return res.status(HttpStatus.CREATED).json(result);
  }
}

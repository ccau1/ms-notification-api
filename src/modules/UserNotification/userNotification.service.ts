import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ObjectId } from "mongodb";

// service
// modules
import {
  UserNotificationCreateModel,
  UserNotificationSearchModel,
  UserNotificationUpdateModel,
} from "./models";
// interface
import { IUserNotification, IUserNotificationModel } from "./interfaces";
import { Types, ClientSession } from "mongoose";
import LocalizeStringSchema from "../../core/mongo/localize.schema";
import axios from "axios";
import { PaginateOptionsQueryModel } from "src/core/mongo/paginate";
import { UserNotificationSocket } from "./userNotification.socket";

export interface MongooseOption {
  sort?: any;
  select?: any;
  lean?: boolean;
  limit?: number;
  session?: ClientSession;
}

@Injectable()
export class UserNotificationService {
  constructor(
    @InjectModel("UserNotifications")
    private readonly userNotificationRepository: IUserNotificationModel,
    private readonly userNotificationSocket: UserNotificationSocket
  ) {}

  // TODO: can't delete this yet, because socket doesn't handle localizing
  // and resolving properties. Any fix for socket?
  dto = (
    model,
    opts: {
      localize: boolean;
      lang: string;
      userId?: string;
    } = { localize: false, lang: "", userId: "" }
  ): IUserNotification => {
    const newModel = { ...(model.toObject ? model.toObject() : model) };
    // if localize, set _display version of localized fields, and remove original field
    if (opts.localize) {
      newModel.message = model.message
        ? model.message[opts.lang || process.env.DEFAULT_LOCALE]
        : null;
    }
    if (opts.localize) {
      newModel.title = model.title
        ? model.title[opts.lang || process.env.DEFAULT_LOCALE]
        : null;
    }
    // set field read, and remove users because we
    // don't want users to receive whole user array
    if (opts.userId) {
      newModel.read = model.users.some(
        (u) => u.user._id.toString() === opts.userId.toString() && u.read
      );
      delete newModel.users;
    }

    return newModel;
  };

  _castQuery(search: UserNotificationSearchModel) {
    const queryAnd = [];
    const { q, users, _ids } = search;

    if (q) {
      queryAnd.push({
        $or: Object.keys(LocalizeStringSchema).map((loc) => ({
          [`message.${loc}`]: new RegExp(q, "i"),
        })),
      });
    }

    if (users?.length) {
      queryAnd.push({ users: { $elemMatch: { user: { $in: users } } } });
    }

    if (_ids?.length) {
      queryAnd.push({ _id: { $in: _ids } });
    }
    return queryAnd.length ? { $and: queryAnd } : {};
  }

  /**
   * create a user notification
   * @param model user notification model
   * @param req request
   */
  public async create(
    userNotificationCreateModel: UserNotificationCreateModel
  ): Promise<any> {
    let users = userNotificationCreateModel.users || [];
    // if has toDevices, also check if those equate to users
    if (userNotificationCreateModel.devices?.length) {
      const devices = await axios
        .get(
          `${
            process.env.API_DEVICE
          }/devices?limit=100&${userNotificationCreateModel.devices
            .map((d) => `_ids[]=${d}`)
            .join("&")}`
        )
        .then((a) => a.data.docs);
      users = users.concat(
        devices.filter((d) => d.user).map((d) => ({ user: d.user.toString() }))
      );
    }
    if (!users?.length) {
      throw new BadRequestException({ code: "err_no_users" });
    }
    // await this._validateCrud(model, req.locale.t);
    const userNotificationCreated = await this.userNotificationRepository.create(
      {
        ...userNotificationCreateModel,
        // filter unique user ids before creating
        users: Object.values(
          users.reduce((obj, u) => {
            if (typeof u.user === "string") {
              obj[u.user] = u;
            } else {
              obj[u.user._id.toHexString()] = {
                ...u,
                user: u.user._id.toHexString(),
              };
            }
            return obj;
          }, [])
        ),
      }
    );
    this.userNotificationSocket.sendNotification(null, {
      notification: userNotificationCreated,
    });

    // this.userNotificationResolver.pubsub.publish("userNotificationCreated", {
    //   userNotificationCreated,
    // });

    return userNotificationCreated;
  }

  /**
   * update notification to read
   * @param _id notification id
   * @param model notification model
   * @param req request
   */
  public async updateToRead(_id: string, userId: string): Promise<any> {
    const result = await this.updateRead(_id, userId, true);
    return result;
  }

  /**
   * update notification to unread
   * @param _id notification id
   * @param model notification model
   * @param req request
   */
  public async updateToUnread(_id: string, userId: string): Promise<any> {
    const userNotification = await this.updateRead(_id, userId, false);
    return userNotification;
  }

  /**
   * update read or unread
   * @param _id notification id
   * @param model notification model
   * @param req request
   */
  public async updateRead(
    userNotification: IUserNotification | string,
    userId: string,
    read: boolean
  ): Promise<any> {
    // get existing userNotification
    let _userNotification =
      typeof userNotification === "string"
        ? await this.findById(userNotification)
        : userNotification;
    // if user notification does not exist, throw
    // error
    if (!_userNotification) {
      throw new NotFoundException({
        code: "data__not_exists",
        payload: { key: "key_user_notification" },
      });
    }

    if (_userNotification.toObject) {
      _userNotification = _userNotification.toObject() as IUserNotification;
    }

    // extract _id so it doesn't update _id
    const { _id: thisId, ...updatedModel } = _userNotification;
    // if notification doesn't have users array, add now
    if (!updatedModel.users) {
      updatedModel.users = [];
    }
    // find the index with this user
    const userIndex = updatedModel.users.findIndex(
      (user) => user.user.toHexString() === new ObjectId(userId).toHexString()
    );
    // if index not found
    if (userIndex === -1) {
      // FIXME: should we add one? how come notification
      //       doesn't have this user?
      // add a new one
      updatedModel.users.push({ user: userId, read });
    } else {
      // if user index found, update the read of that index
      updatedModel.users[userIndex].read = read;
    }

    const result = await this.update(thisId, updatedModel);

    const unreadCount = await this.getUserNotificationCount(userId, false);
    // update via socket
    this.userNotificationSocket.unreadCount(null, {
      count: unreadCount,
      users: [userId],
    });
    // this.userNotificationResolver.pubsub.publish(
    //   "userNotificationUnreadCount",
    //   {
    //     unreadCount,
    //     userId,
    //   }
    // );
    // update the db and return newly updated user notification
    return result;
  }

  /**
   *
   * @param userId userid
   * @param read default is false: get user unread count
   */
  public async getUserNotificationCount(userId, read: boolean) {
    const conditions = {
      $and: [],
    } as any;
    conditions.$and.push({ users: { $elemMatch: { user: userId, read } } });

    return this.userNotificationRepository.countDocuments(conditions);
  }

  /**
   * find document by id
   * @param _id document id
   * @param options query options like lean, session
   */
  public async findById(
    _id: string | Types.ObjectId,
    options: MongooseOption = {}
  ): Promise<IUserNotification> {
    let query = this.userNotificationRepository.findById(_id);

    if (options.session) {
      query = query.session(options.session);
    }
    if (options.lean) {
      query = query.lean();
    }

    return query.exec();
  }

  /**
   * make changes to a existing document
   * @param _id document id
   * @param updateModel updater
   * @param options query options (i.e. lean)
   */
  public async update(
    _id: string | Types.ObjectId,
    updateModel: UserNotificationUpdateModel,
    options: MongooseOption = {}
  ): Promise<IUserNotification> {
    const { lean, ...rest } = options;

    let query = this.userNotificationRepository.findByIdAndUpdate(
      _id,
      updateModel,
      { new: true, ...rest }
    );

    if (lean) {
      query = query.lean();
    }

    return query.exec();
  }
  /**
   * find docouments by query
   * @param query db query
   * @param options query options like lean, limit, sort
   */
  public async find(
    searchModel: UserNotificationSearchModel,
    options: MongooseOption = {}
  ): Promise<IUserNotification[]> {
    // cast query before search
    const conditions = await this._castQuery(searchModel);

    // initialize db query
    let query = this.userNotificationRepository.find(conditions);

    if (options.session) {
      query = query.session(options.session);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.select) {
      query = query.select(options.select);
    }
    if (options.sort) {
      query = query.sort(options.sort);
    }
    if (options.lean) {
      query = query.lean();
    }

    // execute query and return result
    return query.exec();
  }

  /**
   * delete a document from database
   * @param _id document id
   */
  public async delete(_id: string | Types.ObjectId): Promise<any> {
    const result = await this.userNotificationRepository
      .findByIdAndDelete(_id)
      .exec();

    return result;
  }

  /**
   * get notification by user id
   * @param userId user id
   */
  public async findByUserId(
    userId: string,
    paginateOptions: PaginateOptionsQueryModel
  ): Promise<any> {
    const conditions: any = {
      $and: [],
    };
    conditions.$and.push({
      users: { $elemMatch: { user: new ObjectId(userId) } },
    });
    const paginateResult = await this.userNotificationRepository.paginate(
      conditions,
      {
        ...paginateOptions,
        populate: [
          {
            path: "image.fileMeta",
            select: "_id thumbnailUri uri",
          },
        ],
      }
    );

    return paginateResult;
  }
}

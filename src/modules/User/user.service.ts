import { Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserModel, User } from './interfaces/user';
import { UserSearchModel } from './models/user.search.model';
import mongoose from 'mongoose';

@Injectable()
@Injectable({ scope: Scope.REQUEST })
export class UserService {
  constructor(
    @InjectModel('Users') private readonly authRepository: UserModel,
  ) {}

  protected async castQuery(query: UserSearchModel) {
    // initiate query's $and array
    const queryAnd = [];

    // if verifyField exists
    if (query.verifyField) {
      // clear out all extra characters to prevent
      // dangerous search
      const sanitizedField = query.verifyField.replace(/[^\w\d_\-@\.]+/g, '');
      // add search for _id, username, email matching
      // verifyField
      queryAnd.push({
        $or: [
          ...(mongoose.isValidObjectId(sanitizedField)
            ? [{ _id: sanitizedField }]
            : []),
          { username: new RegExp(`^${sanitizedField}$`, 'i') },
          { email: new RegExp(`^${sanitizedField}$`, 'i') },
        ],
      });
    }

    if (query._ids) {
      queryAnd.push({
        _id: { $in: query._ids },
      });
    }

    // return object optionally with $and field
    return queryAnd.length ? { $and: queryAnd } : {};
  }

  public async find(query: UserSearchModel): Promise<User[]> {
    const q = await this.castQuery(query);
    return this.authRepository.find(q);
  }

  public async findOne(query: UserSearchModel): Promise<User> {
    const q = await this.castQuery(query);
    return this.authRepository.findOne(q);
  }
}

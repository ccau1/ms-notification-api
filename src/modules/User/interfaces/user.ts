import {Document, PaginateModel} from 'mongoose';
import {ObjectId} from 'mongodb';

export interface User extends Document {
  _id: ObjectId;
  username: string;
  email: string;
  meta: any;
}

export type UserModel = PaginateModel<User>;

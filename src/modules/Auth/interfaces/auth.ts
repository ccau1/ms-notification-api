import { Document, PaginateModel } from 'mongoose';
import { ObjectId } from 'mongodb';

export interface Auth extends Document {
  _id: ObjectId;
  password: string;
  user: string;
}

export type AuthModel = PaginateModel<Auth>;

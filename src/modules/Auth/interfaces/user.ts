import { ObjectId } from 'mongodb';

export interface User {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  defaultOrganization: string;
  gender: string;
  phone: string;
  website: string;
  organizations: string[];
}

import { SchemaTypes } from "mongoose";

export default {
  user: { type: SchemaTypes.ObjectId, required: true, index: true },
  time: { type: Date, default: Date.now(), index: true },
};

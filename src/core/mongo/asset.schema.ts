import { SchemaType, SchemaTypes } from "mongoose";
import localizeSchema from "./localize.schema";

export default {
  type: { type: String, enum: ["layout", "video", "render", "360"] },
  file: { type: String },
  url: { type: String },
  large: { type: String },
  medium: { type: String },
  small: { type: String },
  name: localizeSchema,
  description: localizeSchema,
  position360: { x: Number, y: Number, z: Number },
  roomId: { type: String },
};

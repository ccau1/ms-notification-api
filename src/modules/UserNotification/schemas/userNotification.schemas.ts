import mongoose from "mongoose";
import mongoosePaginate from "../../../core/mongo/paginate";
import LocalizeStringSchema from "../../../core/mongo/localize.schema";

const {
  Schema: {
    Types: { ObjectId, Mixed },
  },
} = mongoose;

export const UserNotificationSchema = new mongoose.Schema(
  {
    senders: [{ type: ObjectId, required: true, ref: "Users" }],
    users: [
      {
        user: { type: ObjectId, required: true, ref: "Users" },
        read: { type: Boolean, required: true, default: false },
      },
    ],
    title: LocalizeStringSchema,
    images: [
      {
        file: { type: String },
        url: { type: String },
        thumbnail: { type: String },
      },
    ],
    data: {
      screen: { type: String, required: true },
      parameters: { type: Mixed },
    },
    message: { type: LocalizeStringSchema, required: false },
    // nav: {
    //   type: {type: String, required: true},
    //   // type can be either Deal or Post
    //   item: {
    //     type: Schema.Types.ObjectId,
    //     required: true, refPath: 'nav.type'
    //   }
    // }
  },
  {
    collection: "UserNotifications",
    timestamps: true,
  }
);
UserNotificationSchema.plugin(mongoosePaginate);
export default mongoose.connection.model(
  "UserNotifications",
  UserNotificationSchema
);

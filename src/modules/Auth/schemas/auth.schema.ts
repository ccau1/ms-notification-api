import mongoose from 'mongoose';

export const AuthSchema = new mongoose.Schema(
  {
    password: { type: String, required: true },
    user: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: 'Users' },
  },
  {
    collection: 'Auths',
    timestamps: true,
  },
);

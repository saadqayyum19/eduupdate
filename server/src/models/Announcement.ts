import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** Announcement — notice-board post, optionally audience-scoped by role. */
const AnnouncementSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    audience: { type: [String], default: ['all'] }, // ['all'] or role names
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type AnnouncementDoc = InferSchemaType<typeof AnnouncementSchema> & { _id: Types.ObjectId };
// Cast: mongoose cannot infer the explicit _id type from the schema.
export const Announcement: Model<AnnouncementDoc> = model('Announcement', AnnouncementSchema) as unknown as Model<AnnouncementDoc>;

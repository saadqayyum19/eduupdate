import { Schema, model } from 'mongoose';

/**
 * A notice board entry.
 * `audience` holds either `['all']` or the roles that should see it (mirrored by class
 * targeting through `classIds`).
 */
const announcementSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    body: { type: String, required: true, trim: true, maxlength: 8000 },
    audience: { type: [String], default: ['all'] },
    classIds: { type: [String], default: [] },
    authorId: { type: String, required: true, index: true },
    priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
    pinned: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Announcement = model('Announcement', announcementSchema);

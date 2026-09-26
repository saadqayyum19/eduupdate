import { Schema, model } from 'mongoose';

/**
 * A class/section. Membership is stored on the class and mirrored onto the
 * user documents by the service layer so the graph never drifts.
 */
const classRoomSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    section: { type: String, required: true, trim: true, maxlength: 20, default: 'A' },
    room: { type: String, trim: true, default: '' },
    teacherIds: { type: [String], default: [] },
    inchargeId: { type: String, default: null },
    subjectIncharges: { type: Map, of: String, default: {} },
    studentIds: { type: [String], default: [] },
    subjectIds: { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true },
);

classRoomSchema.index({ name: 1, section: 1 }, { unique: true });

export const ClassRoom = model('ClassRoom', classRoomSchema);

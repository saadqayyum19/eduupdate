import { Schema, model } from 'mongoose';

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** One cell of a class timetable: class × day × period. */
const timetableSlotSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    classId: { type: String, required: true, index: true },
    day: { type: String, enum: WEEK_DAYS, required: true },
    period: { type: Number, required: true, min: 1, max: 8 },
    subjectId: { type: String, required: true },
    teacherId: { type: String, default: null },
    room: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

timetableSlotSchema.index({ classId: 1, day: 1, period: 1 }, { unique: true });

export const TimetableSlot = model('TimetableSlot', timetableSlotSchema);

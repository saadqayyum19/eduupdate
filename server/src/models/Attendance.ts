import { Schema, model } from 'mongoose';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** One row per student per day — the daily roster is stored as individual records. */
const attendanceSchema = new Schema(
  {
    institutionId: { type: String, index: true },
    classId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    markedBy: { type: String, default: null },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ classId: 1, date: 1 });

export const Attendance = model('Attendance', attendanceSchema);

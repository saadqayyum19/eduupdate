import { Schema, model } from 'mongoose';

export interface GradeBand {
  grade: string;
  gpa: number;
  min: number;
  max: number;
}

/** One settings document for the institution. Every module reads its constants from here. */
const settingSchema = new Schema(
  {
    institutionId: { type: String, required: true, unique: true, index: true },

    academicYearStart: { type: String, default: '' },
    academicYearEnd: { type: String, default: '' },
    term: { type: String, default: 'Term 1' },
    currency: { type: String, default: 'PKR' },
    timezone: { type: String, default: 'Asia/Karachi' },

    gradeBands: {
      type: [
        new Schema<GradeBand>(
          {
            grade: { type: String, required: true },
            gpa: { type: Number, required: true },
            min: { type: Number, required: true },
            max: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      default: [
        { grade: 'A+', gpa: 4, min: 90, max: 100 },
        { grade: 'A', gpa: 3.7, min: 80, max: 89 },
        { grade: 'B', gpa: 3.3, min: 70, max: 79 },
        { grade: 'C', gpa: 2.7, min: 60, max: 69 },
        { grade: 'D', gpa: 2, min: 50, max: 59 },
        { grade: 'E', gpa: 1, min: 40, max: 49 },
        { grade: 'F', gpa: 0, min: 0, max: 39 },
      ],
    },

    feeDefaults: {
      lateFeePercent: { type: Number, default: 0, min: 0, max: 100 },
      taxPercent: { type: Number, default: 0, min: 0, max: 100 },
    },

    attendanceRules: {
      workingDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      lateThresholdMin: { type: Number, default: 10, min: 0 },
      minAttendancePercent: { type: Number, default: 75, min: 0, max: 100 },
    },

    smtp: {
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: '' },
      pass: { type: String, default: '', select: false },
      from: { type: String, default: '' },
    },

    /** Module switches the school can turn on or off. */
    features: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true },
);

export const Setting = model('Setting', settingSchema);

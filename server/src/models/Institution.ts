import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

/**
 * Institution — a school, college or university on the platform.
 * `type` drives which programs/classes the UI offers, and `features` is the
 * per-institution module toggle set controlled from the Super Admin panel.
 */
const InstitutionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['school', 'college', 'university'], required: true },
    logoUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#2563eb' },
    academicYear: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    active: { type: Boolean, default: true },
    features: {
      type: new Schema(
        {
          fees: { type: Boolean, default: true },
          transport: { type: Boolean, default: false },
          hostel: { type: Boolean, default: false },
          library: { type: Boolean, default: false },
          assignments: { type: Boolean, default: true },
          quizzes: { type: Boolean, default: true },
          analytics: { type: Boolean, default: true },
          chat: { type: Boolean, default: false },
          announcements: { type: Boolean, default: true },
          attendance: { type: Boolean, default: true },
          timetable: { type: Boolean, default: true },
          marks: { type: Boolean, default: true },
          reports: { type: Boolean, default: true },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  { timestamps: true },
);

export type InstitutionDoc = InferSchemaType<typeof InstitutionSchema>;
export const Institution: Model<InstitutionDoc> = model('Institution', InstitutionSchema);

/** Every toggleable feature key — kept here so the panel and API stay in sync. */
export const FEATURE_KEYS = [
  'fees',
  'transport',
  'hostel',
  'library',
  'assignments',
  'quizzes',
  'analytics',
  'chat',
  'announcements',
  'attendance',
  'timetable',
  'marks',
  'reports',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

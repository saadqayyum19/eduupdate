import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** TimetableSlot — one period of a class's weekly grid. */
const TimetableSlotSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'ClassRoom', required: true, index: true },
    day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], required: true },
    period: { type: Number, required: true, min: 1, max: 10 },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: String, default: '' },
  },
  { timestamps: true },
);

TimetableSlotSchema.index({ classId: 1, day: 1, period: 1 }, { unique: true });

export type TimetableSlotDoc = InferSchemaType<typeof TimetableSlotSchema> & { _id: Types.ObjectId };
export const TimetableSlot: Model<TimetableSlotDoc> = model('TimetableSlot', TimetableSlotSchema) as unknown as Model<TimetableSlotDoc>;

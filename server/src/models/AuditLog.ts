import { Schema, model, Types, type InferSchemaType, type Model } from 'mongoose';

/** AuditLog — every Super Admin / admin action, append-only. */
const AuditLogSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', default: null, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "institution.create", "feature.toggle"
    entity: { type: String, default: '' },
    entityId: { type: String, default: '' },
    detail: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: Types.ObjectId };
export const AuditLog: Model<AuditLogDoc> = model('AuditLog', AuditLogSchema) as unknown as Model<AuditLogDoc>;

/** RefreshToken — server-side allow-list for refresh tokens (7-day rotation). */
const RefreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDoc = InferSchemaType<typeof RefreshTokenSchema> & { _id: Types.ObjectId };
export const RefreshToken: Model<RefreshTokenDoc> = model('RefreshToken', RefreshTokenSchema) as unknown as Model<RefreshTokenDoc>;

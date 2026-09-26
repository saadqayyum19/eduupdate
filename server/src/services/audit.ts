import { AuditLog } from '../models/AuditLog';

export interface AuditInput {
  institutionId: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  entity?: string;
  entityId?: string;
  detail?: string;
  ip?: string;
}

/** Append-only audit trail. Never throws into the request path. */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await AuditLog.create({
      institutionId: input.institutionId ?? null,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      entity: input.entity ?? '',
      entityId: input.entityId ?? '',
      detail: input.detail ?? '',
      ip: input.ip ?? '',
    });
  } catch (error) {
    console.error('[audit] failed to write log entry', error);
  }
}

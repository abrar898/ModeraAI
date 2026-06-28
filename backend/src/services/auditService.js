import AuditLog from '../models/AuditLog.js';

export async function logAudit({ action, actor, targetType, targetId, details = {}, ipAddress = null }) {
  return AuditLog.create({
    action,
    actor: actor._id,
    actorUsername: actor.username,
    targetType,
    targetId,
    details,
    ipAddress,
  });
}

export function auditToCsvRow(log) {
  const escape = (val) => {
    const str = val == null ? '' : String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  return [
    log._id,
    log.createdAt?.toISOString?.() || log.createdAt,
    log.action,
    log.actorUsername,
    log.targetType,
    log.targetId,
    JSON.stringify(log.details || {}),
    log.ipAddress || '',
  ].map(escape).join(',');
}

export const AUDIT_CSV_HEADERS = 'id,timestamp,action,actor,target_type,target_id,details,ip_address';

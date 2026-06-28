import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { auditLogQuerySchema } from '../validation/schemas.js';
import { auditToCsvRow, AUDIT_CSV_HEADERS } from '../services/auditService.js';

const router = express.Router();

// GET /api/admin/audit-log – paginated audit trail
router.get('/', authenticate, requireAdmin, validateQuery(auditLogQuerySchema), async (req, res) => {
  const { action, from, to, page, limit } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'username email role')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/admin/audit-log/export – CSV download
router.get('/export', authenticate, requireAdmin, validateQuery(auditLogQuerySchema), async (req, res) => {
  const { action, from, to } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(10000).lean();

  const rows = logs.map(auditToCsvRow);
  const csv = [AUDIT_CSV_HEADERS, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.csv"`);
  res.send(csv);
});

export default router;

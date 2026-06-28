import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'submission_created',
        'verdict_override',
        'appeal_filed',
        'appeal_reviewed',
        'policy_updated',
        'user_status_changed',
      ],
      required: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorUsername: { type: String, required: true },
    targetType: {
      type: String,
      enum: ['submission', 'appeal', 'policy', 'user'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);

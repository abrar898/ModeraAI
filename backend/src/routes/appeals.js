import express from 'express';
import Appeal from '../models/Appeal.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { appealSchema, appealReviewSchema } from '../validation/schemas.js';
import { sendAppealResolutionEmail } from '../services/emailService.js';
import { logAudit } from '../services/auditService.js';
import { notifyUser } from '../services/notificationService.js';
import { emitToAdmins } from '../socket.js';
import { buildImageUrlForIndex } from './submissions.js';

const router = express.Router();

function computeOverallOutcome(outcomes) {
  if (outcomes.every((o) => o === 'approved')) return 'approved';
  if (outcomes.some((o) => o === 'blocked')) return 'blocked';
  if (outcomes.some((o) => o === 'flagged')) return 'flagged';
  return 'mixed';
}

// POST /api/appeals – file an appeal
router.post('/', authenticate, validate(appealSchema), async (req, res) => {
  const { submissionId, imageIndex, justification } = req.body;

  const submission = await Submission.findById(submissionId);
  if (!submission) return res.status(404).json({ message: 'Submission not found' });
  if (submission.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const image = submission.images[imageIndex];
  if (!image) return res.status(404).json({ message: 'Image not found' });
  if (!['flagged', 'blocked'].includes(image.verdict.outcome)) {
    return res.status(400).json({ message: 'Only flagged or blocked images can be appealed' });
  }

  const existing = await Appeal.findOne({ submission: submissionId, imageIndex });
  if (existing) {
    return res.status(409).json({ message: 'An appeal already exists for this image' });
  }

  const appeal = await Appeal.create({
    submission: submissionId,
    imageIndex,
    user: req.user._id,
    justification,
  });

  submission.images[imageIndex].appeal = appeal._id;
  await submission.save();

  await logAudit({
    action: 'appeal_filed',
    actor: req.user,
    targetType: 'appeal',
    targetId: appeal._id,
    details: { submissionId, imageIndex, originalOutcome: image.verdict.outcome },
    ipAddress: req.ip,
  });

  emitToAdmins('appeal:filed', {
    _id: appeal._id,
    username: req.user.username,
    submissionId,
    imageIndex,
    createdAt: appeal.createdAt,
  });

  res.status(201).json(appeal);
});

// GET /api/appeals/mine – user's own appeals
router.get('/mine', authenticate, async (req, res) => {
  const appeals = await Appeal.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('submission', 'createdAt overallOutcome')
    .populate('reviewedBy', 'username')
    .lean();

  const enriched = await Promise.all(
    appeals.map(async (a) => {
      const subId = a.submission?._id?.toString() || a.submission?.toString();
      const imageUrl = subId ? await buildImageUrlForIndex(subId, a.imageIndex) : null;
      return { ...a, imageUrl };
    })
  );

  res.json(enriched);
});

// GET /api/appeals – admin: all pending appeals
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const filter = status !== 'all' ? { status } : {};

  const appeals = await Appeal.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('user', 'username email')
    .populate('submission', 'createdAt overallOutcome')
    .populate('reviewedBy', 'username')
    .lean();

  const enriched = await Promise.all(
    appeals.map(async (a) => {
      const subId = a.submission?._id?.toString() || a.submission?.toString();
      const imageUrl = subId ? await buildImageUrlForIndex(subId, a.imageIndex) : null;
      return { ...a, imageUrl };
    })
  );

  const total = await Appeal.countDocuments(filter);
  res.json({ appeals: enriched, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// PATCH /api/appeals/:id/review – admin: accept or reject
router.patch('/:id/review', authenticate, requireAdmin, validate(appealReviewSchema), async (req, res) => {
  const { decision, adminResponse } = req.body;

  const appeal = await Appeal.findById(req.params.id);
  if (!appeal) return res.status(404).json({ message: 'Appeal not found' });
  if (appeal.status !== 'pending') {
    return res.status(400).json({ message: 'Appeal already reviewed' });
  }

  appeal.status = decision;
  appeal.adminResponse = adminResponse || '';
  appeal.reviewedBy = req.user._id;
  appeal.reviewedAt = new Date();
  await appeal.save();

  let originalOutcome = null;
  if (decision === 'accepted') {
    const submission = await Submission.findById(appeal.submission);
    if (submission) {
      const image = submission.images[appeal.imageIndex];
      if (image) {
        originalOutcome = image.verdict.outcome;
        image.verdict.originalOutcome = image.verdict.outcome;
        image.verdict.outcome = 'approved';
        image.verdict.overriddenBy = req.user._id;
        image.verdict.overriddenAt = new Date();
      }
      submission.overallOutcome = computeOverallOutcome(submission.images.map((img) => img.verdict.outcome));
      await submission.save();
    }
  }

  await logAudit({
    action: 'appeal_reviewed',
    actor: req.user,
    targetType: 'appeal',
    targetId: appeal._id,
    details: { decision, originalOutcome, adminResponse: adminResponse || '' },
    ipAddress: req.ip,
  });

  const appealUser = await User.findById(appeal.user).select('email username');
  const submissionId = appeal.submission.toString();

  const accepted = decision === 'accepted';
  const notifTitle = accepted ? 'Appeal accepted' : 'Appeal rejected';
  const fullMessage = adminResponse
    ? `${accepted ? 'Your appeal was accepted. The verdict is now Approved.' : 'Your appeal was rejected.'} Admin note: "${adminResponse}"`
    : accepted
      ? 'Your appeal was accepted. The image verdict has been updated to Approved.'
      : 'Your appeal was rejected. The original verdict remains unchanged.';

  let emailResult = { sent: false, reason: 'No user email' };
  if (appealUser) {
    emailResult = await sendAppealResolutionEmail({
      userEmail: appealUser.email,
      username: appealUser.username,
      decision,
      adminResponse: adminResponse || '',
      submissionId,
    });
  }

  await notifyUser({
    userId: appeal.user,
    type: 'appeal_resolved',
    title: notifTitle,
    message: fullMessage,
    link: `/submissions/${submissionId}`,
    meta: {
      appealId: appeal._id,
      decision,
      adminResponse: adminResponse || '',
      emailSent: emailResult.sent,
      emailReason: emailResult.reason || null,
    },
  });

  const populated = await Appeal.findById(appeal._id)
    .populate('user', 'username email')
    .populate('reviewedBy', 'username');

  res.json({ ...populated.toJSON(), emailSent: emailResult.sent });
});

export default router;

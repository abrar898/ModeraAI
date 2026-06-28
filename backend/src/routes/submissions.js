import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Submission from '../models/Submission.js';
import Policy from '../models/Policy.js';
import Appeal from '../models/Appeal.js';
import { authenticate } from '../middleware/auth.js';
import { submissionLimiter } from '../middleware/rateLimiter.js';
import { validateQuery } from '../middleware/validate.js';
import { submissionQuerySchema } from '../validation/schemas.js';
import { moderateImage } from '../services/moderationService.js';
import { uploadImage, getImageUrl, deleteImage, S3_ENABLED } from '../services/storageService.js';
import { logAudit } from '../services/auditService.js';
import { updateUserReputation } from '../services/reputationService.js';
import { emitSubmissionProcessed } from '../socket.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images are allowed'));
    cb(null, true);
  },
});

const IMAGE_SECRET = () => process.env.IMAGE_TOKEN_SECRET || process.env.JWT_SECRET || 'fallback-secret';

export function signImageToken(submissionId, imageIndex) {
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const payload = `${submissionId}:${imageIndex}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', IMAGE_SECRET()).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyImageToken(token, submissionId, imageIndex) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return false;
    const [sid, idx, expiresAt, sig] = parts;
    if (sid !== submissionId || parseInt(idx) !== imageIndex) return false;
    if (Date.now() > parseInt(expiresAt)) return false;
    const payload = `${sid}:${idx}:${expiresAt}`;
    const expected = crypto.createHmac('sha256', IMAGE_SECRET()).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function buildImageUrl(submission, idx) {
  const image = submission.images[idx];
  if (!image) return null;
  if (S3_ENABLED() && image.s3Key) {
    return getImageUrl(image.s3Key);
  }
  const token = signImageToken(submission._id.toString(), idx);
  return `/api/submissions/${submission._id}/images/${idx}?itoken=${token}`;
}

/** Build a signed image URL for a submission + index (used by appeals, admin, etc.) */
export async function buildImageUrlForIndex(submissionId, imageIndex) {
  const submission = await Submission.findById(submissionId);
  if (!submission?.images?.[imageIndex]) return null;
  return buildImageUrl(submission, imageIndex);
}

async function attachImageUrls(sub, submission) {
  sub.imageUrls = await Promise.all(
    sub.images.map((_, idx) => buildImageUrl(submission, idx))
  );
  return sub;
}

function computeOverallOutcome(outcomes) {
  if (outcomes.every((o) => o === 'approved')) return 'approved';
  if (outcomes.some((o) => o === 'blocked')) return 'blocked';
  if (outcomes.some((o) => o === 'flagged')) return 'flagged';
  return 'mixed';
}

// POST /api/submissions – submit images
router.post('/', authenticate, submissionLimiter, upload.array('images', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'At least one image is required' });
  }

  const activePolicy = await Policy.findOne({ isActive: true });
  if (!activePolicy) return res.status(503).json({ message: 'No active policy configured' });

  const startTime = Date.now();
  const s3Keys = [];

  try {
    const processedImages = await Promise.all(
      req.files.map(async (file) => {
        const [result, s3Key] = await Promise.all([
          moderateImage(file.buffer, file.mimetype, activePolicy),
          S3_ENABLED() ? uploadImage(file.buffer, file.mimetype, file.originalname) : Promise.resolve(null),
        ]);
        if (s3Key) s3Keys.push(s3Key);
        return {
          filename: `${Date.now()}-${file.originalname}`,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          s3Key: s3Key || null,
          data: S3_ENABLED() ? null : file.buffer,
          verdict: {
            outcome: result.outcome,
            categoryResults: result.categoryResults,
            policyVersion: activePolicy.version,
            policyId: activePolicy._id,
            aiProvider: result.aiProvider || null,
          },
        };
      })
    );

    const overallOutcome = computeOverallOutcome(processedImages.map((img) => img.verdict.outcome));
    const processingTimeMs = Date.now() - startTime;

    const submission = await Submission.create({
      user: req.user._id,
      images: processedImages,
      overallOutcome,
      processed: true,
      processingTimeMs,
    });

    await Promise.all([
      updateUserReputation(req.user._id, overallOutcome),
      logAudit({
        action: 'submission_created',
        actor: req.user,
        targetType: 'submission',
        targetId: submission._id,
        details: {
          imageCount: processedImages.length,
          overallOutcome,
          processingTimeMs,
          policyVersion: activePolicy.version,
        },
        ipAddress: req.ip,
      }),
    ]);

    const populated = await Submission.findById(submission._id).populate('user', 'username email reputationScore').lean();
    const safe = sanitizeSubmission(populated);
    await attachImageUrls(safe, submission);

    emitSubmissionProcessed({
      _id: safe._id,
      username: populated.user?.username,
      overallOutcome: safe.overallOutcome,
      imageCount: safe.images.length,
      processingTimeMs,
      createdAt: safe.createdAt,
    });

    res.status(201).json(safe);
  } catch (err) {
    await Promise.all(s3Keys.map(deleteImage));
    throw err;
  }
});

// GET /api/submissions – user's own submissions
router.get('/', authenticate, validateQuery(submissionQuerySchema), async (req, res) => {
  const { outcome, category, from, to, page, limit } = req.query;
  const filter = { user: req.user._id };
  if (outcome) filter.overallOutcome = outcome;
  if (category) {
    filter['images.verdict.categoryResults'] = { $elemMatch: { category, meetsThreshold: true } };
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const submissions = await Submission.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('user', 'username email reputationScore')
    .lean();

  const total = await Submission.countDocuments(filter);

  const submissionIds = submissions.map((s) => s._id);
  const appeals = await Appeal.find({ submission: { $in: submissionIds } }).lean();

  const enriched = await Promise.all(
    submissions.map(async (s) => {
      const sub = sanitizeSubmission(s);
      const doc = await Submission.findById(s._id);
      sub.images = await Promise.all(
        sub.images.map(async (img, idx) => {
          const appeal = appeals.find(
            (a) => a.submission.toString() === s._id.toString() && a.imageIndex === idx
          );
          const imageUrl = await buildImageUrl(doc, idx);
          return { ...img, imageUrl, appeal: appeal || null };
        })
      );
      return sub;
    })
  );

  res.json({ submissions: enriched, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/submissions/:id
router.get('/:id', authenticate, async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate('user', 'username email reputationScore').lean();
  if (!submission) return res.status(404).json({ message: 'Submission not found' });
  if (req.user.role !== 'admin' && submission.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const appeals = await Appeal.find({ submission: submission._id })
    .populate('reviewedBy', 'username')
    .lean();

  const doc = await Submission.findById(req.params.id);
  const safe = sanitizeSubmission(submission);
  safe.images = await Promise.all(
    safe.images.map(async (img, idx) => ({
      ...img,
      imageUrl: await buildImageUrl(doc, idx),
      appeal: appeals.find((a) => a.imageIndex === idx) || null,
    }))
  );
  safe.imageUrls = safe.images.map((img) => img.imageUrl);

  res.json(safe);
});

// GET /api/submissions/:id/images/:index – serve image binary (legacy MongoDB mode)
router.get('/:id/images/:index', async (req, res) => {
  const { itoken } = req.query;
  const { id, index } = req.params;
  const idx = parseInt(index);

  if (!itoken || !verifyImageToken(itoken, id, idx)) {
    return res.status(401).json({ message: 'Invalid or expired image token' });
  }

  const submission = await Submission.findById(id);
  if (!submission) return res.status(404).json({ message: 'Not found' });

  const image = submission.images[idx];
  if (!image || !image.data) return res.status(404).json({ message: 'Image not found' });

  res.set('Content-Type', image.mimetype);
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(image.data);
});

function sanitizeSubmission(sub) {
  const s = { ...sub };
  s.images = (s.images || []).map(({ data, s3Key, ...rest }) => rest);
  return s;
}

export default router;

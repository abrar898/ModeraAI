import express from 'express';
import Submission from '../models/Submission.js';
import Appeal from '../models/Appeal.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { verdictOverrideSchema, userStatusSchema, adminUsersQuerySchema } from '../validation/schemas.js';
import { getImageUrl, S3_ENABLED } from '../services/storageService.js';
import { verifyImageToken, signImageToken } from './submissions.js';
import { logAudit } from '../services/auditService.js';
import { getReputationTier } from '../services/reputationService.js';

const router = express.Router();

const OVERVIEW_CACHE_MS = 15_000;
let overviewCache = { at: 0, data: null };

// GET /api/admin/overview – platform summary for admin home dashboard
router.get('/overview', authenticate, requireAdmin, async (req, res) => {
  const now = Date.now();
  if (overviewCache.data && now - overviewCache.at < OVERVIEW_CACHE_MS) {
    return res.json(overviewCache.data);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [userCounts, subCounts, appealCounts, recentUsers, recentSubmissions, usersOverTime, outcomeBreakdown] =
    await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            suspended: { $sum: { $cond: ['$isActive', 0, 1] } },
            admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
            newLast30Days: {
              $sum: { $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] },
            },
          },
        },
      ]),
      Submission.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            last30Days: {
              $sum: { $cond: [{ $gte: ['$createdAt', thirtyDaysAgo] }, 1, 0] },
            },
          },
        },
      ]),
      Appeal.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          },
        },
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('username email role createdAt isActive')
        .lean(),
      Submission.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 6 },
        {
          $project: {
            overallOutcome: 1,
            createdAt: 1,
            user: 1,
            imageCount: { $size: { $ifNull: ['$images', []] } },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDoc',
            pipeline: [{ $project: { username: 1, email: 1 } }],
          },
        },
        { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            overallOutcome: 1,
            createdAt: 1,
            imageCount: 1,
            user: '$userDoc',
          },
        },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Submission.aggregate([
        { $group: { _id: '$overallOutcome', count: { $sum: 1 } } },
      ]),
    ]);

  const uc = userCounts[0] || { total: 0, active: 0, suspended: 0, admins: 0, newLast30Days: 0 };
  const sc = subCounts[0] || { total: 0, last30Days: 0 };
  const ac = appealCounts[0] || { total: 0, pending: 0 };

  const payload = {
    users: {
      total: uc.total,
      active: uc.active,
      suspended: uc.suspended,
      admins: uc.admins,
      newLast30Days: uc.newLast30Days,
      registrationsOverTime: usersOverTime,
    },
    submissions: {
      total: sc.total,
      last30Days: sc.last30Days,
      outcomeBreakdown,
    },
    appeals: { total: ac.total, pending: ac.pending },
    recentUsers,
    recentSubmissions,
  };

  overviewCache = { at: now, data: payload };
  res.json(payload);
});

// GET /api/admin/analytics
router.get('/analytics', authenticate, requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from || to) {
    dateFilter.createdAt = {};
    // Parse YYYY-MM-DD as local calendar days (matches browser date inputs)
    if (from) dateFilter.createdAt.$gte = new Date(`${from}T00:00:00.000`);
    if (to) {
      const endExclusive = new Date(`${to}T00:00:00.000`);
      endExclusive.setDate(endExclusive.getDate() + 1);
      dateFilter.createdAt.$lt = endExclusive;
    }
  }

  const [totalSubmissions, verdictDist, submissionsOverTime, appealStats, topUsers, categoryStats, userRegistrations, violationsOverTime] =
    await Promise.all([
      Submission.countDocuments(dateFilter),

      Submission.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$overallOutcome', count: { $sum: 1 } } },
      ]),

      Submission.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 90 },
      ]),

      Appeal.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Submission.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$user',
            count: { $sum: 1 },
            violations: {
              $sum: { $cond: [{ $in: ['$overallOutcome', ['flagged', 'blocked']] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
        { $unwind: '$userInfo' },
        {
          $project: {
            username: '$userInfo.username',
            email: '$userInfo.email',
            reputationScore: '$userInfo.reputationScore',
            count: 1,
            violations: 1,
          },
        },
      ]),

      Submission.aggregate([
        { $match: dateFilter },
        { $unwind: '$images' },
        { $unwind: '$images.verdict.categoryResults' },
        {
          $group: {
            _id: '$images.verdict.categoryResults.category',
            detections: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      '$images.verdict.categoryResults.meetsThreshold',
                      '$images.verdict.categoryResults.detected',
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            violations: {
              $sum: { $cond: ['$images.verdict.categoryResults.meetsThreshold', 1, 0] },
            },
            total: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 90 },
      ]),
      Submission.aggregate([
        { $match: { ...dateFilter, overallOutcome: { $in: ['flagged', 'blocked'] } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 90 },
      ]),
    ]);

  const appealTotal = appealStats.reduce((s, a) => s + a.count, 0);
  const appealResolved = appealStats
    .filter((a) => ['accepted', 'rejected'].includes(a._id))
    .reduce((s, a) => s + a.count, 0);

  res.json({
    totalSubmissions,
    verdictDistribution: verdictDist,
    submissionsOverTime,
    appeals: {
      total: appealTotal,
      resolutionRate: appealTotal > 0 ? Math.round((appealResolved / appealTotal) * 100) : 0,
      breakdown: appealStats,
    },
    topUsers,
    categoryStats,
    userRegistrations,
    violationsOverTime,
  });
});

// GET /api/admin/submissions – all submissions for admin
// Supports ?outcome=, ?userId=, ?search= (username/email fuzzy match)
router.get('/submissions', authenticate, requireAdmin, async (req, res) => {
  const { outcome, page = 1, limit = 20, userId, search } = req.query;
  const filter = {};
  if (outcome) filter.overallOutcome = outcome;

  if (userId) {
    filter.user = userId;
  } else if (search) {
    // Resolve user IDs matching the search term, then filter submissions by those IDs
    const users = await User.find({
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    filter.user = { $in: users.map((u) => u._id) };
  }

  const submissions = await Submission.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .populate('user', 'username email')
    .lean();

  const total = await Submission.countDocuments(filter);

  const safe = submissions.map((s) => {
    s.images = s.images.map(({ data, s3Key, ...rest }) => rest);
    return s;
  });

  res.json({ submissions: safe, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// GET /api/admin/submissions/:id/images/:index – serve image for admin
// S3 mode: redirect to a fresh pre-signed URL.
// Legacy mode: validate HMAC image token (same as user route) but also allow
//   admin JWT — admins can view any submission.
router.get('/submissions/:id/images/:index', authenticate, requireAdmin, async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ message: 'Submission not found' });
  const idx = parseInt(req.params.index);
  const image = submission.images[idx];
  if (!image) return res.status(404).json({ message: 'Image not found' });

  if (S3_ENABLED() && image.s3Key) {
    const url = await getImageUrl(image.s3Key);
    return res.redirect(302, url);
  }

  if (!image.data) return res.status(404).json({ message: 'Image data not found' });
  res.set('Content-Type', image.mimetype);
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(image.data);
});

// GET /api/admin/submissions/:id/images/:index/token – get a signed image token for admin
// Admins need this to render <img> tags in the browser without embedding the JWT.
router.get('/submissions/:id/images/:index/token', authenticate, requireAdmin, async (req, res) => {
  const { id, index } = req.params;
  const idx = parseInt(index);

  if (S3_ENABLED()) {
    const submission = await Submission.findById(id);
    if (!submission) return res.status(404).json({ message: 'Not found' });
    const image = submission.images[idx];
    if (!image?.s3Key) return res.status(404).json({ message: 'Image not found' });
    const url = await getImageUrl(image.s3Key);
    return res.json({ url });
  }

  const token = signImageToken(id, idx);
  res.json({ url: `/api/submissions/${id}/images/${idx}?itoken=${token}` });
});

// PATCH /api/admin/submissions/:id/images/:index/override – manual verdict override
router.patch('/submissions/:id/images/:index/override', authenticate, requireAdmin, validate(verdictOverrideSchema), async (req, res) => {
  const { outcome } = req.body;

  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ message: 'Submission not found' });

  const idx = parseInt(req.params.index);
  const image = submission.images[idx];
  if (!image) return res.status(404).json({ message: 'Image not found' });

  const previousOutcome = image.verdict.outcome;
  image.verdict.originalOutcome = image.verdict.outcome;
  image.verdict.outcome = outcome;
  image.verdict.overriddenBy = req.user._id;
  image.verdict.overriddenAt = new Date();

  const outcomes = submission.images.map((img) => img.verdict.outcome);
  if (outcomes.every((o) => o === 'approved')) submission.overallOutcome = 'approved';
  else if (outcomes.some((o) => o === 'blocked')) submission.overallOutcome = 'blocked';
  else if (outcomes.some((o) => o === 'flagged')) submission.overallOutcome = 'flagged';
  else submission.overallOutcome = 'mixed';

  await submission.save();

  await logAudit({
    action: 'verdict_override',
    actor: req.user,
    targetType: 'submission',
    targetId: submission._id,
    details: { imageIndex: idx, previousOutcome, newOutcome: outcome },
    ipAddress: req.ip,
  });

  const updated = await Submission.findById(submission._id).populate('user', 'username email').lean();
  updated.images = updated.images.map(({ data, s3Key, ...rest }) => rest);
  res.json(updated);
});

// GET /api/admin/users
router.get('/users', authenticate, requireAdmin, validateQuery(adminUsersQuerySchema), async (req, res) => {
  const { search, role, status } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'suspended') filter.isActive = false;

  const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();
  const enriched = users.map((u) => ({
    ...u,
    reputationTier: getReputationTier(u.reputationScore ?? 100),
    violationCount: (u.flaggedCount ?? 0) + (u.blockedCount ?? 0),
  }));
  res.json(enriched);
});

// GET /api/admin/users/export – CSV download
router.get('/users/export', authenticate, requireAdmin, validateQuery(adminUsersQuerySchema), async (req, res) => {
  const { search, role, status } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'suspended') filter.isActive = false;

  const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();

  const escape = (val) => {
    const str = val == null ? '' : String(val);
    return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const headers = 'username,email,role,reputation,submissions,approved,flagged,blocked,status,joined';
  const rows = users.map((u) =>
    [
      u.username,
      u.email,
      u.role,
      u.reputationScore ?? 100,
      u.totalSubmissions ?? 0,
      u.approvedCount ?? 0,
      u.flaggedCount ?? 0,
      u.blockedCount ?? 0,
      u.isActive ? 'active' : 'suspended',
      u.createdAt?.toISOString?.() || u.createdAt,
    ].map(escape).join(',')
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="users-${Date.now()}.csv"`);
  res.send([headers, ...rows].join('\n'));
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', authenticate, requireAdmin, validate(userStatusSchema), async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot change your own account status' });
  }
  const previousStatus = user.isActive;
  user.isActive = isActive;
  await user.save();

  await logAudit({
    action: 'user_status_changed',
    actor: req.user,
    targetType: 'user',
    targetId: user._id,
    details: { previousStatus, newStatus: isActive, targetUsername: user.username },
    ipAddress: req.ip,
  });

  res.json({ ...user.toJSON(), reputationTier: getReputationTier(user.reputationScore ?? 100) });
});

export default router;

import express from 'express';
import Policy, { MODERATION_CATEGORIES } from '../models/Policy.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

const defaultCategories = () =>
  MODERATION_CATEGORIES.map((cat) => ({
    category: cat,
    enabled: true,
    confidenceThreshold: 70,
    enforcementBehavior: 'flag_for_review',
  }));

// GET /api/policy – get active policy (authenticated)
router.get('/', authenticate, async (req, res) => {
  const policy = await getOrSeedActivePolicy();
  res.json(policy);
});

// GET /api/policy/public – landing page preview (no auth)
router.get('/public', async (req, res) => {
  const policy = await getOrSeedActivePolicy();
  res.json({
    version: policy.version,
    categories: policy.categories.map((c) => ({
      category: c.category,
      enabled: c.enabled,
      confidenceThreshold: c.confidenceThreshold,
      enforcementBehavior: c.enforcementBehavior,
    })),
  });
});

async function getOrSeedActivePolicy() {
  let policy = await Policy.findOne({ isActive: true }).populate('updatedBy', 'username');
  if (!policy) {
    const count = await Policy.countDocuments();
    policy = await Policy.create({
      version: count + 1,
      isActive: true,
      categories: defaultCategories(),
    });
  }
  return policy;
}

// PUT /api/policy – update policy (admin only)
router.put('/', authenticate, requireAdmin, async (req, res) => {
  const { categories } = req.body;
  if (!categories || !Array.isArray(categories)) {
    return res.status(400).json({ message: 'categories array is required' });
  }

  // Validate categories
  for (const cat of categories) {
    if (!MODERATION_CATEGORIES.includes(cat.category)) {
      return res.status(400).json({ message: `Invalid category: ${cat.category}` });
    }
    if (cat.confidenceThreshold < 0 || cat.confidenceThreshold > 100) {
      return res.status(400).json({ message: 'Confidence threshold must be 0-100' });
    }
    if (!['auto_block', 'flag_for_review'].includes(cat.enforcementBehavior)) {
      return res.status(400).json({ message: 'Invalid enforcement behavior' });
    }
  }

  const lastPolicy = await Policy.findOne().sort({ version: -1 });
  const newVersion = (lastPolicy?.version || 0) + 1;

  const policy = await Policy.create({
    version: newVersion,
    isActive: true,
    categories,
    updatedBy: req.user._id,
  });

  const populated = await Policy.findById(policy._id).populate('updatedBy', 'username');

  await logAudit({
    action: 'policy_updated',
    actor: req.user,
    targetType: 'policy',
    targetId: policy._id,
    details: { version: newVersion, categoryCount: categories.length },
    ipAddress: req.ip,
  });

  res.json(populated);
});

// GET /api/policy/history – policy version history (admin)
router.get('/history', authenticate, requireAdmin, async (req, res) => {
  const policies = await Policy.find()
    .sort({ version: -1 })
    .populate('updatedBy', 'username')
    .lean();
  res.json(policies);
});

export default router;

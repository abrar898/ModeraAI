import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';
import { getReputationTier } from '../services/reputationService.js';

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

function enrichUser(user) {
  const obj = user.toJSON ? user.toJSON() : user;
  return {
    ...obj,
    reputationTier: getReputationTier(obj.reputationScore ?? 100),
  };
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  const { username, email, password } = req.body;
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) {
    return res.status(409).json({ message: 'Email or username already taken' });
  }
  const user = await User.create({ username, email, password });
  const token = signToken(user._id);
  res.status(201).json({ token, user: enrichUser(user) });
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'Account suspended' });
  }
  const token = signToken(user._id);
  res.json({ token, user: enrichUser(user) });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: enrichUser(req.user) });
});

export default router;

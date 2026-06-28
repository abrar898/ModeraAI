import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(30),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const appealSchema = z.object({
  submissionId: z.string().min(1, 'submissionId is required'),
  imageIndex: z.coerce.number().int().min(0, 'imageIndex must be a non-negative integer'),
  justification: z.string().trim().min(20, 'Justification must be at least 20 characters'),
});

export const appealReviewSchema = z.object({
  decision: z.enum(['accepted', 'rejected'], { message: 'decision must be accepted or rejected' }),
  adminResponse: z.string().trim().optional(),
});

export const verdictOverrideSchema = z.object({
  outcome: z.enum(['approved', 'flagged', 'blocked'], { message: 'Invalid outcome' }),
});

export const userStatusSchema = z.object({
  isActive: z.boolean({ message: 'isActive (boolean) is required' }),
});

export const submissionQuerySchema = z.object({
  outcome: z.enum(['approved', 'flagged', 'blocked', 'mixed']).optional(),
  category: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const auditLogQuerySchema = z.object({
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const adminUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

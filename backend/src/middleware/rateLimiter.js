import rateLimit from 'express-rate-limit';

// Applied to POST /api/submissions only.
// Allows 10 submission requests per user per 15 minutes. Each request can
// carry up to 10 images, so a legitimate user can submit 100 images/15 min.
// Free-tier AI APIs (Groq/Gemini) each have ~30 RPM rate limits; this keeps
// any single user well under that while blocking accidental or malicious floods.
export const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15-minute window
  max: 10,                          // max 10 POST /submissions per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,  // per-user, not per-IP
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many submissions. You can submit up to 10 batches per 15 minutes. Please wait before trying again.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Looser limiter for read endpoints (listing, detail views) — prevents scraping
// but doesn't block normal browsing.
export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  skip: () => process.env.NODE_ENV === 'test',
});

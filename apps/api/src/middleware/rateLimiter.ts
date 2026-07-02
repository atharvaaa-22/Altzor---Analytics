import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
  keyGenerator: (req) => req.ip ?? 'unknown',
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
});

export const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Query rate limit exceeded. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
});

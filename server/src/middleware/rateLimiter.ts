import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Creates an in-memory rate limiting middleware
 * @param windowMs Time window in milliseconds
 * @param max Max requests allowed in window
 * @param message Custom message on rate limit exceeded
 */
export const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string = 'Too many requests from this IP, please try again later.',
  skipSuccessful: boolean = false
) => {
  const hits: RateLimitStore = {};

  // Periodically clean up expired entries every 5 minutes to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const ip in hits) {
      if (hits[ip].resetTime < now) {
        delete hits[ip];
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!hits[ip] || hits[ip].resetTime < now) {
      hits[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
      
      if (skipSuccessful) {
        res.on('finish', () => {
          if (res.statusCode < 400 && hits[ip]) {
            hits[ip].count = Math.max(0, hits[ip].count - 1);
          }
        });
      }
      return next();
    }

    hits[ip].count += 1;

    if (hits[ip].count > max) {
      res.setHeader('Retry-After', Math.ceil((hits[ip].resetTime - now) / 1000));
      res.status(429).json({
        success: false,
        message,
      });
      return;
    }

    if (skipSuccessful) {
      res.on('finish', () => {
        if (res.statusCode < 400 && hits[ip]) {
          hits[ip].count = Math.max(0, hits[ip].count - 1);
        }
      });
    }

    next();
  };
};

// Standard limiters
export const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  15,             // 15 failed attempts
  'Too many failed login attempts. For security, please wait 15 minutes before trying again.',
  true            // Skip successful logins so genuine users aren't locked out
);

export const emailSendLimiter = createRateLimiter(
  10 * 60 * 1000, // 10 minutes
  15,             // 15 emails
  'Email dispatch limit reached. Please wait 10 minutes before sending more invoices.'
);

export const registerLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5,              // 5 registrations
  'Too many accounts created from this IP. Please try again later.'
);

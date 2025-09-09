import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimit {
  private limit: number;
  private window: number;

  constructor(limit: number = 10, window: number = 60) {
    this.limit = limit;
    this.window = window;
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`;
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / this.window);
    const windowKey = `${key}:${window}`;

    try {
      const current = await redis.incr(windowKey);
      
      if (current === 1) {
        await redis.expire(windowKey, this.window);
      }

      const remaining = Math.max(0, this.limit - current);
      const reset = (window + 1) * this.window;

      return {
        success: current <= this.limit,
        limit: this.limit,
        remaining,
        reset,
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow the request if Redis is down
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset: now + this.window,
      };
    }
  }
}

export const rateLimit = new RateLimit(10, 60); // 10 requests per minute
export const strictRateLimit = new RateLimit(5, 300); // 5 requests per 5 minutes

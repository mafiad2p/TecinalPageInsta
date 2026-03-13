import { getRedis, cacheIncrBy } from "../memory/redis.cache.js";
import { FACEBOOK_API_LIMITS } from "../config/constants.js";
import { childLogger } from "../core/logger.js";

const log = childLogger({ module: "rate-limiter" });

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function checkFacebookRateLimit(pageId: string): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = `rate:fb:${pageId}`;
  const ttlKey = `${key}:ttl`;

  const current = await cacheIncrBy(key, 1);

  if (current === 1) {
    await redis.expire(key, 3600);
  }

  const ttl = await redis.ttl(key);
  const limit = FACEBOOK_API_LIMITS.CALLS_PER_PAGE_PER_HOUR;
  const remaining = Math.max(0, limit - current);
  const allowed = current <= limit;

  if (!allowed) {
    log.warn({ pageId, current, limit }, "Facebook rate limit exceeded");
  }

  return { allowed, remaining, resetIn: ttl };
}

export async function withRateLimit<T>(
  pageId: string,
  fn: () => Promise<T>
): Promise<T> {
  const { allowed, resetIn } = await checkFacebookRateLimit(pageId);
  if (!allowed) {
    throw new Error(`Facebook API rate limit exceeded for page ${pageId}. Resets in ${resetIn}s`);
  }
  return fn();
}

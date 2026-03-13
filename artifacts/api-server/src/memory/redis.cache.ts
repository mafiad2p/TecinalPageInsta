import Redis from "ioredis";
import { env } from "../config/env.js";
import { childLogger } from "../core/logger.js";

const log = childLogger({ module: "redis" });

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    redis.on("error", (err) => log.error({ err }, "Redis error"));
    redis.on("connect", () => log.info("Redis connected"));
    redis.on("ready", () => log.info("Redis ready"));
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await getRedis().del(key);
}

export async function cacheIncrBy(key: string, by = 1): Promise<number> {
  return getRedis().incrby(key, by);
}

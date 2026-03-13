import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { cacheGet, cacheSet, cacheDel } from "../memory/redis.cache.js";
import { REDIS_KEYS } from "./constants.js";
import { childLogger } from "../core/logger.js";

const log = childLogger({ module: "prompt-manager" });
const PROMPT_TTL = 300; // 5 minutes cache

export async function getPrompt(key: string): Promise<string | null> {
  const cached = await cacheGet<string>(REDIS_KEYS.PROMPT_CACHE(key));
  if (cached) return cached;

  const rows = await db.execute(
    sql`SELECT prompt_text FROM ai_prompts WHERE key = ${key} AND is_active = true LIMIT 1`
  );

  if (!rows.rows.length) {
    log.warn({ key }, "Prompt not found");
    return null;
  }

  const text = rows.rows[0]!.prompt_text as string;
  await cacheSet(REDIS_KEYS.PROMPT_CACHE(key), text, PROMPT_TTL);
  return text;
}

export async function invalidatePromptCache(key: string): Promise<void> {
  await cacheDel(REDIS_KEYS.PROMPT_CACHE(key));
  log.info({ key }, "Prompt cache invalidated");
}

export async function updatePrompt(key: string, promptText: string): Promise<void> {
  await db.execute(
    sql`UPDATE ai_prompts SET prompt_text = ${promptText}, updated_at = NOW() WHERE key = ${key}`
  );
  await invalidatePromptCache(key);
  log.info({ key }, "Prompt updated");
}

export async function listPrompts() {
  const rows = await db.execute(
    sql`SELECT id, key, description, prompt_text, is_active, updated_at FROM ai_prompts ORDER BY key`
  );
  return rows.rows;
}

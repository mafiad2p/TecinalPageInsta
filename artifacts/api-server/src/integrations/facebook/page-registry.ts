import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "../../memory/redis.cache.js";
import { REDIS_KEYS } from "../../config/constants.js";
import { childLogger } from "../../core/logger.js";

const log = childLogger({ module: "page-registry" });

export interface FacebookPage {
  id: number;
  pageId: string;
  pageName: string;
  accessToken: string;
  instagramAccountId: string | null;
  isActive: boolean;
  config: Record<string, unknown>;
}

export async function getPage(pageId: string): Promise<FacebookPage | null> {
  const cached = await cacheGet<FacebookPage>(REDIS_KEYS.PAGE_CONFIG(pageId));
  if (cached) return cached;

  const rows = await db.execute(
    sql`SELECT id, page_id, page_name, access_token, instagram_account_id, is_active, config
        FROM facebook_pages WHERE page_id = ${pageId} AND is_active = true LIMIT 1`
  );

  if (!rows.rows.length) {
    log.warn({ pageId }, "Page not found in registry");
    return null;
  }

  const row = rows.rows[0]!;
  const page: FacebookPage = {
    id: row.id as number,
    pageId: row.page_id as string,
    pageName: row.page_name as string,
    accessToken: row.access_token as string,
    instagramAccountId: row.instagram_account_id as string | null,
    isActive: row.is_active as boolean,
    config: (row.config as Record<string, unknown>) ?? {},
  };

  await cacheSet(REDIS_KEYS.PAGE_CONFIG(pageId), page, 600);
  return page;
}

export async function getPageByInstagramId(igAccountId: string): Promise<FacebookPage | null> {
  const cacheKey = `ig_page:${igAccountId}`;
  const cached = await cacheGet<FacebookPage>(cacheKey);
  if (cached) return cached;

  const rows = await db.execute(
    sql`SELECT id, page_id, page_name, access_token, instagram_account_id, is_active, config
        FROM facebook_pages WHERE instagram_account_id = ${igAccountId} AND is_active = true LIMIT 1`
  );

  if (!rows.rows.length) {
    log.warn({ igAccountId }, "Page not found by IG account ID");
    return null;
  }

  const row = rows.rows[0]!;
  const page: FacebookPage = {
    id: row.id as number,
    pageId: row.page_id as string,
    pageName: row.page_name as string,
    accessToken: row.access_token as string,
    instagramAccountId: row.instagram_account_id as string | null,
    isActive: row.is_active as boolean,
    config: (row.config as Record<string, unknown>) ?? {},
  };

  await cacheSet(cacheKey, page, 600);
  return page;
}

export async function getAllActivePages(): Promise<FacebookPage[]> {
  const rows = await db.execute(
    sql`SELECT id, page_id, page_name, access_token, instagram_account_id, is_active, config
        FROM facebook_pages WHERE is_active = true ORDER BY id`
  );

  return rows.rows.map((row) => ({
    id: row.id as number,
    pageId: row.page_id as string,
    pageName: row.page_name as string,
    accessToken: row.access_token as string,
    instagramAccountId: row.instagram_account_id as string | null,
    isActive: row.is_active as boolean,
    config: (row.config as Record<string, unknown>) ?? {},
  }));
}

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { childLogger } from "../core/logger.js";
import { cacheDel } from "../memory/redis.cache.js";
import { REDIS_KEYS } from "../config/constants.js";

const router = Router();
const log = childLogger({ module: "page-routes" });

router.get("/pages", async (_req: Request, res: Response) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, page_id, page_name, instagram_account_id, is_active, config, created_at FROM facebook_pages ORDER BY id`
    );
    res.json({ success: true, data: rows.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch pages");
    res.status(500).json({ success: false, error: "Failed to fetch pages" });
  }
});

router.post("/pages", async (req: Request, res: Response) => {
  const { pageId, pageName, accessToken, instagramAccountId, config } = req.body;
  try {
    const result = await db.execute(sql`
      INSERT INTO facebook_pages (page_id, page_name, access_token, instagram_account_id, config)
      VALUES (${pageId}, ${pageName}, ${accessToken}, ${instagramAccountId ?? null}, ${JSON.stringify(config ?? {})}::jsonb)
      RETURNING id, page_id, page_name, instagram_account_id, is_active, config
    `);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    log.error({ err }, "Failed to create page");
    res.status(500).json({ success: false, error: "Failed to create page" });
  }
});

router.put("/pages/:pageId", async (req: Request, res: Response) => {
  const { pageId } = req.params;
  const { pageName, accessToken, instagramAccountId, isActive, config } = req.body;
  try {
    await db.execute(sql`
      UPDATE facebook_pages SET
        page_name = COALESCE(${pageName}, page_name),
        access_token = COALESCE(${accessToken}, access_token),
        instagram_account_id = COALESCE(${instagramAccountId}, instagram_account_id),
        is_active = COALESCE(${isActive}, is_active),
        config = COALESCE(${JSON.stringify(config)}::jsonb, config),
        updated_at = NOW()
      WHERE page_id = ${pageId}
    `);
    await cacheDel(REDIS_KEYS.PAGE_CONFIG(pageId));
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to update page");
    res.status(500).json({ success: false, error: "Failed to update page" });
  }
});

export default router;

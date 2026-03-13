import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { childLogger } from "../core/logger.js";
import { cacheDel } from "../memory/redis.cache.js";
import { REDIS_KEYS } from "../config/constants.js";

const router = Router();
const log = childLogger({ module: "page-routes" });

router.get("/pages", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, page_id, page_name, instagram_account_id, is_active, config, created_at FROM facebook_pages ORDER BY id"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch pages");
    res.status(500).json({ success: false, error: "Failed to fetch pages" });
  }
});

router.post("/pages", async (req: Request, res: Response) => {
  const { pageId, pageName, accessToken, instagramAccountId, config } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO facebook_pages (page_id, page_name, access_token, instagram_account_id, config)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, page_id, page_name, instagram_account_id, is_active, config`,
      [pageId, pageName, accessToken, instagramAccountId ?? null, JSON.stringify(config ?? {})]
    );
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
    await pool.query(
      `UPDATE facebook_pages SET
        page_name = COALESCE($1, page_name),
        access_token = COALESCE($2, access_token),
        instagram_account_id = COALESCE($3, instagram_account_id),
        is_active = COALESCE($4, is_active),
        config = COALESCE($5::jsonb, config),
        updated_at = NOW()
       WHERE page_id = $6`,
      [pageName, accessToken, instagramAccountId, isActive, config ? JSON.stringify(config) : null, pageId]
    );
    await cacheDel(REDIS_KEYS.PAGE_CONFIG(pageId));
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to update page");
    res.status(500).json({ success: false, error: "Failed to update page" });
  }
});

export default router;

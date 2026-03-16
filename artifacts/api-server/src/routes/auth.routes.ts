import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import axios from "axios";
import { pool } from "@workspace/db";
import { childLogger } from "../core/logger.js";
import { cacheDel, cacheGet, cacheSet } from "../memory/redis.cache.js";
import { REDIS_KEYS } from "../config/constants.js";

const router = Router();
const log = childLogger({ module: "auth-routes" });
const FB_API_BASE = "https://graph.facebook.com/v21.0";

function getAppCredentials() {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  return { appId, appSecret };
}

function getApiBaseUrl(req: Request): string {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL;
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

router.get("/auth/facebook/config", (_req: Request, res: Response) => {
  const { appId } = getAppCredentials();
  if (!appId) {
    res.json({ success: true, data: { configured: false, appId: null } });
    return;
  }
  res.json({ success: true, data: { configured: true, appId } });
});

router.get("/auth/facebook/init", async (_req: Request, res: Response) => {
  const { appId } = getAppCredentials();
  if (!appId) {
    res.status(400).json({ success: false, error: "Facebook App chưa được cấu hình" });
    return;
  }

  const state = crypto.randomBytes(32).toString("hex");
  await cacheSet(`oauth_state:${state}`, { valid: true }, 600);

  res.json({ success: true, data: { state } });
});

router.get("/auth/facebook/callback", async (req: Request, res: Response) => {
  const { code, error, error_description, state } = req.query;
  const dashboardUrl = process.env.DASHBOARD_URL || "";

  if (error) {
    log.error({ error, error_description }, "Facebook OAuth error");
    res.redirect(`${dashboardUrl}/settings?error=${encodeURIComponent(String(error_description || error))}`);
    return;
  }

  if (!state || typeof state !== "string") {
    log.warn("OAuth callback missing state parameter");
    res.redirect(`${dashboardUrl}/settings?error=${encodeURIComponent("Yêu cầu không hợp lệ (thiếu state)")}`);
    return;
  }

  const cachedState = await cacheGet<{ valid: boolean }>(`oauth_state:${state}`);
  if (!cachedState?.valid) {
    log.warn({ state }, "OAuth callback invalid or expired state");
    res.redirect(`${dashboardUrl}/settings?error=${encodeURIComponent("Phiên xác thực đã hết hạn. Vui lòng thử lại.")}`);
    return;
  }
  await cacheDel(`oauth_state:${state}`);

  if (!code || typeof code !== "string") {
    res.redirect(`${dashboardUrl}/settings?error=${encodeURIComponent("Không nhận được mã xác thực từ Facebook")}`);
    return;
  }

  const { appId, appSecret } = getAppCredentials();
  if (!appId || !appSecret) {
    res.redirect(`${dashboardUrl}/settings?error=${encodeURIComponent("Facebook App chưa được cấu hình trên server")}`);
    return;
  }

  try {
    const redirectUri = `${getApiBaseUrl(req)}/api/auth/facebook/callback`;

    const tokenResponse = await axios.get(`${FB_API_BASE}/oauth/access_token`, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      },
    });

    const shortLivedToken = tokenResponse.data.access_token;
    log.info("Obtained short-lived user token");

    const longLivedResponse = await axios.get(`${FB_API_BASE}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedUserToken = longLivedResponse.data.access_token;
    log.info("Exchanged for long-lived user token");

    const pagesResponse = await axios.get(`${FB_API_BASE}/me/accounts`, {
      params: {
        access_token: longLivedUserToken,
        fields: "id,name,access_token,instagram_business_account",
      },
    });

    const fbPages = pagesResponse.data.data || [];
    log.info({ pageCount: fbPages.length }, "Fetched user pages");

    let connectedCount = 0;
    for (const fbPage of fbPages) {
      const pageId = fbPage.id;
      const pageName = fbPage.name;
      const pageAccessToken = fbPage.access_token;
      const igAccountId = fbPage.instagram_business_account?.id || null;

      const existing = await pool.query(
        "SELECT id FROM facebook_pages WHERE page_id = $1",
        [pageId]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE facebook_pages SET
            page_name = $1,
            access_token = $2,
            instagram_account_id = COALESCE($3, instagram_account_id),
            is_active = true,
            updated_at = NOW()
           WHERE page_id = $4`,
          [pageName, pageAccessToken, igAccountId, pageId]
        );
        await cacheDel(REDIS_KEYS.PAGE_CONFIG(pageId));
        log.info({ pageId, pageName }, "Updated existing page token");
      } else {
        await pool.query(
          `INSERT INTO facebook_pages (page_id, page_name, access_token, instagram_account_id, config)
           VALUES ($1, $2, $3, $4, $5)`,
          [pageId, pageName, pageAccessToken, igAccountId, JSON.stringify({})]
        );
        log.info({ pageId, pageName, igAccountId }, "Connected new page");
      }
      connectedCount++;
    }

    log.info({ connectedCount }, "Facebook OAuth completed successfully");
    res.redirect(`${dashboardUrl}/settings?success=true&count=${connectedCount}`);
  } catch (err: any) {
    const errMsg = err.response?.data?.error?.message || err.message || "Unknown error";
    log.error({ err: errMsg }, "Facebook OAuth callback failed");
    res.redirect(`${dashboardUrl}/settings?error=${encodeURIComponent(errMsg)}`);
  }
});

router.post("/auth/facebook/disconnect/:pageId", async (req: Request, res: Response) => {
  const { pageId } = req.params;

  if (!/^\d+$/.test(pageId)) {
    res.status(400).json({ success: false, error: "Page ID không hợp lệ" });
    return;
  }

  const existing = await pool.query(
    "SELECT id FROM facebook_pages WHERE page_id = $1 AND is_active = true",
    [pageId]
  );
  if (existing.rows.length === 0) {
    res.status(404).json({ success: false, error: "Không tìm thấy trang" });
    return;
  }

  try {
    await pool.query(
      "UPDATE facebook_pages SET is_active = false, updated_at = NOW() WHERE page_id = $1",
      [pageId]
    );
    await cacheDel(REDIS_KEYS.PAGE_CONFIG(pageId));
    log.info({ pageId }, "Disconnected page");
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to disconnect page");
    res.status(500).json({ success: false, error: "Không thể ngắt kết nối trang" });
  }
});

export default router;

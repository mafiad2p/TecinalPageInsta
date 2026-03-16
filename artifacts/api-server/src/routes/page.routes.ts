import { Router, type Request, type Response } from "express";
import axios from "axios";
import { pool } from "@workspace/db";
import { childLogger } from "../core/logger.js";
import { cacheDel } from "../memory/redis.cache.js";
import { REDIS_KEYS } from "../config/constants.js";

const router = Router();
const log = childLogger({ module: "page-routes" });
const FB_API = "https://graph.facebook.com/v19.0";

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

router.post("/pages/:pageId/test-token", async (req: Request, res: Response) => {
  const { pageId } = req.params;
  try {
    const result = await pool.query(
      "SELECT access_token, page_name, instagram_account_id FROM facebook_pages WHERE page_id = $1 AND is_active = true",
      [pageId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Page không tìm thấy" });
      return;
    }

    const { access_token, page_name, instagram_account_id } = result.rows[0];

    const fbResult = await axios.get(`${FB_API}/me`, {
      params: { access_token, fields: "id,name" },
    });

    const response: any = {
      success: true,
      data: {
        page_name,
        page_id: pageId,
        fb_api_response: fbResult.data,
        token_valid: true,
        instagram_account_id,
      },
    };

    if (instagram_account_id) {
      try {
        const igResult = await axios.get(`${FB_API}/${instagram_account_id}`, {
          params: { access_token, fields: "id,username,name,profile_picture_url" },
        });
        response.data.instagram = igResult.data;
      } catch (igErr: any) {
        response.data.instagram_error = igErr.response?.data?.error?.message || igErr.message;
      }
    }

    const permsResult = await axios.get(`${FB_API}/${pageId}/subscribed_apps`, {
      params: { access_token },
    });
    response.data.subscribed_fields = permsResult.data;

    const { appId, appSecret } = getAppCredentials();
    if (appId && appSecret) {
      try {
        const debugResult = await axios.get(`${FB_API}/debug_token`, {
          params: {
            input_token: access_token,
            access_token: `${appId}|${appSecret}`,
          },
        });
        const tokenData = debugResult.data?.data;
        response.data.token_debug = {
          app_id: tokenData?.app_id,
          type: tokenData?.type,
          is_valid: tokenData?.is_valid,
          scopes: tokenData?.scopes,
          granular_scopes: tokenData?.granular_scopes,
          expires_at: tokenData?.expires_at,
        };
      } catch (debugErr: any) {
        response.data.token_debug_error = debugErr.response?.data?.error?.message || debugErr.message;
      }
    }

    res.json(response);
  } catch (err: any) {
    const fbError = err.response?.data?.error;
    res.status(400).json({
      success: false,
      error: fbError?.message || err.message,
      fb_error_code: fbError?.code,
      fb_error_subcode: fbError?.error_subcode,
      token_valid: false,
    });
  }
});

router.post("/pages/:pageId/test-send", async (req: Request, res: Response) => {
  const { pageId } = req.params;
  const { recipientId, message, platform } = req.body;

  if (!recipientId || !message) {
    res.status(400).json({ success: false, error: "recipientId và message là bắt buộc" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT access_token, instagram_account_id FROM facebook_pages WHERE page_id = $1 AND is_active = true",
      [pageId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Page không tìm thấy" });
      return;
    }

    const { access_token, instagram_account_id } = result.rows[0];

    const fbResult = await axios.post(
      `${FB_API}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: "MESSAGE_TAG",
        tag: "HUMAN_AGENT",
      },
      { params: { access_token } }
    );
    res.json({ success: true, platform: platform || "FACEBOOK", instagram_account_id, response: fbResult.data });
  } catch (err: any) {
    const fbError = err.response?.data?.error;
    log.error({ err: fbError || err.message }, "Test send failed");
    res.status(400).json({
      success: false,
      error: fbError?.message || err.message,
      fb_error_code: fbError?.code,
      fb_error_subcode: fbError?.error_subcode,
      fb_error_type: fbError?.type,
      fb_fbtrace_id: fbError?.fbtrace_id,
    });
  }
});

router.post("/pages/:pageId/diagnose-send", async (req: Request, res: Response) => {
  const { pageId } = req.params;
  const { recipientId } = req.body;

  if (!recipientId) {
    res.status(400).json({ success: false, error: "recipientId là bắt buộc" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT access_token, instagram_account_id FROM facebook_pages WHERE page_id = $1 AND is_active = true",
      [pageId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Page không tìm thấy" });
      return;
    }

    const { access_token, instagram_account_id } = result.rows[0];
    const testMsg = "Test from OpenClaw diagnostic";
    const results: Record<string, any> = {};

    const tests = [
      {
        name: "v19_human_agent",
        url: `https://graph.facebook.com/v19.0/me/messages`,
        body: { recipient: { id: recipientId }, message: { text: testMsg }, messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" },
      },
      {
        name: "v19_response",
        url: `https://graph.facebook.com/v19.0/me/messages`,
        body: { recipient: { id: recipientId }, message: { text: testMsg }, messaging_type: "RESPONSE" },
      },
      {
        name: "v19_no_type",
        url: `https://graph.facebook.com/v19.0/me/messages`,
        body: { recipient: { id: recipientId }, message: { text: testMsg } },
      },
      {
        name: "v21_human_agent",
        url: `https://graph.facebook.com/v21.0/me/messages`,
        body: { recipient: { id: recipientId }, message: { text: testMsg }, messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" },
      },
      {
        name: "v21_response",
        url: `https://graph.facebook.com/v21.0/me/messages`,
        body: { recipient: { id: recipientId }, message: { text: testMsg }, messaging_type: "RESPONSE" },
      },
      {
        name: "v21_no_type",
        url: `https://graph.facebook.com/v21.0/me/messages`,
        body: { recipient: { id: recipientId }, message: { text: testMsg } },
      },
    ];

    if (instagram_account_id) {
      tests.push(
        {
          name: "v19_ig_endpoint",
          url: `https://graph.facebook.com/v19.0/${instagram_account_id}/messages`,
          body: { recipient: { id: recipientId }, message: { text: testMsg } },
        },
        {
          name: "v21_ig_endpoint",
          url: `https://graph.facebook.com/v21.0/${instagram_account_id}/messages`,
          body: { recipient: { id: recipientId }, message: { text: testMsg } },
        }
      );
    }

    for (const test of tests) {
      try {
        const resp = await axios.post(test.url, test.body, { params: { access_token } });
        results[test.name] = { success: true, data: resp.data };
      } catch (err: any) {
        const fbErr = err.response?.data?.error;
        results[test.name] = {
          success: false,
          error_code: fbErr?.code,
          error_subcode: fbErr?.error_subcode,
          error_message: fbErr?.message,
          error_type: fbErr?.type,
        };
      }
    }

    res.json({ success: true, recipient_id: recipientId, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function getAppCredentials() {
  return {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
  };
}

export default router;

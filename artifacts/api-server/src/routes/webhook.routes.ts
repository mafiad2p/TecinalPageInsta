import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";
import { childLogger } from "../core/logger.js";
import { enqueueTask } from "../core/task-runner.js";
import { pool } from "@workspace/db";

const router = Router();
const log = childLogger({ module: "webhook" });

async function debugLog(endpoint: string, objectType: string, body: unknown) {
  try {
    await pool.query(
      "INSERT INTO webhook_debug (endpoint, object_type, raw_body) VALUES ($1, $2, $3)",
      [endpoint, objectType, JSON.stringify(body)]
    );
  } catch (_) {}
}

router.get("/webhook/facebook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.FACEBOOK_VERIFY_TOKEN) {
    log.info("Facebook webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post("/webhook/facebook", (req: Request, res: Response) => {
  const body = req.body;

  debugLog("facebook", body.object ?? "unknown", body).catch(() => {});

  if (body.object !== "page" && body.object !== "instagram") {
    log.warn({ object: body.object }, "Unknown webhook object type — rejecting");
    return res.sendStatus(404);
  }

  res.sendStatus(200);

  const isInstagram = body.object === "instagram";

  for (const entry of body.entry ?? []) {
    const pageId = entry.id as string;

    log.info({ pageId, isInstagram, changes: entry.changes?.length ?? 0, messaging: entry.messaging?.length ?? 0 }, "Webhook entry");

    if (!isInstagram) {
      for (const change of entry.changes ?? []) {
        if (change.field === "feed" && change.value?.item === "comment") {
          const value = change.value;
          enqueueTask({
            type: "comment.process",
            traceId: `fb-comment-${value.comment_id}`,
            data: {
              commentId: value.comment_id,
              postId: value.post_id,
              senderId: value.from?.id,
              senderName: value.from?.name,
              content: value.message,
              pageId,
              platform: "FACEBOOK",
              isPageSelf: value.from?.id === pageId,
            },
          }).catch((err) => log.error({ err }, "Failed to enqueue comment"));
        }
      }
    }

    for (const event of entry.messaging ?? []) {
      if (event.message && !event.message.is_echo) {
        const platform = isInstagram ? "INSTAGRAM" : "FACEBOOK";
        log.info({ platform, senderId: event.sender?.id, mid: event.message?.mid }, "Incoming DM webhook");
        enqueueTask({
          type: "dm.process",
          traceId: `${platform.toLowerCase()}-dm-${event.message.mid}`,
          data: {
            messageId: event.message.mid,
            senderId: event.sender?.id,
            senderName: "Customer",
            content: event.message.text ?? "",
            pageId,
            platform,
          },
        }).catch((err) => log.error({ err }, `Failed to enqueue ${platform} DM`));
      }
    }
  }
});

router.get("/webhook/instagram", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.FACEBOOK_VERIFY_TOKEN) {
    log.info("Instagram webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post("/webhook/instagram", (req: Request, res: Response) => {
  const body = req.body;
  res.sendStatus(200);

  debugLog("instagram", body.object ?? "unknown", body).catch(() => {});

  for (const entry of body.entry ?? []) {
    const pageId = entry.id as string;

    log.info({ pageId, messaging: entry.messaging?.length ?? 0, changes: entry.changes?.length ?? 0 }, "Instagram webhook entry");

    for (const event of entry.messaging ?? []) {
      if (event.message && !event.message.is_echo) {
        log.info({ senderId: event.sender?.id, mid: event.message?.mid }, "Incoming Instagram DM");
        enqueueTask({
          type: "dm.process",
          traceId: `ig-dm-${event.message.mid}`,
          data: {
            messageId: event.message.mid,
            senderId: event.sender?.id,
            senderName: "Customer",
            content: event.message.text ?? "",
            pageId,
            platform: "INSTAGRAM",
          },
        }).catch((err) => log.error({ err }, "Failed to enqueue IG DM"));
      }
    }
  }
});

export default router;

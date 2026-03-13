import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";
import { processFacebookComment } from "../workflows/comment-moderation.workflow.js";
import { processDM } from "../workflows/dm-chatbot.workflow.js";
import { childLogger } from "../core/logger.js";
import { enqueueTask } from "../core/task-runner.js";
import crypto from "crypto";

const router = Router();
const log = childLogger({ module: "webhook" });

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

  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  res.sendStatus(200);

  for (const entry of body.entry ?? []) {
    const pageId = entry.id as string;

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

    for (const event of entry.messaging ?? []) {
      if (event.message && !event.message.is_echo) {
        enqueueTask({
          type: "dm.process",
          traceId: `fb-dm-${event.message.mid}`,
          data: {
            messageId: event.message.mid,
            senderId: event.sender?.id,
            senderName: "Customer",
            content: event.message.text ?? "",
            pageId,
            platform: "FACEBOOK",
          },
        }).catch((err) => log.error({ err }, "Failed to enqueue DM"));
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

  for (const entry of body.entry ?? []) {
    const pageId = entry.id as string;

    for (const event of entry.messaging ?? []) {
      if (event.message && !event.message.is_echo) {
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

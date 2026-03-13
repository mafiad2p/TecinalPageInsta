import { classifyComment } from "../integrations/openai/classifier.js";
import { generatePublicReply } from "../integrations/openai/chat.js";
import { hideComment, deleteComment, replyToComment } from "../integrations/facebook/comment.js";
import { sendDM } from "../integrations/facebook/messenger.js";
import { alertNegativeComment, alertBuyIntent } from "../integrations/telegram/alert.js";
import { getPage } from "../integrations/facebook/page-registry.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { COMMENT_TYPES } from "../config/constants.js";
import { childLogger } from "../core/logger.js";

const log = childLogger({ module: "comment-moderation" });

export interface FacebookComment {
  commentId: string;
  postId: string;
  senderId: string;
  senderName: string;
  content: string;
  pageId: string;
  platform: "FACEBOOK" | "INSTAGRAM";
  isPageSelf?: boolean;
  postUrl?: string;
}

export async function processFacebookComment(comment: FacebookComment): Promise<void> {
  const traceId = `comment-${comment.commentId}`;
  const log2 = log.child({ traceId, commentId: comment.commentId });

  log2.info({ content: comment.content.slice(0, 50) }, "Processing comment");

  if (comment.isPageSelf) {
    log2.info("Self-page comment — skipping");
    await logComment(comment, COMMENT_TYPES.SELF_PAGE, "SKIP", null);
    return;
  }

  const page = await getPage(comment.pageId);
  if (!page) {
    log2.warn("Page not found in registry");
    return;
  }

  const commentType = await classifyComment(comment.content);
  log2.info({ commentType }, "Comment classified");

  switch (commentType) {
    case COMMENT_TYPES.NEGATIVE: {
      await deleteComment(page.pageId, page.accessToken, comment.commentId);
      await alertNegativeComment({
        pageId: page.pageId,
        pageName: page.pageName,
        commentId: comment.commentId,
        senderName: comment.senderName,
        content: comment.content,
        postUrl: comment.postUrl,
      });
      await logComment(comment, commentType, "DELETE", null);
      log2.info("Negative comment handled");
      break;
    }

    case COMMENT_TYPES.BUY_INTENT: {
      const publicReply = await generatePublicReply(comment.content);
      await replyToComment(page.pageId, page.accessToken, comment.commentId, publicReply);

      const dmProducts = await getProductDMMessage();
      await sendDM(page.pageId, page.accessToken, comment.senderId, dmProducts);

      await hideComment(page.pageId, page.accessToken, comment.commentId);

      await alertBuyIntent({
        pageId: page.pageId,
        pageName: page.pageName,
        commentId: comment.commentId,
        senderName: comment.senderName,
        senderId: comment.senderId,
        content: comment.content,
      });

      await logComment(comment, commentType, "REPLY_AND_DM_AND_HIDE", publicReply);
      log2.info("Buy intent comment handled");
      break;
    }

    default: {
      await hideComment(page.pageId, page.accessToken, comment.commentId);
      await logComment(comment, commentType, "HIDE", null);
      log2.info("Other comment hidden");
    }
  }
}

async function getProductDMMessage(): Promise<string> {
  const rows = await db.execute(
    sql`SELECT name, price, currency, buy_link FROM products WHERE is_active = true LIMIT 5`
  );
  if (!rows.rows.length) {
    return "Thank you for your interest! Please visit our store for more details. 😊";
  }

  const lines = (rows.rows as any[]).map(
    (p) => `• ${p.name} — ${p.price} ${p.currency}\n  🛒 ${p.buy_link}`
  );

  return [
    "Thank you for your interest! 😊 Here are our products:\n",
    ...lines,
    "\n📦 US Shipping: 15-25 days | Global: 20-30 days",
    "↩️ 30-day return policy",
  ].join("\n");
}

async function logComment(
  comment: FacebookComment,
  classifiedType: string,
  action: string,
  aiResponse: string | null
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO comment_logs
        (page_id, comment_id, post_id, sender_id, sender_name, content, platform, classified_type, action_taken, ai_response)
      VALUES
        (${comment.pageId}, ${comment.commentId}, ${comment.postId}, ${comment.senderId},
         ${comment.senderName}, ${comment.content}, ${comment.platform}, ${classifiedType},
         ${action}, ${aiResponse})
      ON CONFLICT (comment_id) DO NOTHING
    `);
  } catch (err) {
    log.error({ err }, "Failed to log comment");
  }
}

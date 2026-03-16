import { classifyDMIntent } from "../integrations/openai/classifier.js";
import { generateChatReply } from "../integrations/openai/chat.js";
import { sendDM } from "../integrations/facebook/messenger.js";
import { sendIGDM } from "../integrations/instagram/dm.js";
import { alertEscalatedDM } from "../integrations/telegram/alert.js";
import { getPage, getPageByInstagramId } from "../integrations/facebook/page-registry.js";
import { getConversation, appendMessage } from "../memory/conversation.memory.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ESCALATION_INTENTS } from "../config/constants.js";
import { childLogger } from "../core/logger.js";

const log = childLogger({ module: "dm-chatbot" });

export interface IncomingDM {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  pageId: string;
  platform: "FACEBOOK" | "INSTAGRAM";
  igAccountId?: string;
}

export async function processDM(message: IncomingDM): Promise<void> {
  const traceId = `dm-${message.messageId}`;
  const log2 = log.child({ traceId, messageId: message.messageId });

  log2.info({ content: message.content.slice(0, 50) }, "Processing DM");

  const page = message.platform === "INSTAGRAM"
    ? await getPageByInstagramId(message.pageId)
    : await getPage(message.pageId);
  if (!page) {
    log2.warn({ pageId: message.pageId, platform: message.platform }, "Page not found");
    return;
  }

  const intent = await classifyDMIntent(message.content);
  log2.info({ intent }, "DM classified");

  const needsEscalation = ESCALATION_INTENTS.includes(intent as any);

  if (needsEscalation) {
    const confirmReply = await getConfirmationReply(intent, message.content);
    await sendReply(page, message, confirmReply);

    await alertEscalatedDM({
      pageId: page.pageId,
      pageName: page.pageName,
      platform: message.platform,
      senderName: message.senderName,
      intent,
      content: message.content,
    });

    await logDM(message, intent, "AUTO_REPLY_AND_ESCALATE", confirmReply, true);
    log2.info({ intent }, "Escalated DM handled");
    return;
  }

  const history = await getConversation(message.senderId, message.pageId);
  const aiReply = await generateChatReply(message.content, history);

  await appendMessage(message.senderId, message.pageId, {
    role: "user",
    content: message.content,
    timestamp: Date.now(),
  });

  await appendMessage(message.senderId, message.pageId, {
    role: "assistant",
    content: aiReply,
    timestamp: Date.now(),
  });

  await sendReply(page, message, aiReply);
  await logDM(message, intent, "AUTO_REPLY", aiReply, false);
  log2.info("General DM handled by chatbot");
}

async function sendReply(
  page: { pageId: string; accessToken: string; instagramAccountId: string | null },
  message: IncomingDM,
  replyText: string
): Promise<void> {
  if (message.platform === "INSTAGRAM" && page.instagramAccountId) {
    await sendIGDM(page.pageId, page.accessToken, page.instagramAccountId, message.senderId, replyText);
  } else {
    await sendDM(page.pageId, page.accessToken, message.senderId, replyText);
  }
}

async function getConfirmationReply(intent: string, _content: string): Promise<string> {
  const replies: Record<string, string> = {
    ORDER_TRACKING: "Cảm ơn bạn đã liên hệ về đơn hàng! 📦 Đội ngũ của chúng tôi đã nhận thông tin và sẽ cập nhật trạng thái cho bạn sớm nhất.",
    ADDRESS_CHANGE: "Chúng tôi đã nhận yêu cầu thay đổi địa chỉ của bạn! 📍 Đội ngũ sẽ xử lý và xác nhận cập nhật sớm nhất.",
    COMPLAINT: "Chúng tôi rất tiếc về trải nghiệm của bạn. 🙏 Đội ngũ đã được thông báo và sẽ liên hệ bạn sớm nhất để giải quyết.",
    REFUND: "Chúng tôi đã nhận yêu cầu hoàn tiền của bạn. 💰 Đội ngũ sẽ xem xét và phản hồi trong 1-2 ngày làm việc.",
    PAYMENT_ISSUE: "Chúng tôi đã ghi nhận vấn đề thanh toán của bạn. 💳 Đội ngũ sẽ kiểm tra và liên hệ bạn sớm nhất.",
  };
  return replies[intent] ?? "Cảm ơn bạn đã nhắn tin! Đội ngũ của chúng tôi sẽ phản hồi bạn sớm nhất. 😊";
}

async function logDM(
  message: IncomingDM,
  intent: string,
  action: string,
  aiResponse: string,
  escalated: boolean
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO dm_logs
        (page_id, message_id, sender_id, sender_name, content, platform, classified_intent, action_taken, ai_response, escalated)
      VALUES
        (${message.pageId}, ${message.messageId}, ${message.senderId}, ${message.senderName},
         ${message.content}, ${message.platform}, ${intent}, ${action}, ${aiResponse}, ${escalated})
      ON CONFLICT (message_id) DO NOTHING
    `);
  } catch (err) {
    log.error({ err }, "Failed to log DM");
  }
}

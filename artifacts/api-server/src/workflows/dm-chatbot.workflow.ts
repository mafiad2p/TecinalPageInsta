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
  await sendDM(page.pageId, page.accessToken, message.senderId, replyText);
}

async function getConfirmationReply(intent: string, _content: string): Promise<string> {
  const replies: Record<string, string> = {
    ORDER_TRACKING: "Thank you for reaching out about your order! 📦 Our team has been notified and will update you on your tracking status shortly.",
    ADDRESS_CHANGE: "We've received your address change request! 📍 Our team will process this and confirm the update shortly.",
    COMPLAINT: "We're truly sorry to hear about your experience. 🙏 Our team has been notified and will contact you shortly to resolve this.",
    REFUND: "We've received your refund request. 💰 Our team will review it and get back to you within 1-2 business days.",
    PAYMENT_ISSUE: "We've flagged your payment issue. 💳 Our team will look into this and contact you shortly.",
  };
  return replies[intent] ?? "Thank you for your message! Our team will get back to you shortly. 😊";
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

import { sendTelegramMessage } from "./client.js";
import { env } from "../../config/env.js";
import { childLogger } from "../../core/logger.js";

const log = childLogger({ module: "telegram-alert" });

function getChatId(): string {
  return env.TELEGRAM_ALERT_CHAT_ID ?? "";
}

export async function alertNegativeComment(opts: {
  pageId: string;
  pageName: string;
  commentId: string;
  senderName: string;
  content: string;
  postUrl?: string;
}): Promise<void> {
  const chatId = getChatId();
  if (!chatId) { log.warn("No Telegram chat ID configured"); return; }

  const text = [
    `🚨 <b>Negative Comment Detected</b>`,
    `📄 Page: ${opts.pageName}`,
    `👤 From: ${opts.senderName}`,
    `💬 Comment: "${opts.content.slice(0, 200)}"`,
    opts.postUrl ? `🔗 Post: ${opts.postUrl}` : "",
    `\n✅ Action: Comment deleted automatically`,
  ].filter(Boolean).join("\n");

  await sendTelegramMessage(chatId, text);
  log.info({ commentId: opts.commentId }, "Negative comment alert sent");
}

export async function alertBuyIntent(opts: {
  pageId: string;
  pageName: string;
  commentId: string;
  senderName: string;
  senderId: string;
  content: string;
}): Promise<void> {
  const chatId = getChatId();
  if (!chatId) return;

  const text = [
    `🛒 <b>Buy Intent Detected</b>`,
    `📄 Page: ${opts.pageName}`,
    `👤 From: ${opts.senderName}`,
    `💬 Comment: "${opts.content.slice(0, 200)}"`,
    `\n✅ Action: Public reply sent + DM sent + Comment hidden`,
  ].filter(Boolean).join("\n");

  await sendTelegramMessage(chatId, text);
}

export async function alertEscalatedDM(opts: {
  pageId: string;
  pageName: string;
  platform: string;
  senderName: string;
  intent: string;
  content: string;
}): Promise<void> {
  const chatId = getChatId();
  if (!chatId) return;

  const intentEmoji: Record<string, string> = {
    ORDER_TRACKING: "📦",
    ADDRESS_CHANGE: "📍",
    COMPLAINT: "😤",
    REFUND: "💰",
    PAYMENT_ISSUE: "💳",
  };

  const text = [
    `${intentEmoji[opts.intent] ?? "⚠️"} <b>DM Needs Attention</b>`,
    `📱 Platform: ${opts.platform}`,
    `📄 Page: ${opts.pageName}`,
    `👤 From: ${opts.senderName}`,
    `🏷️ Intent: ${opts.intent}`,
    `💬 Message: "${opts.content.slice(0, 200)}"`,
    `\n👉 Please respond manually`,
  ].join("\n");

  await sendTelegramMessage(chatId, text);
}

export async function alertSystemError(opts: {
  service: string;
  error: string;
  traceId?: string;
}): Promise<void> {
  const chatId = getChatId();
  if (!chatId) return;

  const text = [
    `❌ <b>System Error</b>`,
    `🔧 Service: ${opts.service}`,
    `💥 Error: ${opts.error.slice(0, 300)}`,
    opts.traceId ? `🔍 Trace: ${opts.traceId}` : "",
  ].filter(Boolean).join("\n");

  await sendTelegramMessage(chatId, text);
}

export async function sendDailyReport(report: string): Promise<void> {
  const chatId = getChatId();
  if (!chatId) return;

  const text = `📊 <b>Daily Report — ${new Date().toLocaleDateString()}</b>\n\n${report}`;
  await sendTelegramMessage(chatId, text);
}

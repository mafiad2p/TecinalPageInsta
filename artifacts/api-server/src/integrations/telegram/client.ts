import axios from "axios";
import { env } from "../../config/env.js";
import { childLogger } from "../../core/logger.js";

const log = childLogger({ module: "telegram-client" });

function getTelegramBase(): string {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" | "MarkdownV2" = "HTML"
): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    log.warn("Telegram bot token not configured");
    return;
  }

  try {
    await axios.post(`${getTelegramBase()}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    });
    log.debug({ chatId }, "Telegram message sent");
  } catch (err) {
    log.error({ chatId, err }, "Failed to send Telegram message");
  }
}

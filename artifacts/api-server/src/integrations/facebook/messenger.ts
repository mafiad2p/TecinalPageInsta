import { fbPost } from "./client.js";
import { childLogger } from "../../core/logger.js";

const log = childLogger({ module: "fb-messenger" });

export async function sendDM(
  pageId: string,
  accessToken: string,
  recipientId: string,
  message: string
): Promise<void> {
  try {
    await fbPost(pageId, accessToken, `/me/messages`, {
      recipient: { id: recipientId },
      message: { text: message },
      messaging_type: "MESSAGE_TAG",
      tag: "HUMAN_AGENT",
    });
    log.info({ recipientId, pageId }, "DM sent");
  } catch (err) {
    log.warn({ recipientId, pageId }, "HUMAN_AGENT tag failed, retrying with RESPONSE");
    try {
      await fbPost(pageId, accessToken, `/me/messages`, {
        recipient: { id: recipientId },
        message: { text: message },
        messaging_type: "RESPONSE",
      });
      log.info({ recipientId, pageId }, "DM sent (RESPONSE)");
    } catch (err2) {
      log.error({ recipientId, err: err2 }, "Failed to send DM");
    }
  }
}

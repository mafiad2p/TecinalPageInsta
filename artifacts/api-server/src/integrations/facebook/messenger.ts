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
      messaging_type: "RESPONSE",
    });
    log.info({ recipientId, pageId }, "DM sent");
  } catch (err) {
    log.error({ recipientId, err }, "Failed to send DM");
  }
}

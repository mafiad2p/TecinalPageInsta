import { igPost } from "./client.js";
import { childLogger } from "../../core/logger.js";

const log = childLogger({ module: "ig-dm" });

export async function sendIGDM(
  pageId: string,
  accessToken: string,
  igAccountId: string,
  recipientIgsid: string,
  message: string
): Promise<void> {
  try {
    await igPost(pageId, accessToken, `/${igAccountId}/messages`, {
      recipient: { id: recipientIgsid },
      message: { text: message },
    });
    log.info({ recipientIgsid, pageId }, "IG DM sent");
  } catch (err) {
    log.error({ recipientIgsid, err }, "Failed to send IG DM");
  }
}

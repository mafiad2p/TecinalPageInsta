import { fbPost } from "./client.js";
import { childLogger } from "../../core/logger.js";

const log = childLogger({ module: "fb-messenger" });

export async function sendDM(
  pageId: string,
  accessToken: string,
  recipientId: string,
  message: string,
  platform: "FACEBOOK" | "INSTAGRAM" = "FACEBOOK"
): Promise<void> {
  const payload: Record<string, unknown> = {
    recipient: { id: recipientId },
    message: { text: message },
  };

  if (platform === "FACEBOOK") {
    payload.messaging_type = "RESPONSE";
  }

  try {
    await fbPost(pageId, accessToken, `/me/messages`, payload);
    log.info({ recipientId, pageId, platform }, "DM sent");
  } catch (err: any) {
    const fbErr = err?.response?.data?.error;
    log.error(
      { recipientId, pageId, platform, error: fbErr?.message, code: fbErr?.code, subcode: fbErr?.error_subcode },
      "Failed to send DM"
    );
    throw err;
  }
}

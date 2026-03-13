import { fbPost, fbDelete } from "./client.js";
import { childLogger } from "../../core/logger.js";

const log = childLogger({ module: "fb-comment" });

export async function hideComment(
  pageId: string,
  accessToken: string,
  commentId: string
): Promise<void> {
  try {
    await fbPost(pageId, accessToken, `/${commentId}`, { is_hidden: true });
    log.info({ commentId }, "Comment hidden");
  } catch (err) {
    log.error({ commentId, err }, "Failed to hide comment");
  }
}

export async function deleteComment(
  pageId: string,
  accessToken: string,
  commentId: string
): Promise<void> {
  try {
    await fbDelete(pageId, accessToken, `/${commentId}`);
    log.info({ commentId }, "Comment deleted");
  } catch (err) {
    log.error({ commentId, err }, "Failed to delete comment");
  }
}

export async function replyToComment(
  pageId: string,
  accessToken: string,
  commentId: string,
  message: string
): Promise<void> {
  try {
    await fbPost(pageId, accessToken, `/${commentId}/comments`, { message });
    log.info({ commentId }, "Comment reply sent");
  } catch (err) {
    log.error({ commentId, err }, "Failed to reply to comment");
  }
}

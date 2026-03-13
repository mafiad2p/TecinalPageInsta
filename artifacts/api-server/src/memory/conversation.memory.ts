import { getRedis } from "./redis.cache.js";
import { REDIS_KEYS } from "../config/constants.js";
import { childLogger } from "../core/logger.js";

const log = childLogger({ module: "conversation-memory" });

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const MAX_MESSAGES = 20;
const TTL_SECONDS = 86400; // 24 hours

export async function getConversation(
  senderId: string,
  pageId: string
): Promise<Message[]> {
  const redis = getRedis();
  const key = REDIS_KEYS.CONVERSATION(senderId, pageId);
  const raw = await redis.get(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

export async function appendMessage(
  senderId: string,
  pageId: string,
  message: Message
): Promise<void> {
  const redis = getRedis();
  const key = REDIS_KEYS.CONVERSATION(senderId, pageId);
  const messages = await getConversation(senderId, pageId);
  messages.push(message);

  const trimmed = messages.slice(-MAX_MESSAGES);
  await redis.set(key, JSON.stringify(trimmed), "EX", TTL_SECONDS);
  log.debug({ senderId, pageId, total: trimmed.length }, "Message appended");
}

export async function clearConversation(
  senderId: string,
  pageId: string
): Promise<void> {
  const redis = getRedis();
  await redis.del(REDIS_KEYS.CONVERSATION(senderId, pageId));
  log.info({ senderId, pageId }, "Conversation cleared");
}

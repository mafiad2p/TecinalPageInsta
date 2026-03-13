export const COMMENT_TYPES = {
  SELF_PAGE: "SELF_PAGE",
  NEGATIVE: "NEGATIVE",
  BUY_INTENT: "BUY_INTENT",
  OTHER: "OTHER",
} as const;

export const DM_INTENTS = {
  ORDER_TRACKING: "ORDER_TRACKING",
  ADDRESS_CHANGE: "ADDRESS_CHANGE",
  COMPLAINT: "COMPLAINT",
  REFUND: "REFUND",
  PAYMENT_ISSUE: "PAYMENT_ISSUE",
  GENERAL_INQUIRY: "GENERAL_INQUIRY",
} as const;

export const ESCALATION_INTENTS = [
  DM_INTENTS.ORDER_TRACKING,
  DM_INTENTS.ADDRESS_CHANGE,
  DM_INTENTS.COMPLAINT,
  DM_INTENTS.REFUND,
  DM_INTENTS.PAYMENT_ISSUE,
] as const;

export const PLATFORMS = {
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
} as const;

export const ACTION_TYPES = {
  SKIP: "SKIP",
  DELETE: "DELETE",
  HIDE: "HIDE",
  REPLY_AND_HIDE: "REPLY_AND_HIDE",
  REPLY_AND_DM_AND_HIDE: "REPLY_AND_DM_AND_HIDE",
  AUTO_REPLY: "AUTO_REPLY",
  AUTO_REPLY_AND_ESCALATE: "AUTO_REPLY_AND_ESCALATE",
} as const;

export const FACEBOOK_API_LIMITS = {
  CALLS_PER_HOUR: 200,
  CALLS_PER_PAGE_PER_HOUR: 4800,
} as const;

export const REDIS_KEYS = {
  RATE_LIMIT: (pageId: string) => `rate:fb:${pageId}`,
  CONVERSATION: (senderId: string, pageId: string) => `conv:${pageId}:${senderId}`,
  PROMPT_CACHE: (key: string) => `prompt:${key}`,
  PAGE_CONFIG: (pageId: string) => `page:config:${pageId}`,
} as const;

export const CRON_SCHEDULES = {
  DAILY_REPORT: "0 8 * * *",
} as const;

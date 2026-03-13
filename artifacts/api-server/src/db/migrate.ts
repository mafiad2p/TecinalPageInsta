import { pool } from "@workspace/db";
import { childLogger } from "../core/logger.js";

const log = childLogger({ module: "migrate" });

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS facebook_pages (
  id           SERIAL PRIMARY KEY,
  page_id      TEXT NOT NULL UNIQUE,
  page_name    TEXT NOT NULL,
  access_token TEXT NOT NULL,
  instagram_account_id TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  config       JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  sku           TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(12,2),
  currency      TEXT NOT NULL DEFAULT 'USD',
  buy_link      TEXT,
  shipping_info JSONB NOT NULL DEFAULT '{}',
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scenarios (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  trigger_type      TEXT NOT NULL DEFAULT 'KEYWORD',
  trigger_keywords  TEXT[] NOT NULL DEFAULT '{}',
  response_template TEXT NOT NULL,
  action_type       TEXT NOT NULL DEFAULT 'REPLY',
  priority          INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comment_logs (
  id              SERIAL PRIMARY KEY,
  page_id         TEXT NOT NULL,
  comment_id      TEXT NOT NULL UNIQUE,
  post_id         TEXT,
  sender_id       TEXT,
  sender_name     TEXT,
  content         TEXT,
  platform        TEXT NOT NULL DEFAULT 'FACEBOOK',
  classified_type TEXT,
  action_taken    TEXT,
  ai_response     TEXT,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dm_logs (
  id                 SERIAL PRIMARY KEY,
  page_id            TEXT NOT NULL,
  message_id         TEXT NOT NULL UNIQUE,
  sender_id          TEXT,
  sender_name        TEXT,
  content            TEXT,
  platform           TEXT NOT NULL DEFAULT 'MESSENGER',
  classified_intent  TEXT,
  action_taken       TEXT,
  ai_response        TEXT,
  escalated          BOOLEAN NOT NULL DEFAULT false,
  processed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id                    SERIAL PRIMARY KEY,
  report_date           DATE NOT NULL UNIQUE,
  total_comments        INT NOT NULL DEFAULT 0,
  negative_comments     INT NOT NULL DEFAULT 0,
  buy_intent_comments   INT NOT NULL DEFAULT 0,
  hidden_comments       INT NOT NULL DEFAULT 0,
  total_dms             INT NOT NULL DEFAULT 0,
  escalated_dms         INT NOT NULL DEFAULT 0,
  ai_replied_dms        INT NOT NULL DEFAULT 0,
  report_data           JSONB NOT NULL DEFAULT '{}',
  sent_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_prompts (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  description TEXT,
  prompt_text TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_logs (
  id         SERIAL PRIMARY KEY,
  level      TEXT NOT NULL DEFAULT 'INFO',
  service    TEXT,
  message    TEXT NOT NULL,
  meta       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_prompts (key, description, prompt_text) VALUES
(
  'comment.classify',
  'Classify comment intent from Facebook/Instagram',
  'You are a social media comment classifier. Analyze the comment and classify it as one of: POSITIVE, NEGATIVE, NEUTRAL, BUY_INTENT, SPAM, QUESTION.

Respond with JSON: {"type": "CLASSIFICATION", "confidence": 0.0-1.0, "reason": "brief reason"}

Comment to classify: {{content}}'
),
(
  'comment.reply',
  'Generate reply to a comment',
  'You are a helpful and friendly customer service agent for an ecommerce brand. Write a short, warm, professional reply to this comment. Keep it under 100 words. Do not use emojis excessively.

Products available: {{products}}

Comment: {{content}}
Respond only with the reply text, no extra explanation.'
),
(
  'dm.intent',
  'Classify DM intent',
  'Classify this private message intent as one of: GREETING, BUY_INTENT, COMPLAINT, QUESTION, SPAM, OTHER.

Respond with JSON: {"intent": "CLASSIFICATION", "confidence": 0.0-1.0}

Message: {{content}}'
),
(
  'dm.reply',
  'Generate DM chatbot reply',
  'You are a friendly AI customer service agent for an ecommerce brand. Reply to this private message helpfully and professionally. Keep it under 150 words.

Products available: {{products}}

Customer message: {{content}}
Respond only with the reply text.'
),
(
  'daily.report',
  'Generate daily report summary',
  'Summarize the following ecommerce social media metrics for today in a concise Telegram message (use emojis, keep it under 200 words):

{{metrics}}

Write in Vietnamese.'
)
ON CONFLICT (key) DO NOTHING;
`;

export async function runMigrations(): Promise<void> {
  log.info("Running database migrations...");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  try {
    const url = new URL(dbUrl);
    log.info({ host: url.hostname, port: url.port, db: url.pathname }, "Connecting to PostgreSQL...");
  } catch {
    log.info({ dbUrl: dbUrl.slice(0, 30) + "..." }, "Connecting to PostgreSQL...");
  }

  const connectTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("PostgreSQL connection timed out after 20s")), 20000)
  );

  let client;
  try {
    client = await Promise.race([pool.connect(), connectTimeout]);
    log.info("Connected to PostgreSQL, running SQL migrations...");
    await (client as any).query(MIGRATION_SQL);
    log.info("Database migrations completed successfully");
  } catch (err) {
    log.error({ err }, "Database migration failed");
    throw err;
  } finally {
    if (client) (client as any).release();
  }
}

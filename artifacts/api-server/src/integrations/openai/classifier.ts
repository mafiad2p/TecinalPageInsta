import { getOpenAI } from "./client.js";
import { getPrompt } from "../../config/prompt-manager.js";
import { COMMENT_TYPES, DM_INTENTS } from "../../config/constants.js";
import { childLogger } from "../../core/logger.js";
import { env } from "../../config/env.js";

const log = childLogger({ module: "classifier" });

type CommentType = keyof typeof COMMENT_TYPES;
type DMIntent = keyof typeof DM_INTENTS;

export async function classifyComment(text: string): Promise<CommentType> {
  const systemPrompt = await getPrompt("comment_classifier");
  if (!systemPrompt) return "OTHER";

  try {
    const response = await getOpenAI().chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    const raw = response.choices[0]?.message.content?.trim().toUpperCase() ?? "OTHER";
    const valid = Object.keys(COMMENT_TYPES);
    const result = valid.includes(raw) ? (raw as CommentType) : "OTHER";
    log.debug({ text: text.slice(0, 50), result }, "Comment classified");
    return result;
  } catch (err) {
    log.error({ err }, "Comment classification failed");
    return "OTHER";
  }
}

export async function classifyDMIntent(text: string): Promise<DMIntent> {
  const systemPrompt = await getPrompt("dm_intent_classifier");
  if (!systemPrompt) return "GENERAL_INQUIRY";

  try {
    const response = await getOpenAI().chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    const raw = response.choices[0]?.message.content?.trim().toUpperCase() ?? "GENERAL_INQUIRY";
    const valid = Object.keys(DM_INTENTS);
    const result = valid.includes(raw) ? (raw as DMIntent) : "GENERAL_INQUIRY";
    log.debug({ text: text.slice(0, 50), result }, "DM intent classified");
    return result;
  } catch (err) {
    log.error({ err }, "DM classification failed");
    return "GENERAL_INQUIRY";
  }
}

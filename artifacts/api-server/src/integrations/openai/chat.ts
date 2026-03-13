import type OpenAI from "openai";
import { getOpenAI } from "./client.js";
import { getPrompt } from "../../config/prompt-manager.js";
import { Message } from "../../memory/conversation.memory.js";
import { childLogger } from "../../core/logger.js";
import { env } from "../../config/env.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const log = childLogger({ module: "openai-chat" });

interface ProductContext {
  name: string;
  description: string;
  price: number;
  currency: string;
  buy_link: string;
  shipping_info: Record<string, string>;
}

async function getProductContext(): Promise<string> {
  const rows = await db.execute(
    sql`SELECT name, description, price, currency, buy_link, shipping_info FROM products WHERE is_active = true`
  );
  const products = rows.rows as unknown as ProductContext[];
  if (!products.length) return "";

  return products
    .map(
      (p) =>
        `Product: ${p.name}\nPrice: ${p.price} ${p.currency}\nBuy: ${p.buy_link}\nShipping: processing ${p.shipping_info.processing}, US ${p.shipping_info.us_delivery}, Global ${p.shipping_info.global_delivery}\nReturn: ${p.shipping_info.return_policy ?? "30 days"}\nDescription: ${p.description}`
    )
    .join("\n\n");
}

export async function generateChatReply(
  userMessage: string,
  history: Message[]
): Promise<string> {
  const systemPrompt = await getPrompt("dm_chatbot_system");
  const productContext = await getProductContext();

  const fullSystem = [
    systemPrompt ?? "You are a helpful customer service assistant.",
    productContext ? `\n\nPRODUCT CATALOG:\n${productContext}` : "",
  ].join("");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: fullSystem },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await getOpenAI().chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message.content ?? "Sorry, I couldn't generate a response.";
    log.debug({ tokens: response.usage?.total_tokens }, "Chat reply generated");
    return reply;
  } catch (err) {
    log.error({ err }, "Chat generation failed");
    return "Thank you for your message! Our team will get back to you shortly. 😊";
  }
}

export async function generatePublicReply(commentText: string): Promise<string> {
  const systemPrompt = await getPrompt("buy_intent_reply");
  if (!systemPrompt) return "Thank you for your interest! Check your inbox for details. 😊";

  try {
    const response = await getOpenAI().chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Customer comment: "${commentText}"` },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    return response.choices[0]?.message.content ?? "Thank you! Check your inbox. 😊";
  } catch (err) {
    log.error({ err }, "Public reply generation failed");
    return "Thank you for your interest! We've sent you a message with details. 😊";
  }
}

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendDailyReport } from "../integrations/telegram/alert.js";
import { getOpenAI } from "../integrations/openai/client.js";
import { env } from "../config/env.js";
import { childLogger } from "../core/logger.js";

const log = childLogger({ module: "daily-report" });

export async function generateAndSendDailyReport(): Promise<void> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]!;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0]!;

  log.info({ date: yesterdayStr }, "Generating daily report");

  try {
    const [commentStats, dmStats] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE classified_type = 'NEGATIVE') as negative,
          COUNT(*) FILTER (WHERE classified_type = 'BUY_INTENT') as buy_intent,
          COUNT(*) FILTER (WHERE action_taken = 'HIDE') as hidden
        FROM comment_logs
        WHERE processed_at::date = ${yesterdayStr}::date
      `),
      db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE escalated = true) as escalated,
          COUNT(*) FILTER (WHERE action_taken = 'AUTO_REPLY') as ai_replied
        FROM dm_logs
        WHERE processed_at::date = ${yesterdayStr}::date
      `),
    ]);

    const cs = commentStats.rows[0] as any;
    const ds = dmStats.rows[0] as any;

    const metrics = {
      date: yesterdayStr,
      comments: {
        total: Number(cs?.total ?? 0),
        negative: Number(cs?.negative ?? 0),
        buyIntent: Number(cs?.buy_intent ?? 0),
        hidden: Number(cs?.hidden ?? 0),
      },
      dms: {
        total: Number(ds?.total ?? 0),
        escalated: Number(ds?.escalated ?? 0),
        aiReplied: Number(ds?.ai_replied ?? 0),
      },
    };

    const prompt = `Generate a concise daily performance summary:
Date: ${yesterdayStr}
Comments: ${metrics.comments.total} total, ${metrics.comments.negative} negative, ${metrics.comments.buyIntent} buy intent, ${metrics.comments.hidden} hidden
DMs: ${metrics.dms.total} total, ${metrics.dms.escalated} escalated, ${metrics.dms.aiReplied} AI replied
Keep it under 200 words. Include key insights and recommendations.`;

    const response = await getOpenAI().chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.5,
    });

    const summary = response.choices[0]?.message.content ?? "No summary generated.";

    const reportText = [
      `📅 Date: ${yesterdayStr}`,
      "",
      `💬 Comments: ${metrics.comments.total} total`,
      `  🚫 Negative: ${metrics.comments.negative}`,
      `  🛒 Buy Intent: ${metrics.comments.buyIntent}`,
      `  🙈 Hidden: ${metrics.comments.hidden}`,
      "",
      `📩 DMs: ${metrics.dms.total} total`,
      `  ⚠️ Escalated: ${metrics.dms.escalated}`,
      `  🤖 AI Replied: ${metrics.dms.aiReplied}`,
      "",
      "📝 Summary:",
      summary,
    ].join("\n");

    await sendDailyReport(reportText);

    await db.execute(sql`
      INSERT INTO daily_reports (report_date, total_comments, negative_comments, buy_intent_comments, hidden_comments, total_dms, escalated_dms, ai_replied_dms, report_data, sent_at)
      VALUES (${yesterdayStr}::date, ${metrics.comments.total}, ${metrics.comments.negative}, ${metrics.comments.buyIntent}, ${metrics.comments.hidden}, ${metrics.dms.total}, ${metrics.dms.escalated}, ${metrics.dms.aiReplied}, ${JSON.stringify(metrics)}::jsonb, NOW())
      ON CONFLICT (report_date) DO UPDATE SET sent_at = NOW(), report_data = EXCLUDED.report_data
    `);

    log.info({ date: yesterdayStr }, "Daily report sent");
  } catch (err) {
    log.error({ err }, "Daily report generation failed");
    throw err;
  }
}

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { generateAndSendDailyReport } from "../workflows/daily-report.workflow.js";
import { childLogger } from "../core/logger.js";

const router = Router();
const log = childLogger({ module: "report-routes" });

router.get("/reports/daily", async (req: Request, res: Response) => {
  const { from, to, limit = "30" } = req.query as Record<string, string>;
  try {
    const rows = await db.execute(sql`
      SELECT * FROM daily_reports
      WHERE
        (${from ?? null}::date IS NULL OR report_date >= ${from ?? null}::date) AND
        (${to ?? null}::date IS NULL OR report_date <= ${to ?? null}::date)
      ORDER BY report_date DESC
      LIMIT ${parseInt(limit)}
    `);
    res.json({ success: true, data: rows.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch reports");
    res.status(500).json({ success: false, error: "Failed to fetch reports" });
  }
});

router.get("/reports/stats", async (req: Request, res: Response) => {
  const { days = "7" } = req.query as Record<string, string>;
  try {
    const [commentStats, dmStats] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE classified_type = 'NEGATIVE') as negative,
          COUNT(*) FILTER (WHERE classified_type = 'BUY_INTENT') as buy_intent
        FROM comment_logs
        WHERE processed_at >= NOW() - INTERVAL '1 day' * ${parseInt(days)}
      `),
      db.execute(sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE escalated = true) as escalated,
          COUNT(*) FILTER (WHERE action_taken = 'AUTO_REPLY') as ai_replied
        FROM dm_logs
        WHERE processed_at >= NOW() - INTERVAL '1 day' * ${parseInt(days)}
      `),
    ]);

    res.json({
      success: true,
      data: {
        period: `Last ${days} days`,
        comments: commentStats.rows[0],
        dms: dmStats.rows[0],
      },
    });
  } catch (err) {
    log.error({ err }, "Failed to fetch stats");
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

router.post("/reports/generate", async (_req: Request, res: Response) => {
  try {
    await generateAndSendDailyReport();
    res.json({ success: true, message: "Report generated and sent to Telegram" });
  } catch (err) {
    log.error({ err }, "Failed to generate report");
    res.status(500).json({ success: false, error: "Failed to generate report" });
  }
});

router.get("/reports/logs", async (req: Request, res: Response) => {
  const { level, limit = "100", service } = req.query as Record<string, string>;
  try {
    const rows = await db.execute(sql`
      SELECT * FROM system_logs
      WHERE
        (${level ?? null} IS NULL OR level = ${level ?? null}) AND
        (${service ?? null} IS NULL OR service = ${service ?? null})
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)}
    `);
    res.json({ success: true, data: rows.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch logs");
    res.status(500).json({ success: false, error: "Failed to fetch logs" });
  }
});

export default router;

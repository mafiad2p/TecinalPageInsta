import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { generateAndSendDailyReport } from "../workflows/daily-report.workflow.js";
import { childLogger } from "../core/logger.js";

const router = Router();
const log = childLogger({ module: "report-routes" });

router.get("/reports/daily", async (req: Request, res: Response) => {
  const { from, to, limit = "30" } = req.query as Record<string, string>;
  try {
    const result = await pool.query(
      `SELECT * FROM daily_reports
       WHERE ($1::date IS NULL OR report_date >= $1::date)
         AND ($2::date IS NULL OR report_date <= $2::date)
       ORDER BY report_date DESC LIMIT $3`,
      [from ?? null, to ?? null, parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch reports");
    res.status(500).json({ success: false, error: "Failed to fetch reports" });
  }
});

router.get("/reports/stats", async (req: Request, res: Response) => {
  const { days = "7" } = req.query as Record<string, string>;
  try {
    const [commentStats, dmStats] = await Promise.all([
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE classified_type = 'NEGATIVE') as negative,
          COUNT(*) FILTER (WHERE classified_type = 'BUY_INTENT') as buy_intent
         FROM comment_logs
         WHERE processed_at >= NOW() - INTERVAL '1 day' * $1`,
        [parseInt(days)]
      ),
      pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE escalated = true) as escalated,
          COUNT(*) FILTER (WHERE action_taken = 'AUTO_REPLY') as ai_replied
         FROM dm_logs
         WHERE processed_at >= NOW() - INTERVAL '1 day' * $1`,
        [parseInt(days)]
      ),
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
    const result = await pool.query(
      `SELECT * FROM system_logs
       WHERE ($1::text IS NULL OR level = $1)
         AND ($2::text IS NULL OR service = $2)
       ORDER BY created_at DESC LIMIT $3`,
      [level ?? null, service ?? null, parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch logs");
    res.status(500).json({ success: false, error: "Failed to fetch logs" });
  }
});

router.get("/reports/dm-logs", async (req: Request, res: Response) => {
  const { limit = "20" } = req.query as Record<string, string>;
  try {
    const result = await pool.query(
      "SELECT * FROM dm_logs ORDER BY processed_at DESC LIMIT $1",
      [parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch DM logs");
    res.status(500).json({ success: false, error: "Failed to fetch DM logs" });
  }
});

router.get("/reports/webhook-debug", async (req: Request, res: Response) => {
  const { limit = "20" } = req.query as Record<string, string>;
  try {
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_debug')"
    );
    if (!tableCheck.rows[0]?.exists) {
      res.json({ success: true, data: [], message: "webhook_debug table does not exist yet" });
      return;
    }
    const result = await pool.query(
      "SELECT * FROM webhook_debug ORDER BY created_at DESC LIMIT $1",
      [parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    log.error({ err: err.message }, "Failed to fetch webhook debug");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/reports/comment-logs", async (req: Request, res: Response) => {
  const { limit = "20" } = req.query as Record<string, string>;
  try {
    const result = await pool.query(
      "SELECT * FROM comment_logs ORDER BY processed_at DESC LIMIT $1",
      [parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch comment logs");
    res.status(500).json({ success: false, error: "Failed to fetch comment logs" });
  }
});

export default router;

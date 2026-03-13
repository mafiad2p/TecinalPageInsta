import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { childLogger } from "../core/logger.js";

const router = Router();
const log = childLogger({ module: "scenario-routes" });

router.get("/scenarios", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM scenarios ORDER BY priority DESC, id");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch scenarios");
    res.status(500).json({ success: false, error: "Failed to fetch scenarios" });
  }
});

router.post("/scenarios", async (req: Request, res: Response) => {
  const { name, triggerType, triggerKeywords, responseTemplate, actionType, priority } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO scenarios (name, trigger_type, trigger_keywords, response_template, action_type, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, triggerType ?? "OTHER", triggerKeywords ?? [], responseTemplate ?? "", actionType ?? "AUTO_REPLY", priority ?? 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    log.error({ err }, "Failed to create scenario");
    res.status(500).json({ success: false, error: "Failed to create scenario" });
  }
});

router.put("/scenarios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, triggerKeywords, responseTemplate, actionType, priority, isActive } = req.body;
  try {
    await pool.query(
      `UPDATE scenarios SET
        name = COALESCE($1, name),
        trigger_keywords = COALESCE($2, trigger_keywords),
        response_template = COALESCE($3, response_template),
        action_type = COALESCE($4, action_type),
        priority = COALESCE($5, priority),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
       WHERE id = $7`,
      [name, triggerKeywords, responseTemplate, actionType, priority, isActive, id]
    );
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to update scenario");
    res.status(500).json({ success: false, error: "Failed to update scenario" });
  }
});

router.delete("/scenarios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM scenarios WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to delete scenario");
    res.status(500).json({ success: false, error: "Failed to delete scenario" });
  }
});

export default router;

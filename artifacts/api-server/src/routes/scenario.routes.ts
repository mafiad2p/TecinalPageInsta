import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { childLogger } from "../core/logger.js";

const router = Router();
const log = childLogger({ module: "scenario-routes" });

router.get("/scenarios", async (_req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM scenarios ORDER BY priority DESC, id`);
    res.json({ success: true, data: rows.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch scenarios");
    res.status(500).json({ success: false, error: "Failed to fetch scenarios" });
  }
});

router.post("/scenarios", async (req: Request, res: Response) => {
  const { name, triggerType, triggerKeywords, responseTemplate, actionType, priority } = req.body;
  try {
    const result = await db.execute(sql`
      INSERT INTO scenarios (name, trigger_type, trigger_keywords, response_template, action_type, priority)
      VALUES (${name}, ${triggerType}, ${triggerKeywords ?? []}, ${responseTemplate}, ${actionType}, ${priority ?? 0})
      RETURNING *
    `);
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
    await db.execute(sql`
      UPDATE scenarios SET
        name = COALESCE(${name}, name),
        trigger_keywords = COALESCE(${triggerKeywords}, trigger_keywords),
        response_template = COALESCE(${responseTemplate}, response_template),
        action_type = COALESCE(${actionType}, action_type),
        priority = COALESCE(${priority}, priority),
        is_active = COALESCE(${isActive}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to update scenario");
    res.status(500).json({ success: false, error: "Failed to update scenario" });
  }
});

router.delete("/scenarios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute(sql`DELETE FROM scenarios WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to delete scenario");
    res.status(500).json({ success: false, error: "Failed to delete scenario" });
  }
});

export default router;

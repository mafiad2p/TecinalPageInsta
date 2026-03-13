import { Router, type Request, type Response } from "express";
import { listPrompts, updatePrompt, invalidatePromptCache } from "../config/prompt-manager.js";
import { childLogger } from "../core/logger.js";

const router = Router();
const log = childLogger({ module: "prompt-routes" });

router.get("/prompts", async (_req: Request, res: Response) => {
  try {
    const prompts = await listPrompts();
    res.json({ success: true, data: prompts });
  } catch (err) {
    log.error({ err }, "Failed to fetch prompts");
    res.status(500).json({ success: false, error: "Failed to fetch prompts" });
  }
});

router.put("/prompts/:key", async (req: Request, res: Response) => {
  const { key } = req.params;
  const { promptText } = req.body;
  if (!promptText) {
    return res.status(400).json({ success: false, error: "promptText is required" });
  }
  try {
    await updatePrompt(key, promptText);
    res.json({ success: true, message: "Prompt updated and cache cleared" });
  } catch (err) {
    log.error({ err, key }, "Failed to update prompt");
    res.status(500).json({ success: false, error: "Failed to update prompt" });
  }
});

router.post("/prompts/:key/invalidate", async (req: Request, res: Response) => {
  const { key } = req.params;
  try {
    await invalidatePromptCache(key);
    res.json({ success: true, message: "Cache invalidated" });
  } catch (err) {
    log.error({ err, key }, "Failed to invalidate prompt cache");
    res.status(500).json({ success: false, error: "Failed to invalidate cache" });
  }
});

export default router;

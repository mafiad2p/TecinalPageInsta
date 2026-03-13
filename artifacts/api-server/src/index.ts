import app from "./app.js";
import { logger } from "./core/logger.js";
import { initTaskRunner, registerTaskHandler } from "./core/task-runner.js";
import { getRedis } from "./memory/redis.cache.js";
import { processFacebookComment } from "./workflows/comment-moderation.workflow.js";
import { processDM } from "./workflows/dm-chatbot.workflow.js";
import { generateAndSendDailyReport } from "./workflows/daily-report.workflow.js";
import { alertSystemError } from "./integrations/telegram/alert.js";
import cron from "node-cron";
import { CRON_SCHEDULES } from "./config/constants.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

async function bootstrap(): Promise<void> {
  logger.info("Bootstrapping server...");

  getRedis();

  await initTaskRunner();

  registerTaskHandler("comment.process", async (task) => {
    await processFacebookComment(task.data as any);
    return { success: true };
  });

  registerTaskHandler("dm.process", async (task) => {
    await processDM(task.data as any);
    return { success: true };
  });

  cron.schedule(CRON_SCHEDULES.DAILY_REPORT, async () => {
    logger.info("Running daily report cron");
    try {
      await generateAndSendDailyReport();
    } catch (err) {
      logger.error({ err }, "Daily report cron failed");
      await alertSystemError({
        service: "daily-report-cron",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Bootstrap failed");
  process.exit(1);
});

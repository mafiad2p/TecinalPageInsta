import { Queue, Worker, Job } from "bullmq";
import { getRedis } from "../memory/redis.cache.js";
import { childLogger } from "./logger.js";

const log = childLogger({ module: "task-runner" });

export interface TaskPayload {
  type: string;
  data: unknown;
  traceId?: string;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type TaskHandler = (payload: TaskPayload) => Promise<TaskResult>;

const handlers = new Map<string, TaskHandler>();
let queue: Queue | null = null;
let worker: Worker | null = null;

export function registerTaskHandler(type: string, handler: TaskHandler): void {
  handlers.set(type, handler);
  log.info({ type }, "Task handler registered");
}

export async function initTaskRunner(): Promise<void> {
  const redis = getRedis();
  const connection = { host: redis.options.host, port: redis.options.port };

  queue = new Queue("main-queue", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  worker = new Worker(
    "main-queue",
    async (job: Job) => {
      const payload = job.data as TaskPayload;
      const handler = handlers.get(payload.type);
      if (!handler) {
        log.warn({ type: payload.type }, "No handler for task type");
        return;
      }
      log.info({ type: payload.type, traceId: payload.traceId }, "Running task");
      return handler(payload);
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Task failed");
  });

  worker.on("completed", (job) => {
    log.debug({ jobId: job.id }, "Task completed");
  });

  log.info("Task runner initialized");
}

export async function enqueueTask(
  payload: TaskPayload,
  options?: { delay?: number; priority?: number }
): Promise<string> {
  if (!queue) throw new Error("Task runner not initialized");
  const job = await queue.add(payload.type, payload, options);
  log.info({ jobId: job.id, type: payload.type }, "Task enqueued");
  return job.id ?? "";
}

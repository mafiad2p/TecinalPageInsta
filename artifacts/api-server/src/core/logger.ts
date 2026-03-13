import pino from "pino";

const isDev = process.env["NODE_ENV"] !== "production";

export const logger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: "api-server" },
});

export type Logger = typeof logger;

export function childLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes/index.js";
import { logger } from "./core/logger.js";

const app: Express = express();

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

app.use("/api/uploads", express.static(path.resolve(process.cwd(), "uploads")));
app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const dashboardDist = path.resolve(process.cwd(), "artifacts/dashboard-dist");
  app.use(express.static(dashboardDist));
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(dashboardDist, "index.html"));
  });
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ success: false, error: "Internal server error" });
});

export default app;

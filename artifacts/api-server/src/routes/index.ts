import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import webhookRouter from "./webhook.routes.js";
import productRouter from "./product.routes.js";
import promptRouter from "./prompt.routes.js";
import scenarioRouter from "./scenario.routes.js";
import reportRouter from "./report.routes.js";
import pageRouter from "./page.routes.js";
import authRouter from "./auth.routes.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(productRouter);
router.use(promptRouter);
router.use(scenarioRouter);
router.use(reportRouter);
router.use(pageRouter);
router.use(authRouter);

export default router;

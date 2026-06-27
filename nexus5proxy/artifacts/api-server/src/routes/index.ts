import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import plansRouter from "./plans";
import paymentsRouter from "./payments";
import subscriptionsRouter from "./subscriptions";
import proxiesRouter from "./proxies";
import usageRouter from "./usage";
import adminRouter from "./admin";
import cartRouter from "./cart";
import purchaseRouter from "./purchase";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(plansRouter);
router.use(paymentsRouter);
router.use(subscriptionsRouter);
router.use(proxiesRouter);
router.use(usageRouter);
router.use(adminRouter);
router.use(cartRouter);
router.use(purchaseRouter);

export default router;

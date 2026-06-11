import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cattleRouter from "./cattle";
import investorsRouter from "./investors";
import treatmentsRouter from "./treatments";
import weightRecordsRouter from "./weight-records";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cattleRouter);
router.use(investorsRouter);
router.use(treatmentsRouter);
router.use(weightRecordsRouter);
router.use(dashboardRouter);

export default router;

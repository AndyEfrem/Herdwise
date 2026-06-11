import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import cattleRouter from "./cattle";
import investorsRouter from "./investors";
import treatmentsRouter from "./treatments";
import weightRecordsRouter from "./weight-records";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(cattleRouter);
router.use(investorsRouter);
router.use(treatmentsRouter);
router.use(weightRecordsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;

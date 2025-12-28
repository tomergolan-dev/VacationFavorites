import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";

const router = Router();

router.use(authRoutes);
router.use(healthRoutes);
router.use(usersRoutes);

export default router;

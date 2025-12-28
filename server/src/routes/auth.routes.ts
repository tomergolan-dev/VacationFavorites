// src/routes/auth.routes.ts
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { registerSchema, loginSchema } from "../validations/auth.validation";
import {
    registerController,
    verifyEmailController,
    loginController,
    resendVerificationController,
} from "../controllers/auth.controller";

const router = Router();

router.post("/auth/register", validate(registerSchema), registerController);
router.get("/auth/verify-email", verifyEmailController);
router.post("/auth/resend-verification", resendVerificationController);
router.post("/auth/login", validate(loginSchema), loginController);

export default router;

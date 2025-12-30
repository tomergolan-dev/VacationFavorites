import { Router } from "express";
import { validate } from "../middlewares/validate";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../validations/auth.validation";
import {
    registerController,
    verifyEmailController,
    loginController,
    resendVerificationController,
    forgotPasswordController,
    resetPasswordController
} from "../controllers/auth.controller";

const router = Router();

router.post("/auth/register", validate(registerSchema), registerController);
router.get("/auth/verify-email", verifyEmailController);
router.post("/auth/resend-verification", resendVerificationController);
router.post("/auth/login", validate(loginSchema), loginController);
router.post("/auth/forgot-password", validate(forgotPasswordSchema), forgotPasswordController);
router.post("/auth/reset-password", validate(resetPasswordSchema), resetPasswordController);

export default router;

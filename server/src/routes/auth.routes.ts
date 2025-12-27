import { Router } from "express";
import { validate } from "../middlewares/validate";
import { registerSchema, loginSchema } from "../validations/auth.validation";
import { registerController, verifyEmailController, loginController } from "../controllers/auth.controller";

const router = Router();

router.post("/register", validate(registerSchema), registerController);
router.get("/verify-email", verifyEmailController);
router.post("/login", validate(loginSchema), loginController);

export default router;

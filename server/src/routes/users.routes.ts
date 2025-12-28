import { Router } from "express";
import { authRequired, isAdmin } from "../middlewares/auth";
import {
    getMeController,
    updateMeController,
    listUsersController,
    getUserByIdController,
    updateUserByIdController,
    deleteUserByIdController,
} from "../controllers/users.controller";

const router = Router();

// me
router.get("/users/me", authRequired, getMeController);
router.put("/users/me", authRequired, updateMeController);

// admin
router.get("/users", authRequired, isAdmin, listUsersController);
router.get("/users/:id", authRequired, isAdmin, getUserByIdController);
router.put("/users/:id", authRequired, isAdmin, updateUserByIdController);
router.delete("/users/:id", authRequired, isAdmin, deleteUserByIdController);

export default router;

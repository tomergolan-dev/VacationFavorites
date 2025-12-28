import { Request, Response } from "express";
import mongoose from "mongoose";
import {
    findAllUsers,
    findUserById,
    updateUserById,
    deleteUserById,
} from "../services/users.service";

function isValidObjectId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
}

// GET /users/me
export async function getMeController(req: Request, res: Response) {
    const userId = req.user!._id;

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
}

// PUT /users/me
export async function updateMeController(req: Request, res: Response) {
    const userId = req.user!._id;

    const { firstName, lastName } = req.body ?? {};
    const updates: any = { updatedBy: userId };

    if (typeof firstName === "string" && firstName.trim()) updates.firstName = firstName.trim();
    if (typeof lastName === "string" && lastName.trim()) updates.lastName = lastName.trim();

    // חסימה: משתמש לא יכול לעדכן role דרך ME
    if (req.body?.role !== undefined) {
        return res.status(403).json({ message: "You cannot change your role" });
    }

    const user = await updateUserById(userId, updates);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user, message: "Profile updated successfully" });
}

// ===== Admin =====

// GET /users
export async function listUsersController(_req: Request, res: Response) {
    const users = await findAllUsers();
    return res.json(users);
}

// GET /users/:id
export async function getUserByIdController(req: Request, res: Response) {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    const user = await findUserById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
}

// PUT /users/:id
export async function updateUserByIdController(req: Request, res: Response) {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    // לא נותנים לאדמין לעדכן את עצמו פה (כמו בפרויקט השני)
    if (String(req.user!._id) === String(id)) {
        return res.status(400).json({ message: "Admin should update self via /users/me" });
    }

    const { firstName, lastName, role } = req.body ?? {};
    const updates: any = { updatedBy: req.user!._id };

    if (typeof firstName === "string" && firstName.trim()) updates.firstName = firstName.trim();
    if (typeof lastName === "string" && lastName.trim()) updates.lastName = lastName.trim();

    if (role !== undefined) {
        const normalized = String(role).toLowerCase();
        if (!["user", "admin"].includes(normalized)) {
            return res.status(400).json({ message: "Invalid role value" });
        }
        updates.role = normalized;
    }

    const user = await updateUserById(id, updates);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user, message: "User updated successfully by admin" });
}

// DELETE /users/:id
export async function deleteUserByIdController(req: Request, res: Response) {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    const deleted = await deleteUserById(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });

    return res.status(204).send();
}

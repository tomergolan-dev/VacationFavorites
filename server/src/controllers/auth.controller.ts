// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import {
    registerUser,
    verifyEmail,
    loginUser,
    resendVerificationEmail,
} from "../services/auth.service";

export async function registerController(req: Request, res: Response) {
    try {
        const result = await registerUser(req.body);
        return res.status(201).json(result);
    } catch (e: any) {
        return res.status(400).json({ ok: false, message: e?.message || "Register failed" });
    }
}

export async function verifyEmailController(req: Request, res: Response) {
    try {
        const token = String(req.query.token || "");
        if (!token) return res.status(400).json({ ok: false, message: "Missing token" });

        const result = await verifyEmail(token);
        return res.json(result);
    } catch (e: any) {
        return res.status(400).json({ ok: false, message: e?.message || "Verify failed" });
    }
}

export async function resendVerificationController(req: Request, res: Response) {
    try {
        const email = String(req.body?.email || "");
        if (!email) return res.status(400).json({ ok: false, message: "Missing email" });

        const result = await resendVerificationEmail(email);
        return res.json(result);
    } catch (e: any) {
        return res.status(400).json({ ok: false, message: e?.message || "Resend failed" });
    }
}

export async function loginController(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const result = await loginUser(email, password);
        return res.json(result);
    } catch (e: any) {
        const code = e?.code;
        const message = e?.message || "Login failed";
        return res.status(401).json({ ok: false, message, code });
    }
}

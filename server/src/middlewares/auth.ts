import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";
import { verifyJwt, type JwtPayload } from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

// 1) Authentication middleware – requires a valid Bearer token
export function authRequired(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
        return res.status(401).json({ message: "Missing Authorization Bearer token" });
    }

    try {
        const payload = verifyJwt(token);

        // Token payload must include at least _id and role
        if (!payload?._id || !payload?.role) {
            return res.status(401).json({ message: "Malformed token payload" });
        }

        // Attach user data to the request object
        req.user = payload;
        return next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// 2) Authorization middleware – admin only
// The role is verified against the database (do not trust the token alone)
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await User.findById(req.user._id).select("role");
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (String(user.role).toLowerCase() !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
        }

        return next();
    } catch {
        return res.status(500).json({ message: "Admin check failed" });
    }
}

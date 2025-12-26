import { Request, Response, NextFunction } from "express";

export function errorMiddleware(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    console.error(err);

    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ ok: false, message });
}

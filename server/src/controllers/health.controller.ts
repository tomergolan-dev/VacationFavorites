import { Request, Response } from "express";
import { healthCheck } from "../services/health.service";

export function getHealthController(_req: Request, res: Response) {
    const data = healthCheck();
    res.json(data);
}

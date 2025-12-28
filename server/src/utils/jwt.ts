import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

export type JwtPayload = {
    _id: string;
    role: "admin" | "user";
    email?: string;
};

// חשוב: להפוך את הסוד ל-Secret ולהבטיח שהוא קיים
const JWT_SECRET: Secret = process.env.JWT_SECRET as Secret;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export function signJwt(payload: JwtPayload): string {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing");
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string): JwtPayload {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing");
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

export type JwtPayload = {
    sub: string; // userId
    email: string;
    role: "user" | "admin";
    fullName: string;
};

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "dev_secret_change_me";

// IMPORTANT: expiresIn must be string/number accepted by jsonwebtoken
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export function signJwt(payload: JwtPayload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt<T = any>(token: string) {
    return jwt.verify(token, JWT_SECRET) as T;
}

// src/services/auth.service.ts
import crypto from "crypto";
import User from "../models/user.model";
import { hashPassword, comparePassword } from "../utils/hash";
import { signJwt } from "../utils/jwt";
import { sendEmail } from "../utils/mailer";

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function newVerification() {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    return { verificationToken, verificationTokenExpires };
}

function isVerificationValid(user: any) {
    return (
        !!user.verificationToken &&
        !!user.verificationTokenExpires &&
        user.verificationTokenExpires.getTime() > Date.now()
    );
}

async function sendVerificationEmail(email: string, token: string) {
    const apiUrl = process.env.API_URL || "http://localhost:5000";
    const verifyLink = `${apiUrl}/api/auth/verify-email?token=${token}`;

    await sendEmail(
        email,
        "Verify your email - VacationFavorites",
        `
    <div style="font-family: Arial; line-height:1.6">
      <h2>Welcome 👋</h2>
      <p>Click to verify your email:</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
      <p>If the link expired, request a new verification email from the app.</p>
    </div>
    `
    );
}

function isResetTokenValid(user: any) {
    return (
        !!user.resetPasswordToken &&
        !!user.resetPasswordTokenExpires &&
        user.resetPasswordTokenExpires.getTime() > Date.now()
    );
}

function newResetPasswordToken() {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    return { rawToken, tokenHash, expires };
}

async function sendResetPasswordEmail(email: string, rawToken: string) {
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

    await sendEmail(
        email,
        "Reset your password - VacationFavorites",
        `
    <div style="font-family: Arial; line-height:1.6">
      <h2>Password reset 🔐</h2>
      <p>Click the link below to reset your password (valid for 30 minutes):</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn’t request this, you can ignore this email.</p>
    </div>
    `
    );
}

/**
 * REGISTER FLOW
 * - New email: create user + send verification email.
 * - Existing verified: error "Email already exists".
 * - Existing NOT verified:
 *   - If existing token still valid: do NOT resend; tell user to check inbox/spam.
 *   - If token missing/expired: generate new token and resend.
 */
export async function registerUser(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}) {
    const email = normalizeEmail(input.email);

    const exists = await User.findOne({ email });

    // 1) Existing verified user => block re-register
    if (exists && exists.emailVerified) {
        throw new Error("Email already exists");
    }

    // 2) Existing but NOT verified
    if (exists && !exists.emailVerified) {
        // 2.1) Token still valid => do NOT resend
        if (isVerificationValid(exists)) {
            return {
                ok: true,
                message: "Verification email already sent. Please check your inbox/spam.",
                code: "VERIFICATION_ALREADY_SENT",
            };
        }

        // 2.2) Token missing/expired => regenerate + resend
        const { verificationToken, verificationTokenExpires } = newVerification();
        exists.verificationToken = verificationToken as any;
        exists.verificationTokenExpires = verificationTokenExpires as any;
        await exists.save();

        await sendVerificationEmail(email, verificationToken);

        return {
            ok: true,
            message: "Verification email sent again.",
            code: "VERIFICATION_RESENT",
        };
    }

    // 3) New user
    const passwordHash = await hashPassword(input.password);
    const { verificationToken, verificationTokenExpires } = newVerification();

    await User.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email,
        passwordHash,
        role: "user",
        emailVerified: false,
        verificationToken,
        verificationTokenExpires,
    });

    await sendVerificationEmail(email, verificationToken);

    return { ok: true, message: "Registered. Please verify your email." };
}

/**
 * VERIFY EMAIL
 * - If token invalid => error
 * - If token expired => clear token fields + error
 * - Else => mark verified + clear token fields
 */
export async function verifyEmail(token: string) {
    const user = await User.findOne({ verificationToken: token });
    if (!user) throw new Error("Invalid verification token");

    if (!user.verificationTokenExpires || user.verificationTokenExpires.getTime() < Date.now()) {
        // clear old token so it won't confuse
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await user.save();

        throw new Error("Verification token expired. Please request a new verification email.");
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    return { ok: true, message: "Email verified successfully" };
}

/**
 * RESEND VERIFICATION (manual)
 * - If user doesn't exist => error (or you can return ok for security)
 * - If already verified => ok
 * - Else => generate new token + resend
 */
export async function resendVerificationEmail(emailRaw: string) {
    const email = normalizeEmail(emailRaw);

    const user = await User.findOne({ email });
    if (!user) {
        throw new Error("User not found");
    }

    if (user.emailVerified) {
        return { ok: true, message: "Email already verified" };
    }

    const { verificationToken, verificationTokenExpires } = newVerification();
    user.verificationToken = verificationToken as any;
    user.verificationTokenExpires = verificationTokenExpires as any;
    await user.save();

    await sendVerificationEmail(email, verificationToken);

    return { ok: true, message: "Verification email sent" };
}

/**
 * LOGIN
 * - If not verified:
 *   - If a valid token exists => EMAIL_NOT_VERIFIED
 *   - Else => EMAIL_NOT_VERIFIED_EXPIRED (so UI can highlight resend)
 * - If verified => check password + issue JWT
 */
export async function loginUser(emailRaw: string, password: string) {
    const email = normalizeEmail(emailRaw);

    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");

    if (!user.emailVerified) {
        const hasValid = isVerificationValid(user);

        const err: any = new Error(
            hasValid
                ? "Email not verified. Please verify using the email we sent you."
                : "Email not verified. Your verification link may have expired. Please request a new one."
        );

        err.code = hasValid ? "EMAIL_NOT_VERIFIED" : "EMAIL_NOT_VERIFIED_EXPIRED";
        throw err;
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new Error("Invalid credentials");

    const token = signJwt({
        _id: String(user._id),
        email: user.email,
        role: user.role,
    });

    const fullName = `${user.firstName} ${user.lastName}`;

    return {
        ok: true,
        token,
        user: {
            _id: user._id,
            email: user.email,
            role: user.role,
            fullName,
        },
    };
}

export async function requestPasswordReset(emailRaw: string) {
    const email = normalizeEmail(emailRaw);
    const user = await User.findOne({ email });

    // חשוב: לא לחשוף האם משתמש קיים (מניעת enumeration)
    if (!user) {
        return { ok: true, message: "If the email exists, a reset link has been sent." };
    }

    // אופציונלי: אפשר לדרוש אימות מייל לפני reset
    // אם אתה רוצה: אם לא מאומת -> אל תשלח (אבל עדיין תחזיר ok:true)
    if (!user.emailVerified) {
        return { ok: true, message: "If the email exists, a reset link has been sent." };
    }

    // אם כבר יש טוקן תקף, לא שולחים שוב
    if (isResetTokenValid(user)) {
        return {
            ok: true,
            message: "Reset link already sent. Please check your inbox/spam.",
            code: "RESET_ALREADY_SENT",
        };
    }

    const { rawToken, tokenHash, expires } = newResetPasswordToken();
    user.resetPasswordToken = tokenHash as any;
    user.resetPasswordTokenExpires = expires as any;
    await user.save();

    await sendResetPasswordEmail(user.email, rawToken);

    return { ok: true, message: "If the email exists, a reset link has been sent. Please check your inbox/spam." };
}

export async function resetPassword(tokenRaw: string, newPassword: string) {
    const tokenHash = crypto.createHash("sha256").update(tokenRaw).digest("hex");

    const user = await User.findOne({ resetPasswordToken: tokenHash });
    if (!user) throw new Error("Invalid or expired reset token");

    if (!user.resetPasswordTokenExpires || user.resetPasswordTokenExpires.getTime() < Date.now()) {
        user.resetPasswordToken = null;
        user.resetPasswordTokenExpires = null;
        await user.save();
        throw new Error("Invalid or expired reset token");
    }

    const isSame = await comparePassword(newPassword, user.passwordHash);
    if (isSame) {
        throw new Error("New password must be different from your current password");
    }
    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    await user.save();

    return { ok: true, message: "Password updated successfully" };
}


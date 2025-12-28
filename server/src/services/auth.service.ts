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

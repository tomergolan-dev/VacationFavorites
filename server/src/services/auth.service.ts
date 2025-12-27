import crypto from "crypto";
import User from "../models/user.model";
import { hashPassword, comparePassword } from "../utils/hash";
import { signJwt } from "../utils/jwt";
import { sendEmail } from "../utils/mailer";

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export async function registerUser(input: { firstName: string; lastName: string; email: string; password: string }) {
    const email = normalizeEmail(input.email);

    const exists = await User.findOne({ email });
    if (exists) throw new Error("Email already exists");

    const passwordHash = await hashPassword(input.password);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

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

    const apiUrl = process.env.API_URL || "http://localhost:5000";
    const verifyLink = `${apiUrl}/api/auth/verify-email?token=${verificationToken}`;

    await sendEmail(
        email,
        "Verify your email - VacationFavorites",
        `
      <div style="font-family: Arial; line-height:1.6">
        <h2>Welcome 👋</h2>
        <p>Click to verify your email:</p>
        <p><a href="${verifyLink}">${verifyLink}</a></p>
      </div>
    `
    );

    return { ok: true, message: "Registered. Please verify your email." };
}

export async function verifyEmail(token: string) {
    const user = await User.findOne({ verificationToken: token });
    if (!user) throw new Error("Invalid verification token");

    if (!user.verificationTokenExpires || user.verificationTokenExpires.getTime() < Date.now()) {
        throw new Error("Verification token expired");
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    return { ok: true, message: "Email verified successfully" };
}

export async function loginUser(emailRaw: string, password: string) {
    const email = normalizeEmail(emailRaw);

    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");
    if (!user.emailVerified) throw new Error("Email not verified");

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new Error("Invalid credentials");

    const fullName = `${user.firstName} ${user.lastName}`;

    const token = signJwt({
        sub: String(user._id),
        email: user.email,
        role: user.role,
        fullName,
    });

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

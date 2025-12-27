import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string) {
    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    const from = process.env.EMAIL_FROM || user;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false, // 587 = STARTTLS
        auth: { user, pass },
    });

    await transporter.sendMail({ from, to, subject, html });
}

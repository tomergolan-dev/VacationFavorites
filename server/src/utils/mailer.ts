// utils/mailer.ts
import sgMail from "@sendgrid/mail";

type EmailArgs = {
    to: string;
    subject: string;
    html: string;
};

function getEmailFrom(): string {
    const from = process.env.EMAIL_FROM;
    if (!from) throw new Error("Missing EMAIL_FROM in environment variables");
    return from;
}

function ensureSendgridConfigured() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) throw new Error("Missing SENDGRID_API_KEY in environment variables");
    sgMail.setApiKey(apiKey);
}

export async function sendEmail(to: string, subject: string, html: string) {
    const provider = (process.env.EMAIL_PROVIDER || "sendgrid").toLowerCase();

    if (provider !== "sendgrid") {
        throw new Error(`Unsupported EMAIL_PROVIDER "${provider}". Use "sendgrid".`);
    }

    ensureSendgridConfigured();

    await sgMail.send({
        to,
        from: getEmailFrom(),
        subject,
        html,
    });
}

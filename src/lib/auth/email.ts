import { Resend } from "resend";

import { getAppUrl, getResendApiKey, getResendFromEmail } from "@/lib/auth/config";

interface AuthEmailOptions {
    to: string;
    name: string;
    subject: string;
    previewText: string;
    actionLabel: string;
    actionUrl: string;
    supportingText: string;
}

function renderEmailTemplate(options: AuthEmailOptions) {
    return `
        <div style="background:#f4efe6;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:40px;border:1px solid #e5ded3;">
                <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9a6b39;margin:0 0 16px;">UMIS Authentication</p>
                <h1 style="font-size:28px;line-height:1.2;color:#111827;margin:0 0 12px;">${options.subject}</h1>
                <p style="font-size:16px;line-height:1.7;margin:0 0 12px;">Hello ${options.name},</p>
                <p style="font-size:16px;line-height:1.7;margin:0 0 24px;">${options.supportingText}</p>
                <a href="${options.actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;">${options.actionLabel}</a>
                <p style="font-size:14px;line-height:1.7;margin:24px 0 0;color:#6b7280;">If the button does not open, use this URL: ${options.actionUrl}</p>
                <p style="font-size:12px;line-height:1.6;margin:28px 0 0;color:#9ca3af;">${options.previewText}</p>
            </div>
        </div>
    `;
}

async function sendAuthEmail(options: AuthEmailOptions) {
    const apiKey = getResendApiKey();

    if (!apiKey) {
        console.info(`[UMIS auth email preview] ${options.subject}: ${options.actionUrl}`);
        return;
    }

    const resend = new Resend(apiKey);

    await resend.emails.send({
        from: getResendFromEmail(),
        to: options.to,
        subject: options.subject,
        html: renderEmailTemplate(options),
    });
}

export async function sendVerificationEmail({
    email,
    name,
    token,
}: {
    email: string;
    name: string;
    token: string;
}) {
    const actionUrl = `${getAppUrl()}/verify-email?token=${token}`;

    await sendAuthEmail({
        to: email,
        name,
        subject: "Verify your UMIS account",
        previewText: "Use this link to activate your UMIS account.",
        actionLabel: "Verify Email",
        actionUrl,
        supportingText:
            "Confirm your email address to unlock the UMIS dashboard and complete your academic profile.",
    });
}

export async function sendPasswordResetEmail({
    email,
    name,
    token,
}: {
    email: string;
    name: string;
    token: string;
}) {
    const actionUrl = `${getAppUrl()}/reset-password?token=${token}`;

    await sendAuthEmail({
        to: email,
        name,
        subject: "Reset your UMIS password",
        previewText: "Use this secure link to reset your UMIS password.",
        actionLabel: "Reset Password",
        actionUrl,
        supportingText:
            "A password reset was requested for your UMIS account. If this was you, use the secure link below. If not, you can ignore this message.",
    });
}

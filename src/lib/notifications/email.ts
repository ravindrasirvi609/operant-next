import { Resend } from "resend";

import { getAppUrl, getResendApiKey, getResendFromEmail } from "@/lib/auth/config";

type NotificationEmailOptions = {
    to: string;
    name: string;
    subject: string;
    heading: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
    previewText?: string;
};

type NotificationEmailResult =
    | { status: "sent"; sentAt: Date }
    | { status: "skipped"; reason: string }
    | { status: "failed"; reason: string };

function toAbsoluteUrl(href?: string) {
    if (!href) {
        return undefined;
    }

    if (/^https?:\/\//i.test(href)) {
        return href;
    }

    const baseUrl = getAppUrl().replace(/\/+$/, "");
    const path = href.startsWith("/") ? href : `/${href}`;
    return `${baseUrl}${path}`;
}

function renderNotificationEmail(options: NotificationEmailOptions) {
    const actionUrl = toAbsoluteUrl(options.actionUrl);
    const previewText =
        options.previewText ??
        "A new workflow notification is available in your UMIS workspace.";

    return `
        <div style="background:#f4efe6;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
            <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:40px;border:1px solid #e5ded3;">
                <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#9a6b39;margin:0 0 16px;">UMIS Notifications</p>
                <h1 style="font-size:28px;line-height:1.2;color:#111827;margin:0 0 12px;">${options.heading}</h1>
                <p style="font-size:16px;line-height:1.7;margin:0 0 20px;">Hello ${options.name},</p>
                <p style="font-size:16px;line-height:1.7;margin:0 0 24px;">${options.message}</p>
                ${
                    actionUrl && options.actionLabel
                        ? `<a href="${actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;">${options.actionLabel}</a>`
                        : ""
                }
                ${
                    actionUrl
                        ? `<p style="font-size:14px;line-height:1.7;margin:24px 0 0;color:#6b7280;">If the button does not open, use this URL: ${actionUrl}</p>`
                        : ""
                }
                <p style="font-size:12px;line-height:1.6;margin:28px 0 0;color:#9ca3af;">${previewText}</p>
            </div>
        </div>
    `;
}

export async function sendNotificationEmail(
    options: NotificationEmailOptions
): Promise<NotificationEmailResult> {
    const apiKey = getResendApiKey();
    const actionUrl = toAbsoluteUrl(options.actionUrl);

    if (!apiKey) {
        const preview = actionUrl ? ` (${actionUrl})` : "";
        console.info(`[UMIS notification email preview] ${options.subject}: ${options.to}${preview}`);
        return { status: "skipped", reason: "RESEND_API_KEY is not configured." };
    }

    try {
        const resend = new Resend(apiKey);

        await resend.emails.send({
            from: getResendFromEmail(),
            to: options.to,
            subject: options.subject,
            html: renderNotificationEmail({
                ...options,
                actionUrl,
            }),
        });

        return { status: "sent", sentAt: new Date() };
    } catch (error) {
        return {
            status: "failed",
            reason: error instanceof Error ? error.message : "Unknown email delivery error.",
        };
    }
}

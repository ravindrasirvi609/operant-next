const DAY_IN_SECONDS = 60 * 60 * 24;

function getRequiredEnv(name: string) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export const authConfig = {
    cookieName: "umis_session",
    sessionDurationSeconds: 7 * DAY_IN_SECONDS,
    verificationTokenDurationHours: 24,
    passwordResetDurationMinutes: 30,
};

export function getAuthSecret() {
    return getRequiredEnv("AUTH_SECRET");
}

export function getAppUrl() {
    return (
        process.env.APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000"
    );
}

export function getResendApiKey() {
    return process.env.RESEND_API_KEY;
}

export function getResendFromEmail() {
    return process.env.RESEND_FROM_EMAIL ?? "UMIS Auth <onboarding@resend.dev>";
}

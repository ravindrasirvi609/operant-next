import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { redirectIfAuthenticated } from "@/lib/auth/user";

export default async function ForgotPasswordPage() {
    await redirectIfAuthenticated();

    return (
        <AuthShell
            eyebrow="Recovery"
            title="Recover your UMIS account"
            description="Request a secure password reset link delivered through Resend."
        >
            <ForgotPasswordForm />
        </AuthShell>
    );
}

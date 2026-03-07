import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";
import { redirectIfAuthenticated } from "@/lib/auth/user";

export default async function RegisterPage() {
    await redirectIfAuthenticated();

    return (
        <AuthShell
            eyebrow="Registration"
            title="Create a verified UMIS account"
            description="Students and faculty can self-register here. All other roles remain administrator-managed."
        >
            <RegisterForm />
        </AuthShell>
    );
}

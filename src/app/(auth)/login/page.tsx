import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { redirectIfAuthenticated } from "@/lib/auth/user";

type LoginPageProps = {
    searchParams: Promise<{
        message?: string;
        email?: string;
    }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
    await redirectIfAuthenticated();

    const params = await searchParams;

    return (
        <AuthShell
            eyebrow="Authentication"
            title="Institutional sign in"
            description="Students sign in with email or enrollment number after first-time activation. Faculty and staff sign in with email after institutional provisioning and activation."
        >
            <LoginForm
                defaultEmail={params.email}
                initialMessage={params.message}
            />
        </AuthShell>
    );
}

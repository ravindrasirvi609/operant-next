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
            title="Faculty and student sign in"
            description="UMIS entry is restricted to authenticated accounts. Anonymous users are redirected to this page."
        >
            <LoginForm
                defaultEmail={params.email}
                initialMessage={params.message}
            />
        </AuthShell>
    );
}

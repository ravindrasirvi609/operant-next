import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";
import { redirectIfAuthenticated } from "@/lib/auth/user";

export default async function RegisterPage() {
    await redirectIfAuthenticated();

    return (
        <AuthShell
            eyebrow="Institutional Onboarding"
            title="Accounts are provisioned by the institution"
            description="Faculty and student identities are now created by Admin, HR, or IQAC. Use first-time activation after your account is provisioned."
        >
            <RegisterForm universityOptions={[]} collegeOptions={[]} departmentOptions={[]} />
        </AuthShell>
    );
}

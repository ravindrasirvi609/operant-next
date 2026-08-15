import { AuthShell } from "@/components/auth/auth-shell";
import { AlumniActivationForm } from "@/components/auth/forms";
import { redirectIfAuthenticated } from "@/lib/auth/user";

export default async function ActivateAlumniPage() {
    await redirectIfAuthenticated();

    return (
        <AuthShell
            eyebrow="Alumni Activation"
            title="First Time Alumni Login Setup"
            description="Activate your alumni account using your original enrollment number before using the alumni portal."
        >
            <AlumniActivationForm />
        </AuthShell>
    );
}

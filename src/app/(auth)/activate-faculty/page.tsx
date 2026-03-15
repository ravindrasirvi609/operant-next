import { AuthShell } from "@/components/auth/auth-shell";
import { FacultyActivationForm } from "@/components/auth/forms";
import { redirectIfAuthenticated } from "@/lib/auth/user";

export default async function ActivateFacultyPage() {
    await redirectIfAuthenticated();

    return (
        <AuthShell
            eyebrow="Faculty Activation"
            title="First Time Faculty Login Setup"
            description="Activate your pre-created institutional faculty account before using the faculty workspace."
        >
            <FacultyActivationForm />
        </AuthShell>
    );
}

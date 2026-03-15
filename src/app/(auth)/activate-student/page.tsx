import { AuthShell } from "@/components/auth/auth-shell";
import { StudentActivationForm } from "@/components/auth/forms";
import { redirectIfAuthenticated } from "@/lib/auth/user";

export default async function ActivateStudentPage() {
    await redirectIfAuthenticated();

    return (
        <AuthShell
            eyebrow="Student Activation"
            title="First Time Student Login Setup"
            description="Activate your pre-created institutional student account before using the student portal."
        >
            <StudentActivationForm />
        </AuthShell>
    );
}

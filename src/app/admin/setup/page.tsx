import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { AdminBootstrapForm } from "@/components/admin/admin-forms";
import {
    isAdminBootstrapEnabled,
    isAdminBootstrapSecretRequired,
} from "@/lib/auth/config";
import { getAdminCount, redirectAdminIfAuthenticated } from "@/lib/auth/user";

export default async function AdminSetupPage() {
    await redirectAdminIfAuthenticated();

    const adminCount = await getAdminCount();

    if (adminCount > 0) {
        redirect("/admin/login");
    }

    const bootstrapEnabled = isAdminBootstrapEnabled();
    const requiresSetupSecret = isAdminBootstrapSecretRequired();

    return (
        <AuthShell
            eyebrow="Admin Bootstrap"
            title="Initialize the UMIS super-admin"
            description="Create the first Admin account to unlock the operational dashboard and begin institutional setup."
        >
            <AdminBootstrapForm
                bootstrapEnabled={bootstrapEnabled}
                requiresSetupSecret={requiresSetupSecret}
            />
        </AuthShell>
    );
}

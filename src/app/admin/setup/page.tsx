import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { AdminBootstrapForm } from "@/components/admin/admin-forms";
import { getAdminCount, redirectAdminIfAuthenticated } from "@/lib/auth/user";

export default async function AdminSetupPage() {
    await redirectAdminIfAuthenticated();

    const adminCount = await getAdminCount();

    if (adminCount > 0) {
        redirect("/admin/login");
    }

    return (
        <AuthShell
            eyebrow="Admin Bootstrap"
            title="Initialize the UMIS super-admin"
            description="Create the first Admin account to unlock the operational dashboard and begin institutional setup."
        >
            <AdminBootstrapForm />
        </AuthShell>
    );
}

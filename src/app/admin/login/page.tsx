import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { AdminLoginForm } from "@/components/admin/admin-forms";
import { getAdminCount, redirectAdminIfAuthenticated } from "@/lib/auth/user";

export default async function AdminLoginPage() {
    await redirectAdminIfAuthenticated();

    const adminCount = await getAdminCount();

    if (adminCount === 0) {
        redirect("/admin/setup");
    }

    return (
        <AuthShell
            eyebrow="Admin Portal"
            title="Institutional administration access"
            description="Only Admin-role accounts can enter this portal. From here, admins manage enums, users, and system operations."
        >
            <AdminLoginForm adminExists={adminCount > 0} />
        </AuthShell>
    );
}

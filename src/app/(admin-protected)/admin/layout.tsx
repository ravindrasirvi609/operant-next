import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/user";

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const admin = await requireAdmin();

    return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}

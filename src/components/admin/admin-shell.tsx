import { RoleShell } from "@/components/shell/role-shell";

/**
 * Admin layout. Structure, navigation, and behaviour live in RoleShell; the nav
 * tree lives in src/lib/ui/navigation.ts.
 */
export function AdminShell({
    children,
    adminName,
}: {
    children: React.ReactNode;
    adminName: string;
}) {
    return (
        <RoleShell role="admin" userName={adminName}>
            {children}
        </RoleShell>
    );
}

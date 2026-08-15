import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleShell } from "@/components/shell/role-shell";

/** Alumni layout. See RoleShell and src/lib/ui/navigation.ts. */
export function AlumniShell({
    children,
    alumniName,
    alumniEmail,
    accountStatus,
}: {
    children: React.ReactNode;
    alumniName: string;
    alumniEmail: string;
    accountStatus: string;
}) {
    return (
        <RoleShell
            role="alumni"
            userName={alumniName}
            userSubtitle={alumniEmail}
            headerBadges={
                <>
                    <Badge variant="secondary">Alumni</Badge>
                    <StatusBadge status={accountStatus} />
                </>
            }
        >
            {children}
        </RoleShell>
    );
}

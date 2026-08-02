import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleShell } from "@/components/shell/role-shell";

/**
 * Student layout. See RoleShell and src/lib/ui/navigation.ts.
 *
 * The account status used to be rendered with a hand-written
 * `accountStatus === "Active" ? emerald : amber` ternary in two places; it now
 * goes through StatusBadge, which also handles "PendingActivation" and
 * "Suspended" — values the old ternary silently painted amber.
 */
export function StudentShell({
    children,
    studentName,
    studentEmail,
    accountStatus,
}: {
    children: React.ReactNode;
    studentName: string;
    studentEmail: string;
    accountStatus: string;
}) {
    return (
        <RoleShell
            role="student"
            userName={studentName}
            userSubtitle={studentEmail}
            headerBadges={
                <>
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                        Student
                    </Badge>
                    <StatusBadge status={accountStatus} />
                </>
            }
        >
            {children}
        </RoleShell>
    );
}

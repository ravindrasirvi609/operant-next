import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleShell } from "@/components/shell/role-shell";
import { resolveStatus } from "@/lib/ui/status";
import { TONE_CLASSES } from "@/lib/ui/tone";
import { cn } from "@/lib/utils";

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
    const resolvedStatus = resolveStatus(accountStatus);
    const StatusIcon = resolvedStatus.Icon;

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
                    {/* Below sm, the full-text StatusBadge (e.g. "Pending Activation") can eat
                        most of the header's width and crowd the breadcrumb — swap for an
                        icon-only chip carrying the same tone, with the label as sr-only text. */}
                    <span
                        className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full sm:hidden",
                            TONE_CLASSES[resolvedStatus.tone].chip
                        )}
                    >
                        <StatusIcon className="size-3.5" aria-hidden />
                        <span className="sr-only">{resolvedStatus.label}</span>
                    </span>
                    <StatusBadge status={accountStatus} className="hidden sm:inline-flex" />
                </>
            }
        >
            {children}
        </RoleShell>
    );
}

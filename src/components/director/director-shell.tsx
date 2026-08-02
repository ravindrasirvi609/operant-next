import { RoleShell } from "@/components/shell/role-shell";

/** Leadership layout. See RoleShell and src/lib/ui/navigation.ts. */
export function DirectorShell({
    children,
    directorName,
}: {
    children: React.ReactNode;
    directorName: string;
}) {
    return (
        <RoleShell role="director" userName={directorName}>
            {children}
        </RoleShell>
    );
}

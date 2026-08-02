import { RoleShell } from "@/components/shell/role-shell";

/** Faculty layout. See RoleShell and src/lib/ui/navigation.ts. */
export function FacultyShell({
    children,
    facultyName,
    department,
    designation,
}: {
    children: React.ReactNode;
    facultyName: string;
    department?: string;
    designation?: string;
}) {
    return (
        <RoleShell
            role="faculty"
            userName={facultyName}
            userSubtitle={department}
            headerNote={designation}
        >
            {children}
        </RoleShell>
    );
}

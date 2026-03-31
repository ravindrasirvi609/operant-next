import { StudentShell } from "@/components/student/student-shell";
import { requireStudentProfileAccess } from "@/lib/auth/user";

export default async function StudentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const user = await requireStudentProfileAccess();

    return (
        <StudentShell
            studentName={user.name}
            studentEmail={user.email}
            accountStatus={user.accountStatus}
        >
            {children}
        </StudentShell>
    );
}

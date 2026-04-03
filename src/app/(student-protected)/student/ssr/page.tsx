import { SsrContributorWorkspace } from "@/components/ssr/ssr-contributor-workspace";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { getSsrContributorWorkspace } from "@/lib/ssr/service";

export default async function StudentSsrPage() {
    const student = await requireStudentProfileAccess();
    const workspace = await getSsrContributorWorkspace({
        id: student.id,
        name: student.name,
        role: student.role,
        department: student.department,
    });

    return (
        <SsrContributorWorkspace
            assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
            actorLabel="Student"
        />
    );
}

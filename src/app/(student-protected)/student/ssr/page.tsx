import { ClipboardList } from "lucide-react";

import { SsrContributorWorkspace } from "@/components/ssr/ssr-contributor-workspace";
import { PageHeader } from "@/components/ui/page-header";
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
        <div className="space-y-6">
            <PageHeader
                title="SSR contributions"
                description="The Self Study Report sections assigned to you."
                icon={ClipboardList}
            />
            <SsrContributorWorkspace
                assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
                actorLabel="Student"
            />
        </div>
    );
}

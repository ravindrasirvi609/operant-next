import { ClipboardList } from "lucide-react";

import { SsrContributorWorkspace } from "@/components/ssr/ssr-contributor-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { requireFaculty } from "@/lib/auth/user";
import { getSsrContributorWorkspace } from "@/lib/ssr/service";

/** This page previously rendered the workspace with no page heading at all. */
export default async function FacultySsrPage() {
    const faculty = await requireFaculty();
    const workspace = await getSsrContributorWorkspace({
        id: faculty.id,
        name: faculty.name,
        role: faculty.role,
        department: faculty.department,
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="SSR contributions"
                description="The Self Study Report metrics and narrative sections assigned to you."
                icon={ClipboardList}
            />
            <SsrContributorWorkspace
                assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
                actorLabel="Faculty"
            />
        </div>
    );
}

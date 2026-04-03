import { SsrContributorWorkspace } from "@/components/ssr/ssr-contributor-workspace";
import { requireFaculty } from "@/lib/auth/user";
import { getSsrContributorWorkspace } from "@/lib/ssr/service";

export default async function FacultySsrPage() {
    const faculty = await requireFaculty();
    const workspace = await getSsrContributorWorkspace({
        id: faculty.id,
        name: faculty.name,
        role: faculty.role,
        department: faculty.department,
    });

    return (
        <SsrContributorWorkspace
            assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
            actorLabel="Faculty"
        />
    );
}

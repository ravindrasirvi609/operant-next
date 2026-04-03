import { ResearchInnovationContributorWorkspace } from "@/components/research-innovation/research-innovation-contributor-workspace";
import { requireFaculty } from "@/lib/auth/user";
import { getResearchInnovationContributorWorkspace } from "@/lib/research-innovation/service";

export default async function FacultyResearchInnovationPage() {
    const faculty = await requireFaculty();
    const workspace = await getResearchInnovationContributorWorkspace({
        id: faculty.id,
        name: faculty.name,
        role: faculty.role,
        department: faculty.department,
        collegeName: faculty.collegeName,
        universityName: faculty.universityName,
    });

    return (
        <ResearchInnovationContributorWorkspace
            actorLabel="Faculty"
            assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
        />
    );
}

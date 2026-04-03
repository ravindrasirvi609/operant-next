import { InfrastructureLibraryContributorWorkspace } from "@/components/infrastructure-library/infrastructure-library-contributor-workspace";
import { requireFaculty } from "@/lib/auth/user";
import { getInfrastructureLibraryContributorWorkspace } from "@/lib/infrastructure-library/service";

export default async function FacultyInfrastructureLibraryPage() {
    const faculty = await requireFaculty();
    const workspace = await getInfrastructureLibraryContributorWorkspace({
        id: faculty.id,
        name: faculty.name,
        role: faculty.role,
        department: faculty.department,
        collegeName: faculty.collegeName,
        universityName: faculty.universityName,
    });

    return (
        <InfrastructureLibraryContributorWorkspace
            actorLabel="Faculty"
            assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
        />
    );
}

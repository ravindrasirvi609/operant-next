import { CurriculumContributorWorkspace } from "@/components/curriculum/curriculum-contributor-workspace";
import { requireFaculty } from "@/lib/auth/user";
import { getCurriculumContributorWorkspace } from "@/lib/curriculum/service";

export default async function FacultyCurriculumPage() {
    const faculty = await requireFaculty();
    const workspace = await getCurriculumContributorWorkspace({
        id: faculty.id,
        name: faculty.name,
        role: faculty.role,
        department: faculty.department,
        collegeName: faculty.collegeName,
        universityName: faculty.universityName,
    });

    return (
        <CurriculumContributorWorkspace
            assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
            academicYearOptions={JSON.parse(JSON.stringify(workspace.academicYearOptions)) as never}
            actorLabel="Faculty"
        />
    );
}

import { StudentSupportGovernanceContributorWorkspace } from "@/components/student-support-governance/student-support-governance-contributor-workspace";
import { requireFaculty } from "@/lib/auth/user";
import { getStudentSupportGovernanceContributorWorkspace } from "@/lib/student-support-governance/service";

export default async function FacultyStudentSupportGovernancePage() {
    const faculty = await requireFaculty();
    const workspace = await getStudentSupportGovernanceContributorWorkspace({
        id: faculty.id,
        name: faculty.name,
        role: faculty.role,
        department: faculty.department,
        collegeName: faculty.collegeName,
        universityName: faculty.universityName,
    });

    return (
        <StudentSupportGovernanceContributorWorkspace
            actorLabel="Faculty"
            assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
        />
    );
}

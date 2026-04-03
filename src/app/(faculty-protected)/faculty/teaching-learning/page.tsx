import { TeachingLearningContributorWorkspace } from "@/components/teaching-learning/teaching-learning-contributor-workspace";
import { requireFaculty } from "@/lib/auth/user";
import { getTeachingLearningContributorWorkspace } from "@/lib/teaching-learning/service";

export default async function FacultyTeachingLearningPage() {
    const faculty = await requireFaculty();
    const workspace = await getTeachingLearningContributorWorkspace({
        id: faculty.id,
        name: faculty.name,
        role: faculty.role,
        department: faculty.department,
        collegeName: faculty.collegeName,
        universityName: faculty.universityName,
    });

    return (
        <TeachingLearningContributorWorkspace
            actorLabel="Faculty"
            assignments={JSON.parse(JSON.stringify(workspace.assignments)) as never}
        />
    );
}

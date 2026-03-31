import { StudentWorkspaceHome } from "@/components/student/student-workspace-home";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { getAllStudentRecords } from "@/lib/student/records-service";
import { getStudentProfile } from "@/lib/student/service";

export default async function StudentWorkspacePage() {
    const user = await requireStudentProfileAccess();

    const [workspace, records] = await Promise.all([
        getStudentProfile(user.id),
        getAllStudentRecords(user.id),
    ]);

    const safeWorkspace = JSON.parse(JSON.stringify(workspace));

    return (
        <StudentWorkspaceHome
            workspace={safeWorkspace}
            recordCounts={{
                academics: records.academics.length,
                publications: records.publications.length,
                research: records.research.length,
                awards: records.awards.length,
                skills: records.skills.length,
                sports: records.sports.length,
                cultural: records.cultural.length,
                events: records.events.length,
                social: records.social.length,
                placements: records.placements.length,
                internships: records.internships.length,
                total:
                    records.academics.length +
                    records.publications.length +
                    records.research.length +
                    records.awards.length +
                    records.skills.length +
                    records.sports.length +
                    records.cultural.length +
                    records.events.length +
                    records.social.length +
                    records.placements.length +
                    records.internships.length,
            }}
        />
    );
}

import { StudentSssWorkspace } from "@/components/student/student-sss-workspace";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { getStudentSssWorkspace } from "@/lib/accreditation/service";

export default async function StudentSssPage() {
    const student = await requireStudentProfileAccess();
    const workspace = await getStudentSssWorkspace({
        id: student.id,
        name: student.name,
        role: student.role,
    });

    return (
        <StudentSssWorkspace
            studentName={student.name}
            surveys={JSON.parse(JSON.stringify(workspace.surveys)) as never}
        />
    );
}

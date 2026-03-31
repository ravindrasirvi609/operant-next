import { StudentRecordsDashboard } from "@/components/student/student-records-dashboard";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { getAllStudentRecords } from "@/lib/student/records-service";
import { getStudentProfile } from "@/lib/student/service";

export default async function StudentRecordsPage() {
    const user = await requireStudentProfileAccess();
    const records = await getAllStudentRecords(user.id);
    const workspace = await getStudentProfile(user.id);
    const safeRecords = JSON.parse(JSON.stringify(records));
    const studentMeta = {
        userId: user.id,
        studentName: workspace.user.name,
        studentEmail: workspace.user.email,
        enrollmentNo: workspace.student.enrollmentNo,
        studentStatus: workspace.student.status,
        accountStatus: workspace.user.accountStatus,
        institutionName: (workspace.institution as { name?: string } | undefined)?.name,
        departmentName: (workspace.department as { name?: string } | undefined)?.name,
        programName: (workspace.program as { name?: string } | undefined)?.name,
        degreeType: (workspace.program as { degreeType?: string } | undefined)?.degreeType,
        lastLoginAt: workspace.user.lastLoginAt,
    };

    return (
        <StudentRecordsDashboard initialRecords={safeRecords} studentMeta={studentMeta} />
    );
}

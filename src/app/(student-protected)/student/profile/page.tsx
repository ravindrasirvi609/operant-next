import { StudentProfileForm } from "@/components/student/student-profile-form";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { getStudentProfile } from "@/lib/student/service";

export default async function StudentProfilePage() {
    const user = await requireStudentProfileAccess();
    const workspace = await getStudentProfile(user.id);
    const studentUser = workspace.user;
    const safeStudentDetails = studentUser.studentDetails
        ? JSON.parse(JSON.stringify(studentUser.studentDetails))
        : undefined;
    const studentMeta = {
        enrollmentNo: workspace.student.enrollmentNo,
        studentStatus: workspace.student.status,
        accountStatus: studentUser.accountStatus,
        institutionName: (workspace.institution as { name?: string } | undefined)?.name,
        departmentName: (workspace.department as { name?: string } | undefined)?.name,
        programName: (workspace.program as { name?: string } | undefined)?.name,
        degreeType: (workspace.program as { degreeType?: string } | undefined)?.degreeType,
        durationYears: (workspace.program as { durationYears?: number } | undefined)?.durationYears,
        admissionYear: workspace.student.admissionYear,
        mobile: workspace.student.mobile ?? studentUser.phone,
        lastLoginAt: studentUser.lastLoginAt,
    };

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
                <StudentProfileForm
                    studentId={studentUser._id.toString()}
                    studentName={studentUser.name}
                    studentEmail={studentUser.email}
                    studentMeta={studentMeta}
                    studentDetails={safeStudentDetails}
                    currentPhotoURL={studentUser.photoURL}
                />
            </div>
        </main>
    );
}

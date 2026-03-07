import { StudentProfileForm } from "@/components/student/student-profile-form";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { getStudentProfile } from "@/lib/student/service";

export default async function StudentProfilePage() {
    const user = await requireStudentProfileAccess();
    const student = await getStudentProfile(user.id);

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <StudentProfileForm
                    studentDetails={JSON.parse(JSON.stringify(student.studentDetails))}
                    studentEmail={student.email}
                    studentName={student.name}
                />
            </div>
        </main>
    );
}

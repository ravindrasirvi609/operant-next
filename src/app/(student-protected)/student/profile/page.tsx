import { StudentRecordOverview } from "@/components/student/student-record-overview";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { getStudentProfile } from "@/lib/student/service";

export default async function StudentProfilePage() {
    const user = await requireStudentProfileAccess();
    const workspace = await getStudentProfile(user.id);
    const safeWorkspace = JSON.parse(JSON.stringify(workspace));

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
                <StudentRecordOverview workspace={safeWorkspace} />
            </div>
        </main>
    );
}

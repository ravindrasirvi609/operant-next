import { Badge } from "@/components/ui/badge";
import { StudentRecordOverview } from "@/components/student/student-record-overview";
import { requireStudentProfileAccess } from "@/lib/auth/user";
import { getStudentProfile } from "@/lib/student/service";

export default async function StudentProfilePage() {
    const user = await requireStudentProfileAccess();
    const workspace = await getStudentProfile(user.id);
    const safeWorkspace = JSON.parse(JSON.stringify(workspace));

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
                <Badge variant="secondary">Student Profile</Badge>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                    Academic identity and institutional mapping
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
                    This page shows the centrally provisioned student identity used across accreditation, AQAR, and reporting workflows. It is optimized for quick review on both large and small screens.
                </p>
            </section>

            <div className="w-full">
                <StudentRecordOverview workspace={safeWorkspace} />
            </div>
        </div>
    );
}

import { Badge } from "@/components/ui/badge";
import { StudentProfileForm } from "@/components/student/student-profile-form";
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
                    This page now includes the self-service area for profile photo and basic information, while institutional mapping and academic placement remain centrally managed.
                </p>
            </section>

            <StudentProfileForm
                user={{
                    id: workspace.user._id.toString(),
                    name: workspace.user.name,
                    email: workspace.user.email,
                    photoURL: workspace.user.photoURL,
                    accountStatus: workspace.user.accountStatus,
                }}
                student={{
                    enrollmentNo: workspace.student.enrollmentNo,
                    firstName: workspace.student.firstName,
                    lastName: workspace.student.lastName,
                    gender: workspace.student.gender,
                    dob: workspace.student.dob?.toString(),
                    mobile: workspace.student.mobile,
                    address: workspace.student.address,
                    status: workspace.student.status,
                    admissionYear: workspace.student.admissionYear,
                }}
                institutionName={(workspace.institution as { name?: string } | undefined)?.name}
                departmentName={(workspace.department as { name?: string } | undefined)?.name}
                programName={(workspace.program as { name?: string } | undefined)?.name}
            />

            <div className="w-full">
                <StudentRecordOverview workspace={safeWorkspace} />
            </div>
        </div>
    );
}

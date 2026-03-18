import { FacultyWorkspaceForm } from "@/components/faculty/faculty-workspace-form";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyWorkspace } from "@/lib/faculty/service";

export default async function FacultyProfilePage() {
    const user = await requireFaculty();
    const workspace = await getFacultyWorkspace(user.id);

    const facultyUser = {
        id: workspace.user._id.toString(),
        name: workspace.user.name,
        email: workspace.user.email,
        photoURL: workspace.user.photoURL,
        designation: workspace.user.designation,
        department: workspace.user.department,
        collegeName: workspace.user.collegeName,
        universityName: workspace.user.universityName,
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_32%),radial-gradient(circle_at_90%_8%,#dcfce7,transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f3f4f6_100%)]">
            <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 xl:py-10">
                <FacultyWorkspaceForm
                    facultyRecord={JSON.parse(JSON.stringify(workspace.facultyRecord))}
                    academicYearOptions={workspace.academicYearOptions ?? []}
                    programOptions={workspace.programOptions ?? []}
                    courseOptions={workspace.courseOptions ?? []}
                    user={facultyUser}
                />
            </div>
        </main>
    );
}

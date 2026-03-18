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
        <main className="min-h-screen bg-zinc-50">
            <div className="w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
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

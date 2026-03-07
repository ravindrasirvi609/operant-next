import { FacultyWorkspaceForm } from "@/components/faculty/faculty-workspace-form";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyWorkspace } from "@/lib/faculty/service";

export default async function FacultyProfilePage() {
    const user = await requireFaculty();
    const workspace = await getFacultyWorkspace(user.id);

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <FacultyWorkspaceForm
                    facultyRecord={JSON.parse(JSON.stringify(workspace.facultyRecord))}
                    user={JSON.parse(JSON.stringify(workspace.user))}
                />
            </div>
        </main>
    );
}

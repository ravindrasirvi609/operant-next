import { FacultyWorkspaceForm } from "@/components/faculty/faculty-workspace-form";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyWorkspace } from "@/lib/faculty/service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

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
        <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10 xl:py-10">
            <div className="space-y-6">
                <Alert>
                    <AlertTitle>Faculty Workspace</AlertTitle>
                    <AlertDescription>
                        Fill each section using the tabs below. Use the <span className="font-medium">Download</span>{" "}
                        buttons inside every module to keep your academic dossier ready for verification.
                    </AlertDescription>
                </Alert>
                <Separator />
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

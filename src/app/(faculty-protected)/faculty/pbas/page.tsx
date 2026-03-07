import { PbasDashboard } from "@/components/pbas/pbas-dashboard";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyEvidenceDefaults } from "@/lib/faculty-evidence/service";
import { getFacultyPbasApplications } from "@/lib/pbas/service";

export default async function FacultyPbasPage() {
    const faculty = await requireFaculty();
    const [applications, evidenceDefaults] = await Promise.all([
        getFacultyPbasApplications({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
        getFacultyEvidenceDefaults(faculty.id),
    ]);

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <PbasDashboard
                    facultyName={faculty.name}
                    evidenceDefaults={JSON.parse(JSON.stringify(evidenceDefaults.pbas))}
                    initialApplications={JSON.parse(JSON.stringify(applications))}
                />
            </div>
        </main>
    );
}

import { AqarDashboard } from "@/components/aqar/aqar-dashboard";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyAqarApplications } from "@/lib/aqar/service";
import { getFacultyEvidenceDefaults } from "@/lib/faculty-evidence/service";

export default async function FacultyAqarPage() {
    const faculty = await requireFaculty();
    const [applications, evidenceDefaults] = await Promise.all([
        getFacultyAqarApplications({
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
                <AqarDashboard
                    facultyName={faculty.name}
                    evidenceDefaults={JSON.parse(JSON.stringify(evidenceDefaults.aqar))}
                    initialApplications={JSON.parse(JSON.stringify(applications))}
                />
            </div>
        </main>
    );
}

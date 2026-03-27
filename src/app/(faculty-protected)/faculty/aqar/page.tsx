import { AqarDashboard } from "@/components/aqar/aqar-dashboard";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyAqarApplications } from "@/lib/aqar/service";
import { getFacultyReportDefaults } from "@/lib/faculty/report-defaults";
import { listFacultyAcademicYearOptions } from "@/lib/faculty/service";

export default async function FacultyAqarPage() {
    const faculty = await requireFaculty();
    const [applications, facultyDefaults, academicYearOptions] = await Promise.all([
        getFacultyAqarApplications({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
        getFacultyReportDefaults(faculty.id),
        listFacultyAcademicYearOptions(),
    ]);

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
                <AqarDashboard
                    facultyName={faculty.name}
                    facultyId={faculty.id}
                    academicYearOptions={JSON.parse(JSON.stringify(academicYearOptions))}
                    evidenceDefaults={JSON.parse(JSON.stringify(facultyDefaults.aqar))}
                    initialApplications={JSON.parse(JSON.stringify(applications))}
                />
            </div>
        </main>
    );
}

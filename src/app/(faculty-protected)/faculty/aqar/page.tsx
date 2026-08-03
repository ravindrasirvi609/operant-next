import { FileBarChart } from "lucide-react";

import { AqarDashboard } from "@/components/aqar/aqar-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyAqarApplications } from "@/lib/aqar/service";
import { getFacultyReportDefaults } from "@/lib/faculty/report-defaults";
import { listFacultyAcademicYearOptions } from "@/lib/faculty/service";

/**
 * Previously this page had no `PageHeader` at all — the title lived inside the
 * dashboard as a `CardTitle` reading "Modern AQAR workspace for {name}" on a
 * hardcoded `from-white via-white to-amber-50/70` gradient card, which also meant
 * the module had no page heading in dark mode that was legible. See the PBAS page
 * for why the nested `<main>` was removed.
 */
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
        <div className="space-y-6">
            <PageHeader
                title="AQAR contributions"
                description="Your annual quality assurance report — research, awards, patents, and outreach for the reporting year."
                icon={FileBarChart}
            />
            <AqarDashboard
                facultyName={faculty.name}
                facultyId={faculty.id}
                academicYearOptions={JSON.parse(JSON.stringify(academicYearOptions))}
                evidenceDefaults={JSON.parse(JSON.stringify(facultyDefaults.aqar))}
                initialApplications={JSON.parse(JSON.stringify(applications))}
            />
        </div>
    );
}

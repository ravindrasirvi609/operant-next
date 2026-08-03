import { Calculator } from "lucide-react";

import { CasDashboard } from "@/components/cas/cas-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { requireFaculty } from "@/lib/auth/user";
import { getCasEligibilityForFaculty, getFacultyCasApplications } from "@/lib/cas/service";
import { getFacultyReportDefaults } from "@/lib/faculty/report-defaults";
import { listFacultyAcademicYearOptions } from "@/lib/faculty/service";
import { getPbasReportsForCas } from "@/lib/pbas/service";

export default async function FacultyCasPage() {
    const faculty = await requireFaculty();
    const [pbasReports, applications, facultyDefaults, eligibility, academicYearOptions] = await Promise.all([
        getPbasReportsForCas(faculty.id),
        getFacultyCasApplications({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
        getFacultyReportDefaults(faculty.id),
        getCasEligibilityForFaculty({
            id: faculty.id,
            name: faculty.name,
            role: faculty.role,
            department: faculty.department,
        }),
        listFacultyAcademicYearOptions(),
    ]);

    return (
        <main className="min-h-screen bg-muted/50">
            <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
                <PageHeader
                    title="CAS Applications"
                    description="Track CAS promotion eligibility, PBAS linkage, and submission status."
                    icon={Calculator}
                />
                <CasDashboard
                    facultyName={faculty.name}
                    facultyId={faculty.id}
                    eligibility={JSON.parse(JSON.stringify(eligibility))}
                    academicYearOptions={JSON.parse(JSON.stringify(academicYearOptions))}
                    initialApplications={JSON.parse(JSON.stringify(applications))}
                    evidenceDefaults={JSON.parse(JSON.stringify(facultyDefaults.cas))}
                    pbasOptions={JSON.parse(
                        JSON.stringify(
                            pbasReports.map((report) => ({
                                _id: report._id,
                                academicYear: report.academicYear,
                                totalApiScore: report.apiScore.totalScore,
                                teachingScore: report.apiScore.teachingActivities,
                                researchScore: report.apiScore.researchAcademicContribution,
                                institutionalScore: report.apiScore.institutionalResponsibilities,
                                status: report.status,
                                usableForSubmit: report.usableForSubmit,
                            }))
                        )
                    )}
                />
            </div>
        </main>
    );
}

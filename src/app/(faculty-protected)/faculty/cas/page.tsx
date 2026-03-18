import { CasDashboard } from "@/components/cas/cas-dashboard";
import { requireFaculty } from "@/lib/auth/user";
import { getCasEligibilityForFaculty, getFacultyCasApplications } from "@/lib/cas/service";
import { getFacultyReportDefaults } from "@/lib/faculty/report-defaults";
import { getPbasReportsForCas } from "@/lib/pbas/service";

export default async function FacultyCasPage() {
    const faculty = await requireFaculty();
    const [pbasReports, applications, facultyDefaults, eligibility] = await Promise.all([
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
    ]);

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <CasDashboard
                    facultyName={faculty.name}
                    facultyId={faculty.id}
                    eligibility={JSON.parse(JSON.stringify(eligibility))}
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

import { CasDashboard } from "@/components/cas/cas-dashboard";
import { requireFaculty } from "@/lib/auth/user";
import { getFacultyCasApplications } from "@/lib/cas/service";
import { getFacultyEvidenceDefaults } from "@/lib/faculty-evidence/service";
import { getPbasReportsForCas } from "@/lib/pbas/service";

export default async function FacultyCasPage() {
    const faculty = await requireFaculty();
    const [pbasReports, applications, evidenceDefaults] = await Promise.all([
        getPbasReportsForCas(faculty.id),
        getFacultyCasApplications({
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
                <CasDashboard
                    facultyName={faculty.name}
                    initialApplications={JSON.parse(JSON.stringify(applications))}
                    evidenceDefaults={JSON.parse(JSON.stringify(evidenceDefaults.cas))}
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
                            }))
                        )
                    )}
                />
            </div>
        </main>
    );
}

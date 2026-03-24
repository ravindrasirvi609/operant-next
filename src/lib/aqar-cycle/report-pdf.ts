import AqarCycle from "@/models/core/aqar-cycle";
import { buildTemplatedPdf } from "@/lib/report-templates/pdf";
import { renderReportTemplate } from "@/lib/report-templates/service";

export async function buildAqarCyclePdf(cycle: InstanceType<typeof AqarCycle>) {
    const criterionContext = Object.fromEntries(
        cycle.criteriaSections.flatMap((criterion) => [
            [`criterion_${criterion.criterionCode}_heading`, `${criterion.criterionCode} ${criterion.title}`],
            [
                `criterion_${criterion.criterionCode}_body`,
                [
                    `Criterion summary: ${criterion.summary}`,
                    criterion.narrative ? `Narrative detail: ${criterion.narrative}` : undefined,
                    `Completion status: ${criterion.completionPercent}% complete.`,
                    `Current state: ${criterion.status}.`,
                    `Metrics captured: ${Object.entries(criterion.metrics)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" | ") || "-"}.`,
                ]
                    .filter(Boolean)
                    .join("\n"),
            ],
        ])
    );

    const template = await renderReportTemplate("AQAR_CYCLE", {
        academicYear: cycle.academicYear,
        cycleStatus: cycle.status,
        reportingFromDate: cycle.reportingPeriod.fromDate,
        reportingToDate: cycle.reportingPeriod.toDate,
        totalFaculty: cycle.institutionProfile.totalFaculty,
        totalStudents: cycle.institutionProfile.totalStudents,
        totalDepartments: cycle.institutionProfile.totalDepartments,
        totalPrograms: cycle.institutionProfile.totalPrograms,
        approvedPbasReports: cycle.summaryMetrics.approvedPbasReports,
        casApplications: cycle.summaryMetrics.casApplications,
        facultyAqarContributions: cycle.summaryMetrics.facultyAqarContributions,
        placements: cycle.summaryMetrics.placements,
        publications: cycle.summaryMetrics.publications,
        projects: cycle.summaryMetrics.projects,
        ...criterionContext,
    });

    return buildTemplatedPdf(template);
}

import AqarCycle from "@/models/core/aqar-cycle";
import { buildTemplatedPdf } from "@/lib/report-templates/pdf";
import { renderReportTemplate } from "@/lib/report-templates/service";

const AQAR_MODULE_HEADINGS = {
    C1: "C1 Curriculum Management",
    C2: "C2 Teaching Learning Process",
    C3: "C3 Research & Innovation Ecosystem",
    C4: "C4 Infrastructure & Library",
    C5: "C5 Student Support & Governance",
    C6: "C6 Governance Leadership & IQAC",
    C7: "C7 Institutional Values & Best Practices",
} as const;

type ModuleCode = keyof typeof AQAR_MODULE_HEADINGS;

function formatMetricEntries(metrics: Record<string, number | string>) {
    return Object.entries(metrics)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" | ");
}

function formatSourceSnapshots(
    snapshots: Array<{
        sourceType: string;
        label: string;
        count?: number;
        value?: string;
    }>
) {
    return snapshots
        .map((snapshot) =>
            `${snapshot.label} (${snapshot.sourceType}): ${
                typeof snapshot.count === "number" ? snapshot.count : snapshot.value || "-"
            }`
        )
        .join(" | ");
}

export async function buildAqarCyclePdf(cycle: InstanceType<typeof AqarCycle>) {
    const criteriaByCode = new Map(
        cycle.criteriaSections.map((criterion) => [criterion.criterionCode, criterion])
    );

    const criterionContext = Object.fromEntries(
        (Object.keys(AQAR_MODULE_HEADINGS) as ModuleCode[]).flatMap((criterionCode) => {
            const criterion = criteriaByCode.get(criterionCode);
            const heading = AQAR_MODULE_HEADINGS[criterionCode];
            const body = criterion
                ? [
                      `Module alignment: ${criterionCode} - ${criterion.title}.`,
                      `Module summary: ${criterion.summary}`,
                      criterion.narrative ? `Narrative detail: ${criterion.narrative}` : undefined,
                      `Workflow readiness: ${criterion.completionPercent}% complete | Current state: ${criterion.status}.`,
                      `Key metrics: ${formatMetricEntries(criterion.metrics) || "-"}.`,
                      `Source evidence feeds: ${formatSourceSnapshots(criterion.sourceSnapshots) || "-"}.`,
                  ]
                      .filter(Boolean)
                      .join("\n")
                : [
                      "Module alignment: Not yet generated from AQAR mappings.",
                      "Module summary: This module is configured in the AQAR template but no snapshot data was available for the selected cycle.",
                      "Workflow readiness: 0% complete | Current state: Pending.",
                      "Key metrics: -.",
                      "Source evidence feeds: -.",
                  ].join("\n");

            return [
                [`criterion_${criterionCode}_heading`, heading],
                [`criterion_${criterionCode}_body`, body],
                [`module_${criterionCode}_heading`, heading],
                [`module_${criterionCode}_body`, body],
            ];
        })
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

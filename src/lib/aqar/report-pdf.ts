import AqarApplication from "@/models/core/aqar-application";
import { buildTemplatedPdf } from "@/lib/report-templates/pdf";
import { renderReportTemplate } from "@/lib/report-templates/service";

export async function buildAqarReportPdf(application: InstanceType<typeof AqarApplication>) {
    await application.populate({
        path: "facultyId",
        select: "name email designation department universityName collegeName",
    });

    const faculty = application.facultyId as unknown as {
        name?: string;
        email?: string;
        designation?: string;
        department?: string;
        universityName?: string;
        collegeName?: string;
    };
    const template = await renderReportTemplate("AQAR_FACULTY", {
        facultyName: faculty.name || "Faculty Member",
        facultyDesignation: faculty.designation || "Faculty",
        facultyMeta: [faculty.email, faculty.department, faculty.collegeName, faculty.universityName]
            .filter(Boolean)
            .join(" | "),
        academicYear: application.academicYear,
        reportingFromDate: application.reportingPeriod.fromDate,
        reportingToDate: application.reportingPeriod.toDate,
        workflowStatus: application.status,
        researchPaperCount: application.metrics.researchPaperCount,
        seedMoneyProjectCount: application.metrics.seedMoneyProjectCount,
        awardRecognitionCount: application.metrics.awardRecognitionCount,
        fellowshipCount: application.metrics.fellowshipCount,
        researchFellowCount: application.metrics.researchFellowCount,
        patentCount: application.metrics.patentCount,
        phdAwardCount: application.metrics.phdAwardCount,
        bookChapterCount: application.metrics.bookChapterCount,
        eContentCount: application.metrics.eContentCount,
        consultancyCount: application.metrics.consultancyCount,
        financialSupportCount: application.metrics.financialSupportCount,
        fdpCount: application.metrics.fdpCount,
        totalContributionIndex: application.metrics.totalContributionIndex,
        researchPaperSummary:
            application.facultyContribution.researchPapers
                .map((item) => `${item.paperTitle} (${item.publicationYear})`)
                .join("; ") || "-",
        seedMoneyProjectSummary:
            application.facultyContribution.seedMoneyProjects
                .map((item) => `${item.schemeOrProjectTitle} - ${item.fundingAgencyName}`)
                .join("; ") || "-",
        awardsSummary:
            application.facultyContribution.awardsRecognition
                .map((item) => `${item.teacherName}: ${item.awardName}`)
                .join("; ") || "-",
        fellowshipsSummary:
            application.facultyContribution.fellowships
                .map((item) => `${item.teacherName}: ${item.fellowshipName}`)
                .join("; ") || "-",
        patentsSummary:
            application.facultyContribution.patents.map((item) => `${item.title} (${item.status})`).join("; ") || "-",
        phdAwardsSummary:
            application.facultyContribution.phdAwards
                .map((item) => `${item.scholarName}: ${item.thesisTitle}`)
                .join("; ") || "-",
        booksSummary:
            application.facultyContribution.booksChapters
                .map((item) => `${item.titleOfWork} (${item.type})`)
                .join("; ") || "-",
        eContentSummary:
            application.facultyContribution.eContentDeveloped.map((item) => item.moduleName).join("; ") || "-",
        consultancySummary:
            application.facultyContribution.consultancyServices
                .map((item) => item.consultancyProjectName)
                .join("; ") || "-",
        financialSupportSummary:
            application.facultyContribution.financialSupport
                .map((item) => item.conferenceName)
                .join("; ") || "-",
        fdpSummary:
            application.facultyContribution.facultyDevelopmentProgrammes
                .map((item) => item.programTitle)
                .join("; ") || "-",
    });

    return buildTemplatedPdf(template);
}

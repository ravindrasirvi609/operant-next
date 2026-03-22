import type { getFacultyWorkspace } from "@/lib/faculty/service";
import { buildTemplatedPdf } from "@/lib/report-templates/pdf";
import { renderReportTemplate } from "@/lib/report-templates/service";

type FacultyWorkspace = Awaited<ReturnType<typeof getFacultyWorkspace>>;
type CasReportEntry = {
    promotionFrom: string;
    promotionTo: string;
    assessmentPeriodStart: string;
    assessmentPeriodEnd: string;
    currentStage?: string;
    teachingExperienceYears?: number;
    publicationCount?: number;
    bookCount?: number;
    conferenceCount?: number;
    workshopCount?: number;
    projectCount?: number;
    phdSupervisionCount?: number;
    adminResponsibilitySummary?: string;
    researchSummary?: string;
    apiScoreClaimed?: number;
};
type PbasReportEntry = {
    academicYear: string;
    teachingHours?: number;
    coursesHandled?: string[];
    mentoringCount?: number;
    labSupervisionCount?: number;
    researchPaperCount?: number;
    journalCount?: number;
    bookCount?: number;
    patentCount?: number;
    conferenceCount?: number;
    committeeWork?: string;
    examDuties?: string;
    studentGuidance?: string;
    teachingScore?: number;
    researchScore?: number;
    institutionalScore?: number;
    totalApiScore?: number;
    remarks?: string;
};
export type FacultyReportEntry =
    | { type: "cas"; data: CasReportEntry }
    | { type: "pbas"; data: PbasReportEntry };

export async function buildFacultyReportPdf(
    workspace: FacultyWorkspace,
    entry: FacultyReportEntry
) {
    const { user } = workspace;

    if (entry.type === "cas") {
        const cas = entry.data;
        const template = await renderReportTemplate("FACULTY_CAS", {
            facultyName: user.name,
            facultyDesignation: user.designation || "Faculty Member",
            facultyMeta: [
                user.email,
                user.phone,
                user.department,
                user.collegeName,
                user.universityName,
            ]
                .filter(Boolean)
                .join(" | "),
            promotionFrom: cas.promotionFrom,
            promotionTo: cas.promotionTo,
            assessmentPeriodStart: cas.assessmentPeriodStart,
            assessmentPeriodEnd: cas.assessmentPeriodEnd,
            currentStage: cas.currentStage || "-",
            teachingExperienceYears: cas.teachingExperienceYears || 0,
            publicationCount: cas.publicationCount || 0,
            bookCount: cas.bookCount || 0,
            conferenceCount: cas.conferenceCount || 0,
            workshopCount: cas.workshopCount || 0,
            projectCount: cas.projectCount || 0,
            phdSupervisionCount: cas.phdSupervisionCount || 0,
            adminResponsibilitySummary:
                cas.adminResponsibilitySummary || "No administrative responsibilities listed.",
            researchSummary: cas.researchSummary || "No research summary provided.",
            apiScoreClaimed: cas.apiScoreClaimed || 0,
        });

        return buildTemplatedPdf(template);
    }

    const pbas = entry.data;
    const template = await renderReportTemplate("FACULTY_PBAS", {
        facultyName: user.name,
        facultyDesignation: user.designation || "Faculty Member",
        facultyMeta: [
            user.email,
            user.phone,
            user.department,
            user.collegeName,
            user.universityName,
        ]
            .filter(Boolean)
            .join(" | "),
        academicYear: pbas.academicYear,
        teachingHours: pbas.teachingHours || 0,
        coursesHandled: (pbas.coursesHandled || []).join(", ") || "-",
        mentoringCount: pbas.mentoringCount || 0,
        labSupervisionCount: pbas.labSupervisionCount || 0,
        researchPaperCount: pbas.researchPaperCount || 0,
        journalCount: pbas.journalCount || 0,
        bookCount: pbas.bookCount || 0,
        patentCount: pbas.patentCount || 0,
        conferenceCount: pbas.conferenceCount || 0,
        committeeWork: pbas.committeeWork || "-",
        examDuties: pbas.examDuties || "-",
        studentGuidance: pbas.studentGuidance || "-",
        teachingScore: pbas.teachingScore || 0,
        researchScore: pbas.researchScore || 0,
        institutionalScore: pbas.institutionalScore || 0,
        totalApiScore: pbas.totalApiScore || 0,
        remarks: pbas.remarks || "-",
    });

    return buildTemplatedPdf(template);
}

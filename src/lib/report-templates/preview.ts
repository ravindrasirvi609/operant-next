import CasApplication from "@/models/core/cas-application";
import FacultyPbasForm from "@/models/core/faculty-pbas-form";
import AqarApplication from "@/models/core/aqar-application";
import AqarCycle from "@/models/core/aqar-cycle";
import Faculty from "@/models/faculty/faculty";
import ReportTemplate, { type ReportTemplateType } from "@/models/core/report-template";
import { AuthError } from "@/lib/auth/errors";
import dbConnect from "@/lib/dbConnect";
import { buildTemplatedPdf } from "@/lib/report-templates/pdf";
import { renderReportTemplate } from "@/lib/report-templates/service";
import { buildPbasReportPdf } from "@/lib/pbas/report-pdf";
import { buildAqarReportPdf } from "@/lib/aqar/report-pdf";
import { buildAqarCyclePdf } from "@/lib/aqar-cycle/report-pdf";
import { getFacultyWorkspace } from "@/lib/faculty/service";
import { buildFacultyReportPdf } from "@/lib/faculty/report-pdf";
import { getPbasSnapshotForApplication } from "@/lib/pbas/service";

type PreviewMode = "sample" | "live";

export type ReportTemplatePreviewCandidate = {
    id: string;
    label: string;
    subtitle?: string;
};

function facultyNameFromValue(value: unknown) {
    if (!value || typeof value !== "object") {
        return "Faculty Member";
    }

    const faculty = value as { firstName?: string; lastName?: string };
    return [faculty.firstName, faculty.lastName].filter(Boolean).join(" ").trim() || "Faculty Member";
}

async function getTemplateById(id: string) {
    await dbConnect();

    const template = await ReportTemplate.findById(id).select("_id reportType name version isActive");

    if (!template) {
        throw new AuthError("Report template not found.", 404);
    }

    return template;
}

async function listLiveCandidates(reportType: ReportTemplateType): Promise<ReportTemplatePreviewCandidate[]> {
    switch (reportType) {
        case "PBAS_APPRAISAL":
        case "FACULTY_PBAS": {
            const records = await FacultyPbasForm.find({})
                .sort({ updatedAt: -1 })
                .limit(12)
                .populate("facultyId", "firstName lastName");

            return records.map((record) => ({
                id: record._id.toString(),
                label: `${facultyNameFromValue(record.facultyId)} • ${record.academicYear}`,
                subtitle: record.status,
            }));
        }
        case "FACULTY_CAS": {
            const records = await CasApplication.find({})
                .sort({ updatedAt: -1 })
                .limit(12)
                .populate("facultyId", "firstName lastName");

            return records.map((record) => ({
                id: record._id.toString(),
                label: `${facultyNameFromValue(record.facultyId)} • ${record.applicationYear}`,
                subtitle: `${record.currentDesignation} to ${record.applyingForDesignation}`,
            }));
        }
        case "AQAR_FACULTY": {
            const records = await AqarApplication.find({})
                .sort({ updatedAt: -1 })
                .limit(12)
                .populate("facultyId", "firstName lastName");

            return records.map((record) => ({
                id: record._id.toString(),
                label: `${facultyNameFromValue(record.facultyId)} • ${record.academicYear}`,
                subtitle: record.status,
            }));
        }
        case "AQAR_CYCLE": {
            const cycles = await AqarCycle.find({}).sort({ updatedAt: -1 }).limit(12);

            return cycles.map((cycle) => ({
                id: cycle._id.toString(),
                label: `AQAR Cycle • ${cycle.academicYear}`,
                subtitle: cycle.status,
            }));
        }
        default:
            return [];
    }
}

export async function getReportTemplatePreviewOptions(id: string) {
    const template = await getTemplateById(id);
    const candidates = await listLiveCandidates(template.reportType);

    return {
        templateId: template._id.toString(),
        reportType: template.reportType,
        templateName: template.name,
        version: template.version,
        candidates,
        defaultRecordId: candidates[0]?.id,
    };
}

async function buildSamplePreviewPdf(reportType: ReportTemplateType) {
    const commonFacultyMeta = "demo.faculty@umis.edu | Computer Science | Engineering College | State University";
    const sampleAcademicYear = "YYYY-YYYY";

    const sampleContexts: Record<ReportTemplateType, Record<string, string | number>> = {
        PBAS_APPRAISAL: {
            facultyName: "Dr. Meera Sharma",
            facultyDesignation: "Associate Professor",
            facultyMeta: commonFacultyMeta,
            academicYear: sampleAcademicYear,
            appraisalFromDate: "2025-07-01",
            appraisalToDate: "2026-06-30",
            workflowStatus: "Under Review",
            classesTaken: 182,
            coursePreparationHours: 94,
            coursesTaught: "Data Structures, AI Fundamentals, Software Engineering",
            mentoringCount: 28,
            labSupervisionCount: 10,
            feedbackSummary: "Student feedback average 8.7/10 with strong mentoring outcomes.",
            researchPaperCount: 6,
            bookCount: 1,
            patentCount: 2,
            conferenceCount: 5,
            projectCount: 3,
            paperHighlights: "AI-enabled accreditation analytics (2025); Outcome mapping study (2026)",
            committeeSummary: "BoS, NAAC Cell, Innovation Committee",
            administrativeDutySummary: "IQAC coordinator, timetable planning",
            examDutySummary: "University paper setting, practical moderation",
            studentGuidanceSummary: "Project mentoring (18), startup mentoring (10)",
            extensionSummary: "Rural outreach, digital literacy camp",
            teachingScore: 82,
            researchScore: 94,
            institutionalScore: 61,
            totalScore: 237,
        },
        AQAR_FACULTY: {
            facultyName: "Dr. Meera Sharma",
            facultyDesignation: "Associate Professor",
            facultyMeta: commonFacultyMeta,
            academicYear: sampleAcademicYear,
            reportingFromDate: "2025-07-01",
            reportingToDate: "2026-03-31",
            workflowStatus: "Draft",
            researchPaperCount: 5,
            seedMoneyProjectCount: 2,
            awardRecognitionCount: 1,
            fellowshipCount: 1,
            researchFellowCount: 3,
            patentCount: 2,
            phdAwardCount: 1,
            bookChapterCount: 2,
            eContentCount: 4,
            consultancyCount: 1,
            financialSupportCount: 3,
            fdpCount: 6,
            totalContributionIndex: 88,
            researchPaperSummary: "Outcome-based analytics in HEIs (2025); Faculty productivity insights (2026)",
            seedMoneyProjectSummary: "NBA readiness automation - Internal R&D Cell; Student success dashboard - IQAC",
            awardsSummary: "Dr. Meera Sharma: Best Researcher Award",
            fellowshipsSummary: "Dr. Meera Sharma: National Faculty Fellowship",
            patentsSummary: "Accreditation workflow engine (Published); Smart academic audit bot (Filed)",
            phdAwardsSummary: "Amit Kumar: Learning analytics for quality assurance",
            booksSummary: "Quality Metrics in Higher Education (Book); AI for Academic Governance (Chapter)",
            eContentSummary: "MOOC assessment module; Quality audit explainer series",
            consultancySummary: "Institutional quality audit redesign",
            financialSupportSummary: "NAAC preparation conclave; Quality benchmark workshop",
            fdpSummary: "OBE FDP; Research writing bootcamp; IQAC systems workshop",
        },
        AQAR_CYCLE: {
            academicYear: sampleAcademicYear,
            cycleStatus: "Finalized",
            reportingFromDate: "2025-07-01",
            reportingToDate: "2026-03-31",
            totalFaculty: 148,
            totalStudents: 2310,
            totalDepartments: 12,
            totalPrograms: 27,
            approvedPbasReports: 122,
            casApplications: 26,
            facultyAqarContributions: 117,
            placements: 384,
            publications: 212,
            projects: 46,
            module_C1_heading: "C1 Curriculum Management",
            module_C1_body:
                "Module alignment: NAAC Criterion 1 - Curricular Aspects.\nModule summary: Curriculum review cycles aligned with OBE targets across all schools.\nWorkflow readiness: 84% complete | Current state: Ready.\nKey metrics: curriculumRevisions: 12 | newCourses: 6.\nSource evidence feeds: curriculum plans, syllabus versions, outcome mappings, and BoS decisions.",
            module_C2_heading: "C2 Teaching Learning Process",
            module_C2_body:
                "Module alignment: NAAC Criterion 2 - Teaching, Learning and Evaluation.\nModule summary: Evaluation reforms and mentoring coverage improved across departments.\nWorkflow readiness: 88% complete | Current state: Ready.\nKey metrics: mentorCoverage: 91 | feedbackCycles: 2.\nSource evidence feeds: teaching plans, sessions, assessments, and learner-support records.",
            module_C3_heading: "C3 Research & Innovation Ecosystem",
            module_C3_body:
                "Module alignment: NAAC Criterion 3 - Research, Innovations and Extension.\nModule summary: Strong publication and funded project pipeline with growing extension activity.\nWorkflow readiness: 81% complete | Current state: Ready.\nKey metrics: publications: 212 | projects: 46.\nSource evidence feeds: research portfolios, projects, grants, innovation records, and extension evidence.",
            module_C4_heading: "C4 Infrastructure & Library",
            module_C4_body:
                "Module alignment: NAAC Criterion 4 - Infrastructure and Learning Resources.\nModule summary: Digital learning resources expanded with new LMS-backed repositories.\nWorkflow readiness: 76% complete | Current state: Ready.\nKey metrics: smartClassrooms: 38 | digitalCollections: 14.\nSource evidence feeds: facility inventories, library resources, usage analytics, and maintenance records.",
            module_C5_heading: "C5 Student Support & Governance",
            module_C5_body:
                "Module alignment: NAAC Criterion 5 - Student Support and Progression.\nModule summary: Placement and progression indicators remain stable with stronger support interventions.\nWorkflow readiness: 79% complete | Current state: Ready.\nKey metrics: placements: 384 | progressionRate: 72.\nSource evidence feeds: mentoring groups, grievance records, progression tracking, and student representation data.",
            module_C6_heading: "C6 Governance Leadership & IQAC",
            module_C6_body:
                "Module alignment: NAAC Criterion 6 - Governance, Leadership and Management.\nModule summary: Institutional planning and administrative benchmarking were updated for the cycle.\nWorkflow readiness: 82% complete | Current state: Ready.\nKey metrics: auditsClosed: 11 | trainingSessions: 19.\nSource evidence feeds: strategic plans, IQAC meetings, policies, quality initiatives, and compliance reviews.",
            module_C7_heading: "C7 Institutional Values & Best Practices",
            module_C7_body:
                "Module alignment: NAAC Criterion 7 - Institutional Values and Best Practices.\nModule summary: Green campus and inclusion practices documented with cross-department evidence.\nWorkflow readiness: 78% complete | Current state: Ready.\nKey metrics: bestPractices: 4 | outreachInitiatives: 17.\nSource evidence feeds: sustainability records, inclusiveness facilities, ethics documentation, outreach, and best-practice narratives.",
            criterion_C1_heading: "C1 Curricular Aspects",
            criterion_C1_body:
                "Criterion summary: Curriculum review cycles aligned with OBE targets across all schools.\nCompletion status: 84% complete.\nCurrent state: Ready.\nMetrics captured: curriculumRevisions: 12 | newCourses: 6.",
            criterion_C2_heading: "C2 Teaching-Learning and Evaluation",
            criterion_C2_body:
                "Criterion summary: Evaluation reforms and mentoring coverage improved across departments.\nCompletion status: 88% complete.\nCurrent state: Ready.\nMetrics captured: mentorCoverage: 91 | feedbackCycles: 2.",
            criterion_C3_heading: "C3 Research, Innovations, and Extension",
            criterion_C3_body:
                "Criterion summary: Strong publication and funded project pipeline with growing extension activity.\nCompletion status: 81% complete.\nCurrent state: Ready.\nMetrics captured: publications: 212 | projects: 46.",
            criterion_C4_heading: "C4 Infrastructure and Learning Resources",
            criterion_C4_body:
                "Criterion summary: Digital learning resources expanded with new LMS-backed repositories.\nCompletion status: 76% complete.\nCurrent state: Ready.\nMetrics captured: smartClassrooms: 38 | digitalCollections: 14.",
            criterion_C5_heading: "C5 Student Support and Progression",
            criterion_C5_body:
                "Criterion summary: Placement and progression indicators remain stable with stronger support interventions.\nCompletion status: 79% complete.\nCurrent state: Ready.\nMetrics captured: placements: 384 | progressionRate: 72.",
            criterion_C6_heading: "C6 Governance, Leadership, and Management",
            criterion_C6_body:
                "Criterion summary: Institutional planning and administrative benchmarking were updated for the cycle.\nCompletion status: 82% complete.\nCurrent state: Ready.\nMetrics captured: auditsClosed: 11 | trainingSessions: 19.",
            criterion_C7_heading: "C7 Institutional Values and Best Practices",
            criterion_C7_body:
                "Criterion summary: Green campus and inclusion practices documented with cross-department evidence.\nCompletion status: 78% complete.\nCurrent state: Ready.\nMetrics captured: bestPractices: 4 | outreachInitiatives: 17.",
        },
        FACULTY_CAS: {
            facultyName: "Dr. Meera Sharma",
            facultyDesignation: "Associate Professor",
            facultyMeta: commonFacultyMeta,
            promotionFrom: "Assistant Professor (Stage 4)",
            promotionTo: "Associate Professor",
            assessmentPeriodStart: "2022",
            assessmentPeriodEnd: "2025",
            currentStage: "Screening Ready",
            teachingExperienceYears: 11,
            publicationCount: 14,
            bookCount: 3,
            conferenceCount: 12,
            workshopCount: 6,
            projectCount: 4,
            phdSupervisionCount: 2,
            adminResponsibilitySummary: "NAAC documentation lead, department timetable committee, research cell coordinator.",
            researchSummary: "14 publications, 4 funded projects, and ongoing doctoral supervision in analytics and QA.",
            apiScoreClaimed: 286,
        },
        FACULTY_PBAS: {
            facultyName: "Dr. Meera Sharma",
            facultyDesignation: "Associate Professor",
            facultyMeta: commonFacultyMeta,
            academicYear: sampleAcademicYear,
            teachingHours: 276,
            coursesHandled: "Data Structures, AI Fundamentals, Software Engineering",
            mentoringCount: 28,
            labSupervisionCount: 10,
            researchPaperCount: 6,
            journalCount: 6,
            bookCount: 1,
            patentCount: 2,
            conferenceCount: 5,
            committeeWork: "BoS, NAAC Cell, Innovation Committee",
            examDuties: "Paper setting, practical moderation",
            studentGuidance: "Project mentoring, startup mentoring",
            teachingScore: 82,
            researchScore: 94,
            institutionalScore: 61,
            totalApiScore: 237,
            remarks: "Consistent research growth and strong academic service contributions.",
        },
    };

    const template = await renderReportTemplate(reportType, sampleContexts[reportType]);
    return buildTemplatedPdf(template);
}

async function buildFacultySummaryPdfFromCasApplication(recordId: string) {
    const entry = await CasApplication.findById(recordId);

    if (!entry) {
        throw new AuthError("CAS application not found.", 404);
    }

    const faculty = await Faculty.findById(entry.facultyId).select("userId");

    if (!faculty?.userId) {
        throw new AuthError("Faculty account not found for preview.", 404);
    }

    const workspace = await getFacultyWorkspace(faculty.userId.toString());
    const linkedAchievements = entry.linkedAchievements;
    const manualAchievements = entry.manualAchievements;
    const publicationCount =
        (linkedAchievements?.publications?.length ?? 0) +
        (manualAchievements?.publications?.length ?? 0);
    const bookCount =
        (linkedAchievements?.books?.length ?? 0) +
        (manualAchievements?.books?.length ?? 0);
    const projectCount =
        (linkedAchievements?.researchProjects?.length ?? 0) +
        (manualAchievements?.researchProjects?.length ?? 0);
    const conferenceCount =
        (linkedAchievements?.conferences ?? 0) +
        (manualAchievements?.conferences ?? 0);
    const phdSupervisionCount =
        (linkedAchievements?.phdGuided ?? 0) +
        (manualAchievements?.phdGuided ?? 0);

    return buildFacultyReportPdf(workspace, {
        type: "cas",
        data: {
            promotionFrom: entry.currentDesignation,
            promotionTo: entry.applyingForDesignation,
            assessmentPeriodStart: String(entry.eligibilityPeriod?.fromYear ?? ""),
            assessmentPeriodEnd: String(entry.eligibilityPeriod?.toYear ?? ""),
            currentStage: entry.currentDesignation,
            teachingExperienceYears: entry.experienceYears,
            publicationCount,
            bookCount,
            conferenceCount,
            workshopCount: 0,
            projectCount,
            phdSupervisionCount,
            adminResponsibilitySummary: entry.eligibility?.message ?? "",
            researchSummary: `${publicationCount} publications, ${projectCount} projects`,
            apiScoreClaimed: entry.apiScore?.totalScore ?? 0,
        },
    });
}

async function buildFacultySummaryPdfFromPbasApplication(recordId: string) {
    const entry = await FacultyPbasForm.findById(recordId);

    if (!entry) {
        throw new AuthError("PBAS application not found.", 404);
    }

    const faculty = await Faculty.findById(entry.facultyId).select("userId");

    if (!faculty?.userId) {
        throw new AuthError("Faculty account not found for preview.", 404);
    }

    const workspace = await getFacultyWorkspace(faculty.userId.toString());
    const snapshot = await getPbasSnapshotForApplication(entry);

    return buildFacultyReportPdf(workspace, {
        type: "pbas",
        data: {
            academicYear: entry.academicYear,
            teachingHours:
                Number(snapshot.category1.classesTaken ?? 0) +
                Number(snapshot.category1.coursePreparationHours ?? 0),
            coursesHandled: snapshot.category1.coursesTaught ?? [],
            mentoringCount: snapshot.category1.mentoringCount ?? 0,
            labSupervisionCount: snapshot.category1.labSupervisionCount ?? 0,
            researchPaperCount: snapshot.category2.researchPapers?.length ?? 0,
            journalCount: snapshot.category2.researchPapers?.length ?? 0,
            bookCount: snapshot.category2.books?.length ?? 0,
            patentCount: snapshot.category2.patents?.length ?? 0,
            conferenceCount: snapshot.category2.conferences?.length ?? 0,
            committeeWork:
                snapshot.category3.committees?.map((item) => item.committeeName).join(", ") ?? "",
            examDuties:
                snapshot.category3.examDuties?.map((item) => item.duty).join(", ") ?? "",
            studentGuidance:
                snapshot.category3.studentGuidance?.map((item) => item.activity).join(", ") ?? "",
            teachingScore: entry.apiScore?.teachingActivities ?? 0,
            researchScore: entry.apiScore?.researchAcademicContribution ?? 0,
            institutionalScore: entry.apiScore?.institutionalResponsibilities ?? 0,
            totalApiScore: entry.apiScore?.totalScore ?? 0,
            remarks: entry.reviewCommittee?.[entry.reviewCommittee.length - 1]?.remarks ?? "",
        },
    });
}

async function buildLivePreviewPdf(reportType: ReportTemplateType, recordId?: string) {
    if (!recordId) {
        throw new AuthError("A live record is required for this preview.", 400);
    }

    switch (reportType) {
        case "PBAS_APPRAISAL": {
            const record = await FacultyPbasForm.findById(recordId);
            if (!record) {
                throw new AuthError("PBAS application not found.", 404);
            }
            return buildPbasReportPdf(record);
        }
        case "AQAR_FACULTY": {
            const record = await AqarApplication.findById(recordId);
            if (!record) {
                throw new AuthError("AQAR contribution not found.", 404);
            }
            return buildAqarReportPdf(record);
        }
        case "AQAR_CYCLE": {
            const record = await AqarCycle.findById(recordId);
            if (!record) {
                throw new AuthError("AQAR cycle not found.", 404);
            }
            return buildAqarCyclePdf(record);
        }
        case "FACULTY_CAS":
            return buildFacultySummaryPdfFromCasApplication(recordId);
        case "FACULTY_PBAS":
            return buildFacultySummaryPdfFromPbasApplication(recordId);
        default:
            throw new AuthError("Unsupported report template type.", 400);
    }
}

export async function buildReportTemplatePreviewPdf(
    id: string,
    mode: PreviewMode,
    recordId?: string
) {
    const template = await getTemplateById(id);

    if (mode === "sample") {
        return buildSamplePreviewPdf(template.reportType);
    }

    return buildLivePreviewPdf(template.reportType, recordId);
}

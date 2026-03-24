import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import ReportTemplate, {
    type IReportTemplate,
    type IReportTemplateSection,
    type ReportTemplateType,
} from "@/models/core/report-template";
import {
    reportTemplateUpdateSchema,
    type ReportTemplateUpdateInput,
} from "@/lib/report-templates/validators";

type TemplateDefaults = {
    reportType: ReportTemplateType;
    name: string;
    description?: string;
    titleTemplate: string;
    subtitleTemplate?: string;
    metaTemplate?: string;
    introTemplate?: string;
    footerTemplate?: string;
    sections: IReportTemplateSection[];
};

type ReportTemplateContext = Record<string, string | number | undefined | null>;

export type RenderedReportTemplate = {
    name: string;
    reportType: ReportTemplateType;
    version: number;
    title: string;
    subtitle?: string;
    meta?: string;
    intro?: string;
    footer?: string;
    sections: Array<{
        key: string;
        title: string;
        body: string;
    }>;
};

const LEGACY_REPORT_TEMPLATE_DEFAULTS: TemplateDefaults[] = [
    {
        reportType: "PBAS_APPRAISAL",
        name: "PBAS Appraisal Report",
        description: "Template used for faculty PBAS appraisal PDF exports.",
        titleTemplate: "{{facultyName}}",
        subtitleTemplate: "{{facultyDesignation}}",
        metaTemplate: "{{facultyMeta}}",
        introTemplate:
            "Academic Year: {{academicYear}} | Appraisal Period: {{appraisalFromDate}} to {{appraisalToDate}} | Workflow Status: {{workflowStatus}}",
        footerTemplate: "Generated from the PBAS reporting engine for academic review and record keeping.",
        sections: [
            {
                key: "category_1",
                title: "Category I - Teaching Learning and Evaluation",
                body: "Classes taken: {{classesTaken}} | Course preparation hours: {{coursePreparationHours}} | Courses taught: {{coursesTaught}} | Mentoring count: {{mentoringCount}} | Lab supervision: {{labSupervisionCount}} | Feedback summary: {{feedbackSummary}}",
                order: 1,
                isActive: true,
            },
            {
                key: "category_2",
                title: "Category II - Research and Academic Contribution",
                body: "Research papers: {{researchPaperCount}} | Books: {{bookCount}} | Patents: {{patentCount}} | Conferences: {{conferenceCount}} | Projects: {{projectCount}} | Paper highlights: {{paperHighlights}}",
                order: 2,
                isActive: true,
            },
            {
                key: "category_3",
                title: "Category III - Institutional Responsibilities",
                body: "Committees: {{committeeSummary}} | Administrative duties: {{administrativeDutySummary}} | Exam duties: {{examDutySummary}} | Student guidance: {{studentGuidanceSummary}} | Extension activities: {{extensionSummary}}",
                order: 3,
                isActive: true,
            },
            {
                key: "api_score",
                title: "API Score",
                body: "Teaching: {{teachingScore}} | Research: {{researchScore}} | Institutional: {{institutionalScore}} | Total: {{totalScore}}",
                order: 4,
                isActive: true,
            },
        ],
    },
    {
        reportType: "AQAR_FACULTY",
        name: "AQAR Faculty Contribution Report",
        description: "Template used for faculty AQAR contribution PDF exports.",
        titleTemplate: "{{facultyName}}",
        subtitleTemplate: "{{facultyDesignation}}",
        metaTemplate: "{{facultyMeta}}",
        introTemplate:
            "Academic Year: {{academicYear}} | Reporting Period: {{reportingFromDate}} to {{reportingToDate}} | Workflow Status: {{workflowStatus}}",
        footerTemplate: "Generated from faculty AQAR contribution data captured in UMIS.",
        sections: [
            {
                key: "contribution_summary",
                title: "Contribution Summary",
                body: "Research papers: {{researchPaperCount}} | Seed money projects: {{seedMoneyProjectCount}} | Awards: {{awardRecognitionCount}} | Fellowships: {{fellowshipCount}} | Research fellows: {{researchFellowCount}} | Patents: {{patentCount}} | PhD awards: {{phdAwardCount}} | Books/chapters: {{bookChapterCount}} | E-content: {{eContentCount}} | Consultancy: {{consultancyCount}} | Financial support: {{financialSupportCount}} | FDPs: {{fdpCount}} | Total index: {{totalContributionIndex}}",
                order: 1,
                isActive: true,
            },
            {
                key: "research_papers",
                title: "Research Papers",
                body: "{{researchPaperSummary}}",
                order: 2,
                isActive: true,
            },
            {
                key: "projects",
                title: "Seed Money Projects",
                body: "{{seedMoneyProjectSummary}}",
                order: 3,
                isActive: true,
            },
            {
                key: "awards",
                title: "Awards and Fellowships",
                body: "Awards: {{awardsSummary}} | Fellowships: {{fellowshipsSummary}}",
                order: 4,
                isActive: true,
            },
            {
                key: "enrichment",
                title: "Patents, Books, and Academic Enrichment",
                body: "Patents: {{patentsSummary}} | PhD awards: {{phdAwardsSummary}} | Books/chapters: {{booksSummary}} | E-content: {{eContentSummary}} | Consultancy: {{consultancySummary}} | Financial support: {{financialSupportSummary}} | FDPs: {{fdpSummary}}",
                order: 5,
                isActive: true,
            },
        ],
    },
    {
        reportType: "AQAR_CYCLE",
        name: "Institutional AQAR Cycle Report",
        description: "Template used for institutional AQAR cycle PDF exports.",
        titleTemplate: "Annual Quality Assurance Report",
        subtitleTemplate: "Academic Year {{academicYear}}",
        metaTemplate: "Status: {{cycleStatus}}",
        introTemplate: "Reporting period: {{reportingFromDate}} to {{reportingToDate}}",
        footerTemplate: "Generated from institutional AQAR cycle data and NAAC criteria mappings.",
        sections: [
            {
                key: "institution_profile",
                title: "Institution Profile",
                body: "Faculty: {{totalFaculty}} | Students: {{totalStudents}} | Departments: {{totalDepartments}} | Programs: {{totalPrograms}}",
                order: 1,
                isActive: true,
            },
            {
                key: "summary_metrics",
                title: "Summary Metrics",
                body: "PBAS reports: {{approvedPbasReports}} | CAS applications: {{casApplications}} | Faculty AQAR contributions: {{facultyAqarContributions}} | Placements: {{placements}} | Publications: {{publications}} | Projects: {{projects}}",
                order: 2,
                isActive: true,
            },
            {
                key: "criterion_c1",
                title: "{{criterion_C1_heading}}",
                body: "{{criterion_C1_body}}",
                order: 3,
                isActive: true,
            },
            {
                key: "criterion_c2",
                title: "{{criterion_C2_heading}}",
                body: "{{criterion_C2_body}}",
                order: 4,
                isActive: true,
            },
            {
                key: "criterion_c3",
                title: "{{criterion_C3_heading}}",
                body: "{{criterion_C3_body}}",
                order: 5,
                isActive: true,
            },
            {
                key: "criterion_c4",
                title: "{{criterion_C4_heading}}",
                body: "{{criterion_C4_body}}",
                order: 6,
                isActive: true,
            },
            {
                key: "criterion_c5",
                title: "{{criterion_C5_heading}}",
                body: "{{criterion_C5_body}}",
                order: 7,
                isActive: true,
            },
            {
                key: "criterion_c6",
                title: "{{criterion_C6_heading}}",
                body: "{{criterion_C6_body}}",
                order: 8,
                isActive: true,
            },
            {
                key: "criterion_c7",
                title: "{{criterion_C7_heading}}",
                body: "{{criterion_C7_body}}",
                order: 9,
                isActive: true,
            },
        ],
    },
    {
        reportType: "FACULTY_CAS",
        name: "Faculty CAS Summary Report",
        description: "Template used for faculty CAS summary PDF exports.",
        titleTemplate: "{{facultyName}}",
        subtitleTemplate: "{{facultyDesignation}}",
        metaTemplate: "{{facultyMeta}}",
        introTemplate:
            "Promotion Path: {{promotionFrom}} to {{promotionTo}} | Assessment Period: {{assessmentPeriodStart}} to {{assessmentPeriodEnd}} | Current Stage: {{currentStage}}",
        footerTemplate: "Generated from CAS application data and linked faculty achievements.",
        sections: [
            {
                key: "academic_achievements",
                title: "Academic Achievements",
                body: "Research papers: {{publicationCount}} | Books/chapters: {{bookCount}} | Conference participation: {{conferenceCount}} | Workshops attended: {{workshopCount}} | Research projects: {{projectCount}} | PhD supervision: {{phdSupervisionCount}} | Teaching experience: {{teachingExperienceYears}} years",
                order: 1,
                isActive: true,
            },
            {
                key: "administrative_responsibilities",
                title: "Administrative Responsibilities",
                body: "{{adminResponsibilitySummary}}",
                order: 2,
                isActive: true,
            },
            {
                key: "research_summary",
                title: "Research Summary",
                body: "{{researchSummary}}",
                order: 3,
                isActive: true,
            },
            {
                key: "api_score",
                title: "API Score",
                body: "Claimed API score: {{apiScoreClaimed}}",
                order: 4,
                isActive: true,
            },
        ],
    },
    {
        reportType: "FACULTY_PBAS",
        name: "Faculty PBAS Summary Report",
        description: "Template used for faculty PBAS summary PDF exports.",
        titleTemplate: "{{facultyName}}",
        subtitleTemplate: "{{facultyDesignation}}",
        metaTemplate: "{{facultyMeta}}",
        introTemplate: "Academic Year: {{academicYear}}",
        footerTemplate: "Generated from faculty PBAS report data for review and archival use.",
        sections: [
            {
                key: "teaching",
                title: "Teaching Activities",
                body: "Teaching hours: {{teachingHours}} | Courses handled: {{coursesHandled}} | Mentoring count: {{mentoringCount}} | Lab supervision: {{labSupervisionCount}}",
                order: 1,
                isActive: true,
            },
            {
                key: "research",
                title: "Research and Academic Contribution",
                body: "Research papers: {{researchPaperCount}} | Journals: {{journalCount}} | Books: {{bookCount}} | Patents: {{patentCount}} | Conferences: {{conferenceCount}}",
                order: 2,
                isActive: true,
            },
            {
                key: "institutional",
                title: "Institutional Responsibilities",
                body: "Committee work: {{committeeWork}} | Exam duties: {{examDuties}} | Student guidance: {{studentGuidance}}",
                order: 3,
                isActive: true,
            },
            {
                key: "api_score",
                title: "API Score",
                body: "Teaching: {{teachingScore}} | Research: {{researchScore}} | Institutional: {{institutionalScore}} | Total: {{totalApiScore}} | Remarks: {{remarks}}",
                order: 4,
                isActive: true,
            },
        ],
    },
];

const PRODUCTION_REPORT_TEMPLATE_DEFAULTS: TemplateDefaults[] = [
    {
        reportType: "PBAS_APPRAISAL",
        name: "PBAS Appraisal Report",
        description: "Production-ready template used for faculty PBAS appraisal PDF exports.",
        titleTemplate: "{{facultyName}}",
        subtitleTemplate: "PBAS Annual Appraisal Report | {{facultyDesignation}}",
        metaTemplate: "{{facultyMeta}}",
        introTemplate:
            "Academic Year: {{academicYear}} | Appraisal Window: {{appraisalFromDate}} to {{appraisalToDate}} | Workflow Status: {{workflowStatus}} | Document Purpose: This report consolidates teaching, research, service, and API score details for formal academic review, approval, and institutional record keeping.",
        footerTemplate:
            "This production report should be reviewed alongside the submitted workload records, evidence attachments, score sheets, and committee observations before final approval or archival.",
        sections: [
            {
                key: "document_context",
                title: "Document Context and Review Scope",
                body: "This appraisal file summarizes the academic contribution of {{facultyName}} for the stated reporting period and is intended for departmental scrutiny, committee review, and institutional archiving.\nFaculty under review: {{facultyName}}.\nCurrent designation: {{facultyDesignation}}.\nReporting metadata: {{facultyMeta}}.\nReview window covered: {{appraisalFromDate}} to {{appraisalToDate}}.\nCurrent workflow position: {{workflowStatus}}.\n\nReview expectation: confirm that all claimed activities in the following sections are supported by authenticated records and approved evidence.",
                order: 1,
                isActive: true,
            },
            {
                key: "category_1",
                title: "Teaching, Learning, and Evaluation Performance",
                body: "This section captures the faculty member's instructional workload, learner support, and evaluation-linked responsibilities during the appraisal cycle.\nClasses delivered: {{classesTaken}}.\nCourse preparation hours recorded: {{coursePreparationHours}}.\nCourses or papers handled: {{coursesTaught}}.\nStudent mentoring assignments completed: {{mentoringCount}}.\nLaboratory or practical supervision assignments: {{labSupervisionCount}}.\nFeedback and quality indicators: {{feedbackSummary}}.\n\nEvidence recommended: approved timetable, workload statement, mentoring logs, attendance support, and student feedback summaries.",
                order: 2,
                isActive: true,
            },
            {
                key: "category_2",
                title: "Research, Publications, and Academic Contribution",
                body: "This section records the scholarly output and research engagement claimed for the assessment period.\nResearch papers published or accepted: {{researchPaperCount}}.\nBooks or authored volumes: {{bookCount}}.\nPatents filed, published, or granted: {{patentCount}}.\nConference presentations or participations: {{conferenceCount}}.\nResearch or sponsored projects handled: {{projectCount}}.\nHighlighted scholarly outputs: {{paperHighlights}}.\n\nReview expectation: validate indexing, publication quality, authorship position, project sanction details, and supporting approvals wherever applicable.",
                order: 3,
                isActive: true,
            },
            {
                key: "category_3",
                title: "Institutional Responsibilities, Student Support, and Extension",
                body: "This section summarizes the institutional service portfolio and broader academic citizenship demonstrated during the reporting period.\nCommittee participation and governance roles: {{committeeSummary}}.\nAdministrative duties performed: {{administrativeDutySummary}}.\nExamination and assessment duties: {{examDutySummary}}.\nStudent guidance and development support: {{studentGuidanceSummary}}.\nExtension or outreach engagement: {{extensionSummary}}.\n\nReview expectation: verify office orders, committee minutes, exam duty allocation, mentoring records, and outreach documentation before acceptance.",
                order: 4,
                isActive: true,
            },
            {
                key: "api_score",
                title: "API Score Summary and Review Readiness",
                body: "This section presents the score breakup generated for the appraisal and should be read together with the evidence-backed claims above.\nTeaching and evaluation score: {{teachingScore}}.\nResearch and academic contribution score: {{researchScore}}.\nInstitutional responsibility score: {{institutionalScore}}.\nTotal API score claimed: {{totalScore}}.\n\nDecision note: any moderation, deduction, or normalization applied during scrutiny should be documented in the review remarks before the report is approved.",
                order: 5,
                isActive: true,
            },
        ],
    },
    {
        reportType: "AQAR_FACULTY",
        name: "AQAR Faculty Contribution Report",
        description: "Production-ready template used for faculty AQAR contribution PDF exports.",
        titleTemplate: "{{facultyName}}",
        subtitleTemplate: "AQAR Faculty Contribution Dossier | {{facultyDesignation}}",
        metaTemplate: "{{facultyMeta}}",
        introTemplate:
            "Academic Year: {{academicYear}} | Reporting Period: {{reportingFromDate}} to {{reportingToDate}} | Workflow Status: {{workflowStatus}} | Document Purpose: This dossier captures faculty-level quality assurance contributions for AQAR consolidation, review, and NAAC-aligned reporting.",
        footerTemplate:
            "Before institutional consolidation, confirm that each contribution has traceable documentary evidence, correct AQAR classification, and alignment with the reporting window.",
        sections: [
            {
                key: "contribution_overview",
                title: "Contribution Overview and Reporting Context",
                body: "This document summarizes the AQAR-relevant contribution portfolio submitted for {{facultyName}} during the current reporting cycle.\nFaculty under report: {{facultyName}}.\nDesignation at time of reporting: {{facultyDesignation}}.\nReporting metadata: {{facultyMeta}}.\nResearch papers counted: {{researchPaperCount}}.\nProjects counted: {{seedMoneyProjectCount}}.\nRecognitions counted: {{awardRecognitionCount}}.\nPatents counted: {{patentCount}}.\nAcademic enrichment items counted: {{fdpCount}}.\nOverall contribution index: {{totalContributionIndex}}.\n\nReview expectation: ensure that all activity counts reconcile with the detailed itemized sections below.",
                order: 1,
                isActive: true,
            },
            {
                key: "research_papers",
                title: "Research Publications and Scholarly Visibility",
                body: "This section details the publication record considered for AQAR reporting.\nTotal research papers: {{researchPaperCount}}.\nPublication summary: {{researchPaperSummary}}.\n\nReview expectation: verify publication year, journal or proceedings details, indexing status, and faculty authorship before inclusion in the final AQAR.",
                order: 2,
                isActive: true,
            },
            {
                key: "projects_and_innovation",
                title: "Projects, Patents, and Innovation Activity",
                body: "This section captures funded work, innovation outputs, and research translation activity.\nSeed money or internal projects: {{seedMoneyProjectCount}}.\nProject summary: {{seedMoneyProjectSummary}}.\nPatents or intellectual property items: {{patentCount}}.\nPatent summary: {{patentsSummary}}.\nResearch fellows associated with reported work: {{researchFellowCount}}.\n\nReview expectation: validate sanction letters, patent status, project duration, funding source, and institutional approvals.",
                order: 3,
                isActive: true,
            },
            {
                key: "recognition_and_guidance",
                title: "Recognition, Fellowships, and Research Guidance",
                body: "This section records professional recognition and doctoral guidance outputs relevant to quality assurance reporting.\nAwards and recognitions recorded: {{awardRecognitionCount}}.\nAwards summary: {{awardsSummary}}.\nFellowships recorded: {{fellowshipCount}}.\nFellowships summary: {{fellowshipsSummary}}.\nPhD awards or completions reported: {{phdAwardCount}}.\nPhD awards summary: {{phdAwardsSummary}}.\n\nReview expectation: confirm award category, awarding body, fellowship status, and research supervision details from primary records.",
                order: 4,
                isActive: true,
            },
            {
                key: "academic_enrichment",
                title: "Books, E-Content, Consultancy, Support, and FDP Activity",
                body: "This section consolidates enrichment-oriented academic contributions used for AQAR evidence mapping.\nBooks or chapters reported: {{bookChapterCount}}.\nBooks and chapters summary: {{booksSummary}}.\nE-content items reported: {{eContentCount}}.\nE-content summary: {{eContentSummary}}.\nConsultancy items reported: {{consultancyCount}}.\nConsultancy summary: {{consultancySummary}}.\nFinancial support items reported: {{financialSupportCount}}.\nFinancial support summary: {{financialSupportSummary}}.\nFaculty development programmes reported: {{fdpCount}}.\nFDP summary: {{fdpSummary}}.\n\nReview expectation: confirm documentary proof, dates, beneficiary institution or audience, and reporting-period eligibility for each item.",
                order: 5,
                isActive: true,
            },
        ],
    },
    {
        reportType: "AQAR_CYCLE",
        name: "Institutional AQAR Cycle Report",
        description: "Production-ready template used for institutional AQAR cycle PDF exports.",
        titleTemplate: "Annual Quality Assurance Report",
        subtitleTemplate: "Institutional Cycle Dossier | Academic Year {{academicYear}}",
        metaTemplate: "Cycle Status: {{cycleStatus}}",
        introTemplate:
            "Reporting Period: {{reportingFromDate}} to {{reportingToDate}} | Document Purpose: This institutional dossier consolidates AQAR evidence, operational metrics, and criterion-wise narratives for quality assurance review, leadership reporting, and accreditation preparation.",
        footerTemplate:
            "Institutional AQAR reports should be released only after criterion owners confirm narrative accuracy, metric reconciliation, and documentary completeness for every referenced claim.",
        sections: [
            {
                key: "institution_profile",
                title: "Institution Profile and Baseline Snapshot",
                body: "This section establishes the institutional baseline for the reporting cycle.\nTotal faculty strength: {{totalFaculty}}.\nTotal student strength: {{totalStudents}}.\nAcademic departments covered: {{totalDepartments}}.\nProgrammes offered during the cycle: {{totalPrograms}}.\n\nReview expectation: confirm that all baseline counts match the approved institutional data submitted for the same academic year.",
                order: 1,
                isActive: true,
            },
            {
                key: "summary_metrics",
                title: "Operational Summary Metrics",
                body: "This section provides a consolidated view of major academic quality indicators captured for the cycle.\nApproved PBAS reports: {{approvedPbasReports}}.\nCAS applications processed: {{casApplications}}.\nFaculty AQAR contribution files received: {{facultyAqarContributions}}.\nPlacement records captured: {{placements}}.\nPublications counted for the cycle: {{publications}}.\nProjects counted for the cycle: {{projects}}.\n\nReview expectation: use this section as a cross-check against institutional dashboards and annual consolidated statements.",
                order: 2,
                isActive: true,
            },
            {
                key: "criterion_c1",
                title: "{{criterion_C1_heading}}",
                body: "{{criterion_C1_body}}\nReview focus: verify criterion ownership, evidence traceability, completion status, and closure of any flagged gaps before final AQAR submission.",
                order: 3,
                isActive: true,
            },
            {
                key: "criterion_c2",
                title: "{{criterion_C2_heading}}",
                body: "{{criterion_C2_body}}\nReview focus: verify criterion ownership, evidence traceability, completion status, and closure of any flagged gaps before final AQAR submission.",
                order: 4,
                isActive: true,
            },
            {
                key: "criterion_c3",
                title: "{{criterion_C3_heading}}",
                body: "{{criterion_C3_body}}\nReview focus: verify criterion ownership, evidence traceability, completion status, and closure of any flagged gaps before final AQAR submission.",
                order: 5,
                isActive: true,
            },
            {
                key: "criterion_c4",
                title: "{{criterion_C4_heading}}",
                body: "{{criterion_C4_body}}\nReview focus: verify criterion ownership, evidence traceability, completion status, and closure of any flagged gaps before final AQAR submission.",
                order: 6,
                isActive: true,
            },
            {
                key: "criterion_c5",
                title: "{{criterion_C5_heading}}",
                body: "{{criterion_C5_body}}\nReview focus: verify criterion ownership, evidence traceability, completion status, and closure of any flagged gaps before final AQAR submission.",
                order: 7,
                isActive: true,
            },
            {
                key: "criterion_c6",
                title: "{{criterion_C6_heading}}",
                body: "{{criterion_C6_body}}\nReview focus: verify criterion ownership, evidence traceability, completion status, and closure of any flagged gaps before final AQAR submission.",
                order: 8,
                isActive: true,
            },
            {
                key: "criterion_c7",
                title: "{{criterion_C7_heading}}",
                body: "{{criterion_C7_body}}\nReview focus: verify criterion ownership, evidence traceability, completion status, and closure of any flagged gaps before final AQAR submission.",
                order: 9,
                isActive: true,
            },
            {
                key: "quality_assurance_note",
                title: "Quality Assurance and Publication Readiness Note",
                body: "This report is considered publication-ready only when all criterion narratives have been reviewed by owners, quantitative metrics have been reconciled, and supporting evidence is available for inspection or submission.",
                order: 10,
                isActive: true,
            },
        ],
    },
    {
        reportType: "FACULTY_CAS",
        name: "Faculty CAS Summary Report",
        description: "Production-ready template used for faculty CAS summary PDF exports.",
        titleTemplate: "{{facultyName}}",
        subtitleTemplate: "Career Advancement Scheme Dossier | {{facultyDesignation}}",
        metaTemplate: "{{facultyMeta}}",
        introTemplate:
            "Promotion Path: {{promotionFrom}} to {{promotionTo}} | Assessment Period: {{assessmentPeriodStart}} to {{assessmentPeriodEnd}} | Current Stage: {{currentStage}} | Document Purpose: This dossier summarizes promotion eligibility, achievements, and claim-ready academic evidence for CAS review.",
        footerTemplate:
            "All CAS claims should be validated against the governing promotion rules, authenticated evidence, and committee observations before the dossier is used for recommendation or final approval.",
        sections: [
            {
                key: "promotion_context",
                title: "Promotion Context and Eligibility Scope",
                body: "This section identifies the promotion movement and review scope for the current CAS case.\nFaculty under consideration: {{facultyName}}.\nCurrent designation: {{facultyDesignation}}.\nPromotion movement requested: {{promotionFrom}} to {{promotionTo}}.\nAssessment period covered: {{assessmentPeriodStart}} to {{assessmentPeriodEnd}}.\nCurrent case stage: {{currentStage}}.\nTeaching experience available for consideration: {{teachingExperienceYears}} years.\n\nReview expectation: confirm eligibility window, service length, and applicable promotion rules before moving to achievement scrutiny.",
                order: 1,
                isActive: true,
            },
            {
                key: "academic_achievements",
                title: "Academic Achievements and Performance Summary",
                body: "This section consolidates the faculty member's core academic output relevant to CAS assessment.\nPublications reported: {{publicationCount}}.\nBooks or chapters reported: {{bookCount}}.\nConference participation items: {{conferenceCount}}.\nWorkshops or FDP-style participation items: {{workshopCount}}.\nResearch projects reported: {{projectCount}}.\nPhD supervision outcomes reported: {{phdSupervisionCount}}.\n\nReview expectation: validate dates, authorship, event participation, project sanction details, and supervision status from supporting documents.",
                order: 2,
                isActive: true,
            },
            {
                key: "research_summary",
                title: "Research and Scholarly Profile Narrative",
                body: "This section provides the consolidated narrative used to understand the breadth and maturity of the candidate's research profile.\nResearch profile summary: {{researchSummary}}.\n\nReview expectation: align this narrative with the counts reported above and ensure that any claimed distinction or impact is evidence-backed.",
                order: 3,
                isActive: true,
            },
            {
                key: "administrative_responsibilities",
                title: "Leadership, Administration, and Institutional Service",
                body: "This section captures administrative and institutional responsibilities relevant to promotion review.\nAdministrative and institutional responsibility summary: {{adminResponsibilitySummary}}.\n\nReview expectation: confirm office orders, committee assignments, coordination roles, and duration of service before acceptance.",
                order: 4,
                isActive: true,
            },
            {
                key: "api_score",
                title: "Claimed API Score and Case Readiness",
                body: "This section records the claimed API position associated with the current CAS file.\nClaimed API score: {{apiScoreClaimed}}.\n\nDecision note: any moderation, deficiencies, or additional document requests raised during scrutiny should be recorded alongside this score before the case advances.",
                order: 5,
                isActive: true,
            },
        ],
    },
    {
        reportType: "FACULTY_PBAS",
        name: "Faculty PBAS Summary Report",
        description: "Production-ready template used for faculty PBAS summary PDF exports.",
        titleTemplate: "{{facultyName}}",
        subtitleTemplate: "Faculty PBAS Summary Dossier | {{facultyDesignation}}",
        metaTemplate: "{{facultyMeta}}",
        introTemplate:
            "Academic Year: {{academicYear}} | Document Purpose: This summary dossier provides a concise but review-ready snapshot of the faculty member's PBAS workload, scholarly output, service contribution, and API score position.",
        footerTemplate:
            "This summary report should be used with the detailed PBAS application, supporting evidence, and moderation remarks wherever formal review or audit is required.",
        sections: [
            {
                key: "reporting_context",
                title: "Reporting Context and Faculty Profile",
                body: "This section establishes the context for the PBAS summary being reviewed.\nFaculty under report: {{facultyName}}.\nDesignation during the academic year: {{facultyDesignation}}.\nReporting metadata: {{facultyMeta}}.\nAcademic year covered: {{academicYear}}.\n\nReview expectation: confirm the faculty profile and reporting year before relying on the performance figures below.",
                order: 1,
                isActive: true,
            },
            {
                key: "teaching",
                title: "Teaching Activities and Student Engagement",
                body: "This section summarizes teaching delivery and direct student support during the reporting year.\nTeaching hours captured: {{teachingHours}}.\nCourses handled: {{coursesHandled}}.\nStudents mentored: {{mentoringCount}}.\nLaboratory or practical supervision count: {{labSupervisionCount}}.\n\nReview expectation: verify workload records, mentoring evidence, and department allocations before finalizing this section.",
                order: 2,
                isActive: true,
            },
            {
                key: "research",
                title: "Research Outputs and Academic Contribution",
                body: "This section records the faculty member's research profile for the year.\nResearch papers counted: {{researchPaperCount}}.\nJournal-linked outputs counted: {{journalCount}}.\nBooks or chapters counted: {{bookCount}}.\nPatents counted: {{patentCount}}.\nConference participation counted: {{conferenceCount}}.\n\nReview expectation: confirm publication quality, year, authorship, and event relevance through the corresponding evidence set.",
                order: 3,
                isActive: true,
            },
            {
                key: "institutional",
                title: "Institutional Responsibilities and Service Contribution",
                body: "This section highlights governance and service responsibilities discharged alongside teaching and research.\nCommittee work summary: {{committeeWork}}.\nExamination duty summary: {{examDuties}}.\nStudent guidance summary: {{studentGuidance}}.\n\nReview expectation: ensure that roles and assignments are backed by official allocation or participation records.",
                order: 4,
                isActive: true,
            },
            {
                key: "api_score",
                title: "API Score Position and Reviewer Remarks",
                body: "This section presents the score summary attached to the PBAS year under review.\nTeaching score: {{teachingScore}}.\nResearch score: {{researchScore}}.\nInstitutional responsibility score: {{institutionalScore}}.\nTotal API score: {{totalApiScore}}.\nReviewer or committee remarks: {{remarks}}.\n\nDecision note: where moderation has occurred, the final approved score should be entered in the review workflow and retained with this dossier.",
                order: 5,
                isActive: true,
            },
        ],
    },
];

function normalizeOptional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function sanitizeSections(sections: ReportTemplateUpdateInput["sections"]) {
    return sections
        .map((section, index) => ({
            key: section.key.trim(),
            title: section.title.trim(),
            body: section.body.trim(),
            order: Number(section.order ?? index + 1),
            isActive: section.isActive !== false,
        }))
        .sort((left, right) => left.order - right.order || left.key.localeCompare(right.key));
}

function normalizeTemplateDefinition(template: {
    name: string;
    description?: string;
    titleTemplate: string;
    subtitleTemplate?: string;
    metaTemplate?: string;
    introTemplate?: string;
    footerTemplate?: string;
    sections: Array<{
        key: string;
        title: string;
        body: string;
        order: number;
        isActive: boolean;
    }>;
}) {
    return {
        name: template.name.trim(),
        description: normalizeOptional(template.description) ?? "",
        titleTemplate: template.titleTemplate.trim(),
        subtitleTemplate: normalizeOptional(template.subtitleTemplate) ?? "",
        metaTemplate: normalizeOptional(template.metaTemplate) ?? "",
        introTemplate: normalizeOptional(template.introTemplate) ?? "",
        footerTemplate: normalizeOptional(template.footerTemplate) ?? "",
        sections: sanitizeSections(template.sections).map((section) => ({
            key: section.key,
            title: section.title,
            body: section.body,
            order: section.order,
            isActive: section.isActive,
        })),
    };
}

function templatesAreEquivalent(
    current: Pick<
        IReportTemplate,
        | "name"
        | "description"
        | "titleTemplate"
        | "subtitleTemplate"
        | "metaTemplate"
        | "introTemplate"
        | "footerTemplate"
        | "sections"
    >,
    expected: TemplateDefaults
) {
    return (
        JSON.stringify(normalizeTemplateDefinition(current)) ===
        JSON.stringify(normalizeTemplateDefinition(expected))
    );
}

function materializeTemplateDefaults(template: TemplateDefaults, version: number) {
    return {
        reportType: template.reportType,
        name: template.name.trim(),
        description: normalizeOptional(template.description),
        version,
        isActive: true,
        titleTemplate: template.titleTemplate.trim(),
        subtitleTemplate: normalizeOptional(template.subtitleTemplate),
        metaTemplate: normalizeOptional(template.metaTemplate),
        introTemplate: normalizeOptional(template.introTemplate),
        footerTemplate: normalizeOptional(template.footerTemplate),
        sections: sanitizeSections(template.sections),
    };
}

function interpolateTemplate(text: string | undefined, context: ReportTemplateContext) {
    if (!text) {
        return undefined;
    }

    const rendered = text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key: string) => {
        const value = context[key];
        return value === undefined || value === null ? "" : String(value);
    });

    return normalizeOptional(rendered);
}

export async function ensureDefaultReportTemplates() {
    await dbConnect();

    for (const template of PRODUCTION_REPORT_TEMPLATE_DEFAULTS) {
        const latest = await ReportTemplate.findOne({ reportType: template.reportType }).sort({ version: -1 });
        const active = latest?.isActive
            ? latest
            : await ReportTemplate.findOne({ reportType: template.reportType, isActive: true }).sort({
                  version: -1,
              });

        if (!active) {
            await ReportTemplate.create(materializeTemplateDefaults(template, Number(latest?.version ?? 0) + 1));
            continue;
        }

        const legacyTemplate = LEGACY_REPORT_TEMPLATE_DEFAULTS.find(
            (entry) => entry.reportType === template.reportType
        );
        const shouldUpgradeFromLegacy =
            legacyTemplate &&
            templatesAreEquivalent(active, legacyTemplate) &&
            !templatesAreEquivalent(active, template);

        if (!shouldUpgradeFromLegacy) {
            continue;
        }

        await ReportTemplate.updateMany(
            { reportType: template.reportType, isActive: true },
            { $set: { isActive: false } }
        );

        await ReportTemplate.create(
            materializeTemplateDefaults(template, Number(active.version || latest?.version || 1) + 1)
        );
    }
}

export async function listReportTemplates() {
    await ensureDefaultReportTemplates();

    return ReportTemplate.find({ isActive: true }).sort({ reportType: 1, version: -1 });
}

export async function getActiveReportTemplate(reportType: ReportTemplateType) {
    await ensureDefaultReportTemplates();

    const template = await ReportTemplate.findOne({ reportType, isActive: true }).sort({ version: -1 });

    if (!template) {
        throw new AuthError("Report template not found.", 404);
    }

    return template;
}

export async function renderReportTemplate(
    reportType: ReportTemplateType,
    context: ReportTemplateContext
): Promise<RenderedReportTemplate> {
    const template = await getActiveReportTemplate(reportType);

    return {
        name: template.name,
        reportType: template.reportType,
        version: template.version,
        title: interpolateTemplate(template.titleTemplate, context) ?? template.name,
        subtitle: interpolateTemplate(template.subtitleTemplate, context),
        meta: interpolateTemplate(template.metaTemplate, context),
        intro: interpolateTemplate(template.introTemplate, context),
        footer: interpolateTemplate(template.footerTemplate, context),
        sections: template.sections
            .filter((section) => section.isActive)
            .sort((left, right) => left.order - right.order || left.key.localeCompare(right.key))
            .map((section) => ({
                key: section.key,
                title: interpolateTemplate(section.title, context) ?? section.title,
                body: interpolateTemplate(section.body, context) ?? "",
            }))
            .filter((section) => section.title || section.body),
    };
}

export async function updateReportTemplate(
    id: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = reportTemplateUpdateSchema.parse(rawInput);

    await ensureDefaultReportTemplates();

    const current = await ReportTemplate.findById(id);

    if (!current) {
        throw new AuthError("Report template not found.", 404);
    }

    const oldState = current.toObject();

    await ReportTemplate.updateMany(
        { reportType: current.reportType, isActive: true },
        { $set: { isActive: false } }
    );

    const nextTemplate = await ReportTemplate.create({
        reportType: current.reportType,
        name: input.name.trim(),
        description: normalizeOptional(input.description),
        version: Number(current.version || 1) + 1,
        isActive: true,
        titleTemplate: input.titleTemplate.trim(),
        subtitleTemplate: normalizeOptional(input.subtitleTemplate),
        metaTemplate: normalizeOptional(input.metaTemplate),
        introTemplate: normalizeOptional(input.introTemplate),
        footerTemplate: normalizeOptional(input.footerTemplate),
        sections: sanitizeSections(input.sections),
    });

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "REPORT_TEMPLATE_UPDATE",
            tableName: "report_templates",
            recordId: nextTemplate._id.toString(),
            oldData: oldState,
            newData: nextTemplate.toObject(),
            auditContext: options.auditContext,
        });
    }

    return nextTemplate;
}

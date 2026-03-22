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

const REPORT_TEMPLATE_DEFAULTS: TemplateDefaults[] = [
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

    await Promise.all(
        REPORT_TEMPLATE_DEFAULTS.map(async (template) => {
            const existing = await ReportTemplate.findOne({ reportType: template.reportType }).select("_id");
            if (existing) {
                return;
            }

            await ReportTemplate.create({
                ...template,
                version: 1,
                isActive: true,
            });
        })
    );
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

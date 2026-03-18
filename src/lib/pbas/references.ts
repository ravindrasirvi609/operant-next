import { Types } from "mongoose";

import AcademicYear from "@/models/reference/academic-year";
import Event from "@/models/reference/event";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultyBook from "@/models/faculty/faculty-book";
import FacultyEventParticipation from "@/models/faculty/faculty-event-participation";
import FacultyInstitutionalContribution from "@/models/faculty/faculty-institutional-contribution";
import FacultyPatent from "@/models/faculty/faculty-patent";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultySocialExtension from "@/models/faculty/faculty-social-extension";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";
import FacultyResultSummary from "@/models/faculty/faculty-result-summary";
import FacultyTeachingSummary from "@/models/faculty/faculty-teaching-summary";
import type { IPbasDraftReferences } from "@/models/core/pbas-reference-schema";
import { pbasDraftReferencesSchema, pbasSnapshotSchema, type PbasDraftReferencesInput, type PbasSnapshot } from "@/lib/pbas/validators";

type CandidateItem = {
    _id: Types.ObjectId;
};

type EventParticipationCandidate = CandidateItem & {
    role?: string;
    paperPresented?: boolean;
    paperTitle?: string;
    organized?: boolean;
    eventId?: {
        _id?: Types.ObjectId;
        title?: string;
        organizedBy?: string;
        startDate?: Date;
        endDate?: Date;
        level?: string;
        eventType?: string;
    };
};

type TeachingSummaryCandidate = CandidateItem & {
    classesTaken?: number;
    coursePreparationHours?: number;
    coursesTaught?: string[];
    mentoringCount?: number;
    labSupervisionCount?: number;
    feedbackSummary?: string;
};

type TeachingLoadCandidate = CandidateItem & {
    courseName?: string;
    semester?: string | number;
    subjectCode?: string;
    totalHours?: number;
    lectureHours?: number;
    practicalHours?: number;
};

type ResultSummaryCandidate = CandidateItem & {
    subjectName?: string;
    studentsAppeared?: number;
    studentsPassed?: number;
    passPercentage?: number;
};

type PublicationCandidate = CandidateItem & {
    title?: string;
    journalName?: string;
    publisher?: string;
    publicationDate?: Date;
    isbnIssn?: string;
    indexedIn?: string;
    publicationType?: string;
};

type BookCandidate = CandidateItem & {
    title?: string;
    publisher?: string;
    publicationDate?: Date;
    bookType?: string;
    isbn?: string;
};

type PatentCandidate = CandidateItem & {
    title?: string;
    status?: string;
    filingDate?: Date;
    grantDate?: Date;
    patentNumber?: string;
};

type ProjectCandidate = CandidateItem & {
    title?: string;
    fundingAgency?: string;
    amountSanctioned?: number;
    startDate?: Date;
    projectType?: string;
};

type AdminRoleCandidate = CandidateItem & {
    committeeName?: string;
    roleName?: string;
    responsibilityDescription?: string;
};

type InstitutionalContributionCandidate = CandidateItem & {
    activityTitle?: string;
    role?: string;
    scoreWeightage?: number;
};

type SocialExtensionCandidate = CandidateItem & {
    activityName?: string;
    hoursContributed?: number;
    programId?: Types.ObjectId | {
        name?: string;
    } | null;
};

function getProgramName(programId: SocialExtensionCandidate["programId"]) {
    if (!programId || programId instanceof Types.ObjectId) {
        return undefined;
    }

    return programId.name;
}

export type PbasCandidateOption = {
    id: string;
    label: string;
    sublabel?: string;
    note?: string;
};

export type PbasCandidatePools = {
    category1: {
        teachingSummary?: PbasCandidateOption;
        teachingLoads: PbasCandidateOption[];
        resultSummaries: PbasCandidateOption[];
    };
    category2: {
        researchPapers: PbasCandidateOption[];
        books: PbasCandidateOption[];
        patents: PbasCandidateOption[];
        conferences: PbasCandidateOption[];
        projects: PbasCandidateOption[];
    };
    category3: {
        committees: PbasCandidateOption[];
        administrativeDuties: PbasCandidateOption[];
        examDuties: PbasCandidateOption[];
        studentGuidance: PbasCandidateOption[];
        extensionActivities: PbasCandidateOption[];
    };
};

export type PbasReferenceContext = {
    academicYearId: Types.ObjectId;
    academicYear: {
        yearStart: number;
        yearEnd: number;
    };
    teachingSummary: TeachingSummaryCandidate | null;
    teachingLoads: TeachingLoadCandidate[];
    resultSummaries: ResultSummaryCandidate[];
    publications: PublicationCandidate[];
    books: BookCandidate[];
    patents: PatentCandidate[];
    projects: ProjectCandidate[];
    eventParticipations: EventParticipationCandidate[];
    adminRoles: AdminRoleCandidate[];
    institutionalContributions: InstitutionalContributionCandidate[];
    socialExtensions: SocialExtensionCandidate[];
};

function formatDate(date?: Date | null) {
    if (!date) {
        return "Date not set";
    }

    return date.toISOString().slice(0, 10);
}

function toObjectId(value: string | Types.ObjectId | undefined | null) {
    if (!value) {
        return undefined;
    }

    return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
}

function uniqueObjectIds(values: Array<string | Types.ObjectId | undefined | null>) {
    const seen = new Set<string>();
    const ids: Types.ObjectId[] = [];

    for (const value of values) {
        const objectId = toObjectId(value);
        if (!objectId) continue;
        const key = objectId.toString();
        if (seen.has(key)) continue;
        seen.add(key);
        ids.push(objectId);
    }

    return ids;
}

function toAcademicWindow(yearStart: number, yearEnd: number) {
    return {
        start: new Date(Date.UTC(yearStart, 5, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(yearEnd, 4, 31, 23, 59, 59, 999)),
    };
}

function stringifyIds(values: Types.ObjectId[]) {
    return values.map((item) => item.toString());
}

function isExamRole(role: { responsibilityDescription?: string; roleName?: string }) {
    return (
        role.responsibilityDescription === "PBAS Exam Duty" ||
        (role.roleName ?? "").trim().toLowerCase() === "exam duty"
    );
}

function buildDraftReferencesInternal(input?: Partial<IPbasDraftReferences> | null): IPbasDraftReferences {
    return {
        teachingSummaryId: input?.teachingSummaryId,
        teachingLoadIds: uniqueObjectIds(input?.teachingLoadIds ?? []),
        publicationIds: uniqueObjectIds(input?.publicationIds ?? []),
        bookIds: uniqueObjectIds(input?.bookIds ?? []),
        patentIds: uniqueObjectIds(input?.patentIds ?? []),
        researchProjectIds: uniqueObjectIds(input?.researchProjectIds ?? []),
        eventParticipationIds: uniqueObjectIds(input?.eventParticipationIds ?? []),
        adminRoleIds: uniqueObjectIds(input?.adminRoleIds ?? []),
        institutionalContributionIds: uniqueObjectIds(input?.institutionalContributionIds ?? []),
        socialExtensionIds: uniqueObjectIds(input?.socialExtensionIds ?? []),
    };
}

export function emptyPbasDraftReferences(): IPbasDraftReferences {
    return buildDraftReferencesInternal();
}

export function parsePbasDraftReferences(input: PbasDraftReferencesInput): IPbasDraftReferences {
    const parsed = pbasDraftReferencesSchema.parse(input);

    return buildDraftReferencesInternal({
        teachingSummaryId: toObjectId(parsed.teachingSummaryId),
        teachingLoadIds: parsed.teachingLoadIds.map((item) => new Types.ObjectId(item)),
        publicationIds: parsed.publicationIds.map((item) => new Types.ObjectId(item)),
        bookIds: parsed.bookIds.map((item) => new Types.ObjectId(item)),
        patentIds: parsed.patentIds.map((item) => new Types.ObjectId(item)),
        researchProjectIds: parsed.researchProjectIds.map((item) => new Types.ObjectId(item)),
        eventParticipationIds: parsed.eventParticipationIds.map((item) => new Types.ObjectId(item)),
        adminRoleIds: parsed.adminRoleIds.map((item) => new Types.ObjectId(item)),
        institutionalContributionIds: parsed.institutionalContributionIds.map((item) => new Types.ObjectId(item)),
        socialExtensionIds: parsed.socialExtensionIds.map((item) => new Types.ObjectId(item)),
    });
}

export function serializePbasDraftReferences(input?: Partial<IPbasDraftReferences> | null) {
    const normalized = buildDraftReferencesInternal(input);

    return {
        teachingSummaryId: normalized.teachingSummaryId?.toString(),
        teachingLoadIds: stringifyIds(normalized.teachingLoadIds),
        publicationIds: stringifyIds(normalized.publicationIds),
        bookIds: stringifyIds(normalized.bookIds),
        patentIds: stringifyIds(normalized.patentIds),
        researchProjectIds: stringifyIds(normalized.researchProjectIds),
        eventParticipationIds: stringifyIds(normalized.eventParticipationIds),
        adminRoleIds: stringifyIds(normalized.adminRoleIds),
        institutionalContributionIds: stringifyIds(normalized.institutionalContributionIds),
        socialExtensionIds: stringifyIds(normalized.socialExtensionIds),
    };
}

export async function loadPbasReferenceContext(facultyId: Types.ObjectId, academicYearId: Types.ObjectId): Promise<PbasReferenceContext> {
    const academicYear = await AcademicYear.findById(academicYearId).select("yearStart yearEnd").lean();

    if (!academicYear) {
        throw new Error("Academic year not found for PBAS references.");
    }

    const { start, end } = toAcademicWindow(academicYear.yearStart, academicYear.yearEnd);

    const conferenceEvents = await Event.find({
        eventType: "Conference",
        $or: [
            { startDate: { $gte: start, $lte: end } },
            { endDate: { $gte: start, $lte: end } },
            {
                startDate: { $lte: end },
                endDate: { $gte: start },
            },
            { startDate: { $exists: false } },
            { startDate: null },
        ],
    })
        .select("_id title organizedBy startDate endDate level eventType")
        .lean();

    const conferenceEventIds = conferenceEvents.map((item) => item._id as Types.ObjectId);

    const [
        teachingSummary,
        teachingLoads,
        resultSummaries,
        publications,
        books,
        patents,
        projects,
        eventParticipations,
        adminRoles,
        institutionalContributions,
        socialExtensions,
    ] = await Promise.all([
        FacultyTeachingSummary.findOne({ facultyId, academicYearId }).lean(),
        FacultyTeachingLoad.find({ facultyId, academicYearId }).sort({ updatedAt: -1 }).lean(),
        FacultyResultSummary.find({ facultyId, academicYearId }).sort({ updatedAt: -1 }).lean(),
        FacultyPublication.find({
            facultyId,
            publicationType: { $ne: "Book" },
            $or: [
                { publicationDate: { $gte: start, $lte: end } },
                { publicationDate: { $exists: false } },
                { publicationDate: null },
            ],
        })
            .sort({ updatedAt: -1 })
            .lean(),
        FacultyBook.find({
            facultyId,
            $or: [
                { publicationDate: { $gte: start, $lte: end } },
                { publicationDate: { $exists: false } },
                { publicationDate: null },
            ],
        })
            .sort({ updatedAt: -1 })
            .lean(),
        FacultyPatent.find({
            facultyId,
            $or: [
                { filingDate: { $gte: start, $lte: end } },
                { grantDate: { $gte: start, $lte: end } },
                { filingDate: { $exists: false }, grantDate: { $exists: false } },
                { filingDate: null, grantDate: null },
            ],
        })
            .sort({ updatedAt: -1 })
            .lean(),
        FacultyResearchProject.find({
            facultyId,
            $or: [
                {
                    startDate: { $lte: end },
                    endDate: { $gte: start },
                },
                { startDate: { $gte: start, $lte: end } },
                { startDate: { $exists: false } },
                { startDate: null },
            ],
        })
            .sort({ updatedAt: -1 })
            .lean(),
        FacultyEventParticipation.find({
            facultyId,
            eventId: { $in: conferenceEventIds },
        })
            .populate("eventId", "title organizedBy startDate endDate level eventType")
            .sort({ updatedAt: -1 })
            .lean<EventParticipationCandidate[]>(),
        FacultyAdminRole.find({
            facultyId,
            $or: [{ academicYearId }, { academicYearId: { $exists: false } }, { academicYearId: null }],
        })
            .sort({ updatedAt: -1 })
            .lean(),
        FacultyInstitutionalContribution.find({
            facultyId,
            academicYearId,
            role: "Student Guidance",
        })
            .sort({ updatedAt: -1 })
            .lean(),
        FacultySocialExtension.find({
            facultyId,
            $or: [{ academicYearId }, { academicYearId: { $exists: false } }, { academicYearId: null }],
        })
            .populate("programId", "name")
            .sort({ updatedAt: -1 })
            .lean(),
    ]);

    return {
        academicYearId,
        academicYear: {
            yearStart: academicYear.yearStart,
            yearEnd: academicYear.yearEnd,
        },
        teachingSummary,
        teachingLoads,
        resultSummaries,
        publications,
        books,
        patents,
        projects,
        eventParticipations,
        adminRoles,
        institutionalContributions,
        socialExtensions,
    };
}

export function deriveAutoDraftReferences(context: PbasReferenceContext): IPbasDraftReferences {
    return buildDraftReferencesInternal({
        teachingSummaryId: context.teachingSummary?._id as Types.ObjectId | undefined,
        teachingLoadIds: context.teachingLoads.map((item) => item._id as Types.ObjectId),
        publicationIds: context.publications.map((item) => item._id as Types.ObjectId),
        bookIds: context.books.map((item) => item._id as Types.ObjectId),
        patentIds: context.patents.map((item) => item._id as Types.ObjectId),
        researchProjectIds: context.projects.map((item) => item._id as Types.ObjectId),
        eventParticipationIds: context.eventParticipations.map((item) => item._id as Types.ObjectId),
        adminRoleIds: context.adminRoles.map((item) => item._id as Types.ObjectId),
        institutionalContributionIds: context.institutionalContributions.map((item) => item._id as Types.ObjectId),
        socialExtensionIds: context.socialExtensions.map((item) => item._id as Types.ObjectId),
    });
}

export function sanitizeDraftReferences(
    references: Partial<IPbasDraftReferences> | null | undefined,
    context: PbasReferenceContext
): IPbasDraftReferences {
    const draftReferences = buildDraftReferencesInternal(references);

    const matches = (values: Types.ObjectId[], candidates: CandidateItem[]) => {
        const candidateIds = new Set(candidates.map((item) => item._id.toString()));
        return values.filter((item) => candidateIds.has(item.toString()));
    };

    const teachingSummaryId =
        draftReferences.teachingSummaryId &&
        context.teachingSummary?._id?.toString() === draftReferences.teachingSummaryId.toString()
            ? draftReferences.teachingSummaryId
            : undefined;

    return buildDraftReferencesInternal({
        teachingSummaryId,
        teachingLoadIds: matches(draftReferences.teachingLoadIds, context.teachingLoads as CandidateItem[]),
        publicationIds: matches(draftReferences.publicationIds, context.publications as CandidateItem[]),
        bookIds: matches(draftReferences.bookIds, context.books as CandidateItem[]),
        patentIds: matches(draftReferences.patentIds, context.patents as CandidateItem[]),
        researchProjectIds: matches(draftReferences.researchProjectIds, context.projects as CandidateItem[]),
        eventParticipationIds: matches(draftReferences.eventParticipationIds, context.eventParticipations),
        adminRoleIds: matches(draftReferences.adminRoleIds, context.adminRoles as CandidateItem[]),
        institutionalContributionIds: matches(
            draftReferences.institutionalContributionIds,
            context.institutionalContributions as CandidateItem[]
        ),
        socialExtensionIds: matches(draftReferences.socialExtensionIds, context.socialExtensions as CandidateItem[]),
    });
}

export function resolvePbasSnapshotFromReferences(
    context: PbasReferenceContext,
    references: Partial<IPbasDraftReferences> | null | undefined
): PbasSnapshot {
    const safeReferences = sanitizeDraftReferences(references, context);
    const fallbackYear = context.academicYear.yearStart || new Date().getFullYear();

    const teachingSummary =
        safeReferences.teachingSummaryId &&
        context.teachingSummary?._id?.toString() === safeReferences.teachingSummaryId.toString()
            ? context.teachingSummary
            : null;

    const selectedTeachingLoads = context.teachingLoads.filter((item) =>
        safeReferences.teachingLoadIds.some((selected) => selected.toString() === item._id?.toString())
    );
    const selectedPublications = context.publications.filter((item) =>
        safeReferences.publicationIds.some((selected) => selected.toString() === item._id?.toString())
    );
    const selectedBooks = context.books.filter((item) =>
        safeReferences.bookIds.some((selected) => selected.toString() === item._id?.toString())
    );
    const selectedPatents = context.patents.filter((item) =>
        safeReferences.patentIds.some((selected) => selected.toString() === item._id?.toString())
    );
    const selectedProjects = context.projects.filter((item) =>
        safeReferences.researchProjectIds.some((selected) => selected.toString() === item._id?.toString())
    );
    const selectedEventParticipations = context.eventParticipations.filter((item) =>
        safeReferences.eventParticipationIds.some((selected) => selected.toString() === item._id?.toString())
    );
    const selectedAdminRoles = context.adminRoles.filter((item) =>
        safeReferences.adminRoleIds.some((selected) => selected.toString() === item._id?.toString())
    );
    const selectedGuidance = context.institutionalContributions.filter((item) =>
        safeReferences.institutionalContributionIds.some((selected) => selected.toString() === item._id?.toString())
    );
    const selectedExtensions = context.socialExtensions.filter((item) =>
        safeReferences.socialExtensionIds.some((selected) => selected.toString() === item._id?.toString())
    );

    const teachingLoadHours = selectedTeachingLoads.reduce((sum, item) => sum + Number(item.totalHours || 0), 0);

    return pbasSnapshotSchema.parse({
        category1: {
            classesTaken: teachingSummary?.classesTaken ?? Math.round(teachingLoadHours),
            coursePreparationHours:
                teachingSummary?.coursePreparationHours ??
                Math.round(selectedTeachingLoads.reduce((sum, item) => sum + Number(item.lectureHours || 0), 0)),
            coursesTaught:
                teachingSummary?.coursesTaught?.length
                    ? teachingSummary.coursesTaught
                    : Array.from(
                        new Set(selectedTeachingLoads.map((item) => item.courseName).filter(Boolean))
                    ),
            mentoringCount: teachingSummary?.mentoringCount ?? 0,
            labSupervisionCount:
                teachingSummary?.labSupervisionCount ??
                selectedTeachingLoads.filter((item) => Number(item.practicalHours || 0) > 0).length,
            feedbackSummary: teachingSummary?.feedbackSummary ?? "",
        },
        category2: {
            researchPapers: selectedPublications.map((item) => ({
                title: item.title,
                journal: item.journalName || item.publisher || "Journal",
                year: item.publicationDate?.getFullYear?.() ?? fallbackYear,
                issn: item.isbnIssn,
                indexing: item.indexedIn,
            })),
            books: selectedBooks.map((item) => ({
                title: item.title,
                publisher: item.publisher || "Publisher",
                isbn: item.isbn,
                year: item.publicationDate?.getFullYear?.() ?? fallbackYear,
            })),
            patents: selectedPatents.map((item) => ({
                title: item.title,
                year: item.filingDate?.getFullYear?.() ?? item.grantDate?.getFullYear?.() ?? fallbackYear,
                status: item.status,
            })),
            conferences: selectedEventParticipations.map((item) => ({
                title: item.paperTitle || item.eventId?.title || "Conference Participation",
                organizer: item.eventId?.organizedBy || "Conference",
                year: item.eventId?.startDate?.getFullYear?.() ?? fallbackYear,
                type: item.eventId?.level || item.eventId?.eventType || "Conference",
            })),
            projects: selectedProjects.map((item) => ({
                title: item.title,
                fundingAgency: item.fundingAgency || "Funding Agency",
                amount: item.amountSanctioned || 0,
                year: item.startDate?.getFullYear?.() ?? fallbackYear,
            })),
        },
        category3: {
            committees: selectedAdminRoles
                .filter((item) => item.committeeName && !isExamRole(item))
                .map((item) => ({
                    committeeName: item.committeeName!,
                    role: item.roleName,
                    year: fallbackYear,
                })),
            administrativeDuties: selectedAdminRoles
                .filter((item) => !item.committeeName && !isExamRole(item))
                .map((item) => ({
                    title: item.roleName,
                    year: fallbackYear,
                })),
            examDuties: selectedAdminRoles
                .filter((item) => isExamRole(item))
                .map((item) => ({
                    duty: item.committeeName || item.roleName,
                    year: fallbackYear,
                })),
            studentGuidance: selectedGuidance.map((item) => ({
                activity: item.activityTitle,
                count: Math.round(item.scoreWeightage || 0),
            })),
            extensionActivities: selectedExtensions.map((item) => ({
                title: item.activityName || getProgramName(item.programId) || "Extension Activity",
                role: undefined,
                year: fallbackYear,
            })),
        },
    });
}

export function serializePbasCandidatePools(context: PbasReferenceContext): PbasCandidatePools {
    const adminRoles = context.adminRoles;

    return {
        category1: {
            teachingSummary: context.teachingSummary
                ? {
                    id: context.teachingSummary._id.toString(),
                    label: `Teaching summary for ${context.academicYear.yearStart}-${context.academicYear.yearEnd}`,
                    sublabel: `${context.teachingSummary.classesTaken ?? 0} classes, ${context.teachingSummary.coursesTaught?.length ?? 0} courses`,
                }
                : undefined,
            teachingLoads: context.teachingLoads.map((item) => ({
                id: item._id.toString(),
                label: item.courseName || "Teaching Load",
                sublabel: `Semester ${item.semester} • ${item.totalHours ?? 0} hrs`,
                note: item.subjectCode || undefined,
            })),
            resultSummaries: context.resultSummaries.map((item) => ({
                id: item._id.toString(),
                label: item.subjectName || "Result Summary",
                sublabel: `Appeared ${item.studentsAppeared ?? 0} • Passed ${item.studentsPassed ?? 0}`,
                note: typeof item.passPercentage === "number" ? `Pass ${item.passPercentage}%` : undefined,
            })),
        },
        category2: {
            researchPapers: context.publications.map((item) => ({
                id: item._id.toString(),
                label: item.title || "Publication",
                sublabel: `${item.journalName || item.publisher || "Journal"} • ${formatDate(item.publicationDate)}`,
                note: item.indexedIn || item.publicationType,
            })),
            books: context.books.map((item) => ({
                id: item._id.toString(),
                label: item.title || "Book",
                sublabel: `${item.publisher || "Publisher"} • ${formatDate(item.publicationDate)}`,
                note: item.bookType,
            })),
            patents: context.patents.map((item) => ({
                id: item._id.toString(),
                label: item.title || "Patent",
                sublabel: `${item.status} • ${formatDate(item.filingDate || item.grantDate)}`,
                note: item.patentNumber || undefined,
            })),
            conferences: context.eventParticipations.map((item) => ({
                id: item._id.toString(),
                label: item.paperTitle || item.eventId?.title || "Conference Participation",
                sublabel: `${item.eventId?.organizedBy || "Conference"} • ${formatDate(item.eventId?.startDate)}`,
                note: item.eventId?.level || item.role,
            })),
            projects: context.projects.map((item) => ({
                id: item._id.toString(),
                label: item.title || "Research Project",
                sublabel: `${item.fundingAgency || "Funding Agency"} • ${formatDate(item.startDate)}`,
                note: item.projectType,
            })),
        },
        category3: {
            committees: adminRoles
                .filter((item) => item.committeeName && !isExamRole(item))
                .map((item) => ({
                    id: item._id.toString(),
                    label: item.committeeName!,
                    sublabel: item.roleName,
                    note: item.responsibilityDescription || undefined,
                })),
            administrativeDuties: adminRoles
                .filter((item) => !item.committeeName && !isExamRole(item))
                .map((item) => ({
                    id: item._id.toString(),
                    label: item.roleName || "Administrative Duty",
                    sublabel: item.responsibilityDescription || "Administrative responsibility",
                })),
            examDuties: adminRoles
                .filter((item) => isExamRole(item))
                .map((item) => ({
                    id: item._id.toString(),
                    label: item.committeeName || item.roleName || "Exam Duty",
                    sublabel: "Exam duty",
                })),
            studentGuidance: context.institutionalContributions.map((item) => ({
                id: item._id.toString(),
                label: item.activityTitle || "Student Guidance",
                sublabel: `${item.role} • Weight ${Math.round(item.scoreWeightage || 0)}`,
            })),
            extensionActivities: context.socialExtensions.map((item) => ({
                id: item._id.toString(),
                label: item.activityName || getProgramName(item.programId) || "Extension Activity",
                sublabel: `${getProgramName(item.programId) || "Program"} • ${item.hoursContributed ?? 0} hrs`,
            })),
        },
    };
}

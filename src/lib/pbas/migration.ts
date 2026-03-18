import { Types } from "mongoose";

import AcademicYear from "@/models/reference/academic-year";
import PbasApplication, { type PbasStatus } from "@/models/core/pbas-application";
import CasApplication from "@/models/core/cas-application";
import FacultyPbasForm, { type FacultyPbasSubmissionStatus } from "@/models/core/faculty-pbas-form";
import FacultyPbasRevision from "@/models/core/faculty-pbas-revision";
import FacultyPbasEntry from "@/models/core/faculty-pbas-entry";
import PbasCategoryMaster, { type PbasCategoryCode } from "@/models/core/pbas-category-master";
import PbasIndicatorMaster from "@/models/core/pbas-indicator-master";
import PbasIdAlias from "@/models/core/pbas-id-alias";
import { PBAS_CATEGORIES, PBAS_INDICATORS } from "@/lib/pbas/catalog";
import FacultyTeachingSummary from "@/models/faculty/faculty-teaching-summary";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyBook from "@/models/faculty/faculty-book";
import FacultyPatent from "@/models/faculty/faculty-patent";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultyInstitutionalContribution from "@/models/faculty/faculty-institutional-contribution";
import FacultySocialExtension from "@/models/faculty/faculty-social-extension";
import FacultyEventParticipation from "@/models/faculty/faculty-event-participation";
import Faculty from "@/models/faculty/faculty";
import Event from "@/models/reference/event";
import SocialProgram from "@/models/reference/social-program";
import { deriveAutoDraftReferences, loadPbasReferenceContext, resolvePbasSnapshotFromReferences } from "@/lib/pbas/references";
import { pbasSnapshotSchema } from "@/lib/pbas/validators";

type IndicatorSeed = {
    categoryCode: PbasCategoryCode;
    indicatorCode: string;
    indicatorName: string;
    description?: string;
    maxScore: number;
    naacCriteriaCode?: string;
};

function parseAcademicYearLabel(value: string) {
    const match = value.trim().match(/(\d{4})\D+(\d{2,4})/);

    if (!match) {
        throw new Error(`Invalid academic year "${value}".`);
    }

    const start = Number(match[1]);
    const endValue = Number(match[2]);
    const end =
        endValue < 100
            ? Number(`${String(start).slice(0, 2)}${String(endValue).padStart(2, "0")}`)
            : endValue;

    return { start, end };
}

async function ensureAcademicYear(value: string) {
    const parsed = parseAcademicYearLabel(value);
    let academicYear = await AcademicYear.findOne({
        yearStart: parsed.start,
        yearEnd: parsed.end,
    });

    if (!academicYear) {
        academicYear = await AcademicYear.create({
            yearStart: parsed.start,
            yearEnd: parsed.end,
            isActive: false,
        });
    }

    return academicYear;
}

function statusPriority(status: PbasStatus) {
    const priorities: Record<PbasStatus, number> = {
        Approved: 6,
        "Committee Review": 5,
        "Under Review": 4,
        Submitted: 3,
        Draft: 2,
        Rejected: 1,
    };

    return priorities[status] ?? 0;
}

function deriveSubmissionStatus(status: PbasStatus): FacultyPbasSubmissionStatus {
    if (status === "Approved") {
        return "Locked";
    }

    if (status === "Draft" || status === "Rejected") {
        return "Draft";
    }

    return "Submitted";
}

let migrationPromise: Promise<void> | null = null;

export async function seedPbasMasters(options: { overwrite?: boolean } = {}) {
    const updateMode = options.overwrite ? "$set" : "$setOnInsert";

    await Promise.all(
        PBAS_CATEGORIES.map((category) =>
            PbasCategoryMaster.updateOne(
                { categoryCode: category.categoryCode },
                { [updateMode]: category },
                { upsert: true }
            )
        )
    );

    const storedCategories = await PbasCategoryMaster.find({ categoryCode: { $in: ["A", "B", "C"] } })
        .select("_id categoryCode")
        .lean();

    const categoryByCode = new Map<PbasCategoryCode, Types.ObjectId>();
    for (const item of storedCategories) {
        categoryByCode.set(item.categoryCode as PbasCategoryCode, item._id as Types.ObjectId);
    }

    const indicators: IndicatorSeed[] = PBAS_INDICATORS;

    await Promise.all(
        indicators.map(async (indicator) => {
            const categoryId = categoryByCode.get(indicator.categoryCode);
            if (!categoryId) {
                return;
            }

            await PbasIndicatorMaster.updateOne(
                { indicatorCode: indicator.indicatorCode },
                {
                    [updateMode]: {
                        categoryId,
                        indicatorCode: indicator.indicatorCode,
                        indicatorName: indicator.indicatorName,
                        description: indicator.description,
                        maxScore: indicator.maxScore,
                        naacCriteriaCode: indicator.naacCriteriaCode,
                    },
                },
                { upsert: true }
            );
        })
    );
}

async function upsertTotalEntries(form: InstanceType<typeof FacultyPbasForm>, revisionId?: string) {
    const indicators = await PbasIndicatorMaster.find({
        indicatorCode: { $in: ["A_TOTAL", "B_TOTAL", "C_TOTAL", "API_TOTAL"] },
    })
        .select("_id indicatorCode")
        .lean();

    const indicatorByCode = new Map<string, Types.ObjectId>();
    for (const indicator of indicators) {
        indicatorByCode.set(indicator.indicatorCode, indicator._id as Types.ObjectId);
    }

    const revision = revisionId ? await FacultyPbasRevision.findById(revisionId).select("apiScore approvedAt") : null;
    const apiScore = revision?.apiScore ?? form.apiScore;
    const scoreByCode: Record<string, number> = {
        A_TOTAL: Number(apiScore?.teachingActivities ?? 0),
        B_TOTAL: Number(apiScore?.researchAcademicContribution ?? 0),
        C_TOTAL: Number(apiScore?.institutionalResponsibilities ?? 0),
        API_TOTAL: Number(apiScore?.totalScore ?? 0),
    };

    const isLocked = revision ? Boolean(revision.approvedAt) : form.submissionStatus === "Locked" || form.status === "Approved";
    const revisionObjectId = revisionId ? new Types.ObjectId(revisionId) : undefined;

    await Promise.all(
        Object.entries(scoreByCode).map(async ([indicatorCode, claimedScore]) => {
            const indicatorId = indicatorByCode.get(indicatorCode);
            if (!indicatorId) {
                return;
            }

            await FacultyPbasEntry.updateOne(
                revisionObjectId
                    ? { pbasFormId: form._id, pbasRevisionId: revisionObjectId, indicatorId }
                    : { pbasFormId: form._id, pbasRevisionId: { $exists: false }, indicatorId },
                revisionObjectId
                    ? {
                        $set: {
                            pbasFormId: form._id,
                            pbasRevisionId: revisionObjectId,
                            indicatorId,
                            facultyId: form.facultyId,
                            academicYearId: form.academicYearId,
                            claimedScore,
                            approvedScore: isLocked ? claimedScore : undefined,
                        },
                        $setOnInsert: {
                            remarks: "",
                        },
                    }
                    : {
                        $set: {
                            pbasFormId: form._id,
                            indicatorId,
                            facultyId: form.facultyId,
                            academicYearId: form.academicYearId,
                            claimedScore,
                            approvedScore: isLocked ? claimedScore : undefined,
                        },
                        $unset: {
                            pbasRevisionId: 1,
                        },
                        $setOnInsert: {
                            remarks: "",
                        },
                    },
                { upsert: true }
            );
        })
    );
}

export async function syncPbasTotalEntries(formId: string, revisionId?: string) {
    const form = await FacultyPbasForm.findById(formId);
    if (!form) {
        return;
    }

    await seedPbasMasters();
    await upsertTotalEntries(form, revisionId);
}

async function remapCasPbasReports(mapping: Map<string, string>) {
    const legacyIds = Array.from(mapping.keys());
    if (!legacyIds.length) {
        return;
    }

    const legacyObjectIds = legacyIds.map((id) => new Types.ObjectId(id));
    const cursor = CasApplication.find({ pbasReports: { $in: legacyObjectIds } }).cursor();

    for await (const application of cursor) {
        const updated = application.pbasReports.map((entry) => {
            const next = mapping.get(entry.toString());
            return next ? new Types.ObjectId(next) : entry;
        });

        const unique = Array.from(new Set(updated.map((id) => id.toString()))).map(
            (id) => new Types.ObjectId(id)
        );

        application.pbasReports = unique;
        await application.save();
    }
}

async function backfillPbasReferencesAndRevisions(
    legacyByFormId: Map<string, InstanceType<typeof PbasApplication>>
) {
    const forms = await FacultyPbasForm.find({}).cursor();

    for await (const form of forms) {
        const context = await loadPbasReferenceContext(form.facultyId, form.academicYearId);
        const autoReferences = deriveAutoDraftReferences(context);
        let draftReferencesUpdated = false;

        if (
            !form.draftReferences ||
            (!form.draftReferences.teachingSummaryId &&
                !(form.draftReferences.teachingLoadIds?.length ?? 0) &&
                !(form.draftReferences.publicationIds?.length ?? 0) &&
                !(form.draftReferences.bookIds?.length ?? 0) &&
                !(form.draftReferences.patentIds?.length ?? 0) &&
                !(form.draftReferences.researchProjectIds?.length ?? 0) &&
                !(form.draftReferences.eventParticipationIds?.length ?? 0) &&
                !(form.draftReferences.adminRoleIds?.length ?? 0) &&
                !(form.draftReferences.institutionalContributionIds?.length ?? 0) &&
                !(form.draftReferences.socialExtensionIds?.length ?? 0))
        ) {
            form.draftReferences = autoReferences;
            draftReferencesUpdated = true;
        }

        const existingRevisions = await FacultyPbasRevision.find({ pbasFormId: form._id })
            .sort({ revisionNumber: -1 })
            .select("_id revisionNumber apiScore");

        if (draftReferencesUpdated) {
            await form.save();
            await upsertTotalEntries(form);
        }

        if (existingRevisions.length) {
            if (!form.activeRevisionId) {
                form.activeRevisionId = existingRevisions[0]._id as Types.ObjectId;
                form.latestSubmittedRevisionId = existingRevisions[0]._id as Types.ObjectId;
                form.apiScore = existingRevisions[0].apiScore;
                await form.save();
            }
            continue;
        }

        if (["Draft", "Rejected"].includes(form.status)) {
            continue;
        }

        const legacy = legacyByFormId.get(form._id.toString());
        const snapshot = legacy
            ? pbasSnapshotSchema.parse({
                category1: legacy.category1 ?? {},
                category2: legacy.category2 ?? {},
                category3: legacy.category3 ?? {},
            })
            : null;

        const revision = await FacultyPbasRevision.create({
            pbasFormId: form._id,
            revisionNumber: 1,
            createdFromStatus: form.status,
            submittedAt: form.submittedAt ?? form.updatedAt ?? new Date(),
            submittedBy: undefined,
            approvedAt: form.status === "Approved" ? form.verifiedAt ?? form.updatedAt : undefined,
            approvedBy: form.status === "Approved" ? form.verifiedBy : undefined,
            migrationSource: legacy ? "legacy_snapshot" : "live_references",
            backfillIntegrity: legacy ? "exact" : "reconstructed",
            references: form.draftReferences ?? autoReferences,
            snapshot: snapshot ?? resolvePbasSnapshotFromReferences(context, form.draftReferences ?? autoReferences),
            apiScore: form.apiScore,
        });

        form.activeRevisionId = revision._id as Types.ObjectId;
        form.latestSubmittedRevisionId = revision._id as Types.ObjectId;
        await form.save();

        await upsertTotalEntries(form, revision._id.toString());
    }
}

export async function ensurePbasDynamicMigration() {
    if (migrationPromise) {
        await migrationPromise;
        return;
    }

    migrationPromise = (async () => {
        await seedPbasMasters();

        const legacyCount = await PbasApplication.estimatedDocumentCount();
        const byKey = new Map<string, Array<InstanceType<typeof PbasApplication>>>();
        const aliasMapping = new Map<string, string>();
        const legacyByCanonicalFormId = new Map<string, InstanceType<typeof PbasApplication>>();
        if (legacyCount) {
            const legacyCursor = PbasApplication.find({}).cursor();
            const academicYearIdByLabel = new Map<string, Types.ObjectId>();

            for await (const legacy of legacyCursor) {
                const label = legacy.academicYear;
                let academicYearId: Types.ObjectId | null = null;
                const cached = academicYearIdByLabel.get(label);
                if (cached) {
                    academicYearId = cached;
                } else {
                    try {
                        const academicYear = await ensureAcademicYear(label);
                        academicYearId = academicYear._id as Types.ObjectId;
                        academicYearIdByLabel.set(label, academicYearId);
                    } catch {
                        continue;
                    }
                }

                const key = `${legacy.facultyId.toString()}::${academicYearId.toString()}`;
                const existing = byKey.get(key) ?? [];
                existing.push(legacy);
                byKey.set(key, existing);
            }

            for (const [key, group] of byKey) {
                group.sort((a, b) => {
                    const score = statusPriority(b.status) - statusPriority(a.status);
                    if (score !== 0) return score;
                    return (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0);
                });

                const canonicalLegacy = group[0];
                const [facultyId, academicYearId] = key.split("::");
                const academicYearLabel = canonicalLegacy.academicYear;

                const facultyObjectId = new Types.ObjectId(facultyId);
                const academicYearObjectId = new Types.ObjectId(academicYearId);

                const existingForm = await FacultyPbasForm.findOne({
                    facultyId: facultyObjectId,
                    academicYearId: academicYearObjectId,
                }).select("_id");

                const canonicalFormId = existingForm?._id ?? canonicalLegacy._id;

                if (canonicalFormId.toString() !== canonicalLegacy._id.toString()) {
                    aliasMapping.set(canonicalLegacy._id.toString(), canonicalFormId.toString());
                    await PbasIdAlias.updateOne(
                        { legacyPbasId: canonicalLegacy._id },
                        {
                            $set: {
                                legacyPbasId: canonicalLegacy._id,
                                canonicalPbasId: canonicalFormId,
                                facultyId: facultyObjectId,
                                academicYearId: academicYearObjectId,
                            },
                        },
                        { upsert: true }
                    );
                }

                const doc = {
                    facultyId: facultyObjectId,
                    academicYearId: academicYearObjectId,
                    submissionStatus: deriveSubmissionStatus(canonicalLegacy.status),
                    submittedAt: canonicalLegacy.submittedAt,
                    verifiedBy: undefined,
                    verifiedAt: undefined,
                    remarks: "",
                    academicYear: academicYearLabel,
                    currentDesignation: canonicalLegacy.currentDesignation,
                    appraisalPeriod: canonicalLegacy.appraisalPeriod,
                    apiScore: canonicalLegacy.apiScore,
                    reviewCommittee: canonicalLegacy.reviewCommittee,
                    statusLogs: canonicalLegacy.statusLogs,
                    status: canonicalLegacy.status,
                };

                await FacultyPbasForm.updateOne(
                    { _id: canonicalFormId },
                    { $set: doc },
                    { upsert: true }
                );

                const stored = await FacultyPbasForm.findById(canonicalFormId);

                if (stored) {
                    legacyByCanonicalFormId.set(stored._id.toString(), canonicalLegacy);
                    await upsertTotalEntries(stored);
                }

                for (const legacy of group.slice(1)) {
                    aliasMapping.set(legacy._id.toString(), canonicalFormId.toString());
                    await PbasIdAlias.updateOne(
                        { legacyPbasId: legacy._id },
                        {
                            $set: {
                                legacyPbasId: legacy._id,
                                canonicalPbasId: canonicalFormId,
                                facultyId: facultyObjectId,
                                academicYearId: academicYearObjectId,
                            },
                        },
                        { upsert: true }
                    );
                }
            }

            await remapCasPbasReports(aliasMapping);
        }

        await backfillPbasReferencesAndRevisions(legacyByCanonicalFormId);
    })();

    try {
        await migrationPromise;
    } catch (error) {
        migrationPromise = null;
        throw error;
    }
}

export async function resolveCanonicalPbasId(id: string) {
    const alias = await PbasIdAlias.findOne({ legacyPbasId: new Types.ObjectId(id) })
        .select("canonicalPbasId")
        .lean();

    return alias?.canonicalPbasId ? alias.canonicalPbasId.toString() : null;
}

function mapPublicationType(indexing?: string) {
    const value = (indexing ?? "").toLowerCase();
    if (value.includes("scopus")) return "Scopus" as const;
    if (value.includes("web of science") || value.includes("wos")) return "WebOfScience" as const;
    return "UGC" as const;
}

function mapPatentStatus(status?: string) {
    const value = (status ?? "").toLowerCase();
    if (value.includes("grant")) return "Granted" as const;
    if (value.includes("publish")) return "Published" as const;
    return "Filed" as const;
}

async function ensureSocialProgram(name: string) {
    let program = await SocialProgram.findOne({ name, type: "Extension" });

    if (!program) {
        program = await SocialProgram.create({ name, type: "Extension" });
    }

    return program;
}

async function ensureEventForConference(
    facultyId: Types.ObjectId,
    title: string,
    organizer?: string,
    year?: number,
    cache?: Map<string, { institutionId?: Types.ObjectId; departmentId?: Types.ObjectId; designation?: string }>
) {
    const key = facultyId.toString();
    let facultyContext = cache?.get(key);
    if (!facultyContext) {
        const faculty = await Faculty.findById(facultyId).select("institutionId departmentId designation");
        facultyContext = {
            institutionId: faculty?.institutionId,
            departmentId: faculty?.departmentId,
            designation: faculty?.designation,
        };
        cache?.set(key, facultyContext);
    }

    let event = await Event.findOne({
        title,
        institutionId: facultyContext?.institutionId,
        departmentId: facultyContext?.departmentId,
        eventType: "Conference",
    });

    if (!event) {
        event = await Event.create({
            title,
            eventType: "Conference",
            organizedBy: organizer || facultyContext?.designation || "Faculty",
            startDate: year ? new Date(year, 0, 1) : undefined,
            institutionId: facultyContext?.institutionId,
            departmentId: facultyContext?.departmentId,
        });
    }

    return event;
}

export async function backfillPbasLegacyToFacultyRecords(options: { limit?: number } = {}) {
    await ensurePbasDynamicMigration();
    const cursor = FacultyPbasForm.collection.find({});
    if (options.limit && options.limit > 0) {
        cursor.limit(options.limit);
    }

    const facultyCache = new Map<string, { institutionId?: Types.ObjectId; departmentId?: Types.ObjectId; designation?: string }>();
    const result = {
        processed: 0,
        teachingSummaries: 0,
        publications: 0,
        books: 0,
        patents: 0,
        projects: 0,
        adminRoles: 0,
        institutionalContributions: 0,
        extensions: 0,
        conferences: 0,
    };

    for await (const raw of cursor) {
        const doc = raw as {
            _id: Types.ObjectId;
            facultyId?: Types.ObjectId;
            academicYearId?: Types.ObjectId;
            academicYear?: string;
            category1?: {
                classesTaken?: number;
                coursePreparationHours?: number;
                coursesTaught?: string[];
                mentoringCount?: number;
                labSupervisionCount?: number;
                feedbackSummary?: string;
            };
            category2?: {
                researchPapers?: Array<{ title?: string; journal?: string; year?: number; issn?: string; indexing?: string }>;
                books?: Array<{ title?: string; publisher?: string; isbn?: string; year?: number }>;
                patents?: Array<{ title?: string; year?: number; status?: string }>;
                conferences?: Array<{ title?: string; organizer?: string; year?: number; type?: string }>;
                projects?: Array<{ title?: string; fundingAgency?: string; amount?: number; year?: number }>;
            };
            category3?: {
                committees?: Array<{ committeeName?: string; role?: string; year?: number }>;
                administrativeDuties?: Array<{ title?: string; year?: number }>;
                examDuties?: Array<{ duty?: string; year?: number }>;
                studentGuidance?: Array<{ activity?: string; count?: number }>;
                extensionActivities?: Array<{ title?: string; role?: string; year?: number }>;
            };
        };

        if (!doc.facultyId) {
            continue;
        }

        result.processed += 1;

        const facultyId = doc.facultyId;
        const academicYearId = doc.academicYearId;
        const yearFallback = Number(doc.academicYear?.slice(0, 4)) || new Date().getFullYear();

        if (doc.category1 && academicYearId) {
            const exists = await FacultyTeachingSummary.findOne({ facultyId, academicYearId }).select("_id");
            if (!exists) {
                await FacultyTeachingSummary.create({
                    facultyId,
                    academicYearId,
                    classesTaken: doc.category1.classesTaken ?? 0,
                    coursePreparationHours: doc.category1.coursePreparationHours ?? 0,
                    coursesTaught: doc.category1.coursesTaught ?? [],
                    mentoringCount: doc.category1.mentoringCount ?? 0,
                    labSupervisionCount: doc.category1.labSupervisionCount ?? 0,
                    feedbackSummary: doc.category1.feedbackSummary,
                });
                result.teachingSummaries += 1;
            }
        }

        for (const paper of doc.category2?.researchPapers ?? []) {
            const title = paper.title?.trim();
            if (!title) continue;
            const year = Number(paper.year) || yearFallback;
            const publicationDate = new Date(year, 0, 1);
            const update = await FacultyPublication.updateOne(
                { facultyId, title, publicationDate },
                {
                    $setOnInsert: {
                        facultyId,
                        title,
                        journalName: paper.journal?.trim(),
                        publicationType: mapPublicationType(paper.indexing),
                        publicationDate,
                        isbnIssn: paper.issn,
                        indexedIn: paper.indexing,
                    },
                },
                { upsert: true }
            );
            if (update.upsertedCount) result.publications += 1;
        }

        for (const book of doc.category2?.books ?? []) {
            const title = book.title?.trim();
            if (!title) continue;
            const year = Number(book.year) || yearFallback;
            const publicationDate = new Date(year, 0, 1);
            const update = await FacultyBook.updateOne(
                { facultyId, title, publicationDate },
                {
                    $setOnInsert: {
                        facultyId,
                        title,
                        publisher: book.publisher?.trim(),
                        isbn: book.isbn,
                        publicationDate,
                        bookType: "Textbook",
                    },
                },
                { upsert: true }
            );
            if (update.upsertedCount) result.books += 1;
        }

        for (const patent of doc.category2?.patents ?? []) {
            const title = patent.title?.trim();
            if (!title) continue;
            const update = await FacultyPatent.updateOne(
                { facultyId, title },
                {
                    $setOnInsert: {
                        facultyId,
                        title,
                        status: mapPatentStatus(patent.status),
                        filingDate: patent.year ? new Date(patent.year, 0, 1) : undefined,
                    },
                },
                { upsert: true }
            );
            if (update.upsertedCount) result.patents += 1;
        }

        for (const project of doc.category2?.projects ?? []) {
            const title = project.title?.trim();
            if (!title) continue;
            const year = Number(project.year) || yearFallback;
            const startDate = new Date(year, 0, 1);
            const update = await FacultyResearchProject.updateOne(
                { facultyId, title, startDate },
                {
                    $setOnInsert: {
                        facultyId,
                        title,
                        fundingAgency: project.fundingAgency?.trim(),
                        amountSanctioned: project.amount ?? 0,
                        projectType: project.amount && project.amount >= 1000000 ? "Major" : "Minor",
                        startDate,
                        status: "Ongoing",
                        principalInvestigator: false,
                    },
                },
                { upsert: true }
            );
            if (update.upsertedCount) result.projects += 1;
        }

        for (const committee of doc.category3?.committees ?? []) {
            const committeeName = committee.committeeName?.trim();
            if (!committeeName || !academicYearId) continue;
            const update = await FacultyAdminRole.updateOne(
                {
                    facultyId,
                    roleName: committee.role?.trim() || "Member",
                    committeeName,
                    academicYearId,
                },
                { $setOnInsert: { responsibilityDescription: "PBAS Committee Role" } },
                { upsert: true }
            );
            if (update.upsertedCount) result.adminRoles += 1;
        }

        for (const duty of doc.category3?.administrativeDuties ?? []) {
            const title = duty.title?.trim();
            if (!title || !academicYearId) continue;
            const update = await FacultyAdminRole.updateOne(
                { facultyId, roleName: title, academicYearId },
                { $setOnInsert: { responsibilityDescription: "PBAS Administrative Duty" } },
                { upsert: true }
            );
            if (update.upsertedCount) result.adminRoles += 1;
        }

        for (const examDuty of doc.category3?.examDuties ?? []) {
            const duty = examDuty.duty?.trim();
            if (!duty || !academicYearId) continue;
            const update = await FacultyAdminRole.updateOne(
                { facultyId, roleName: "Exam Duty", committeeName: duty, academicYearId },
                { $setOnInsert: { responsibilityDescription: "PBAS Exam Duty" } },
                { upsert: true }
            );
            if (update.upsertedCount) result.adminRoles += 1;
        }

        for (const guidance of doc.category3?.studentGuidance ?? []) {
            const activity = guidance.activity?.trim();
            if (!activity || !academicYearId) continue;
            const update = await FacultyInstitutionalContribution.updateOne(
                { facultyId, academicYearId, activityTitle: activity, role: "Student Guidance" },
                {
                    $setOnInsert: {
                        impactLevel: "dept",
                        scoreWeightage: guidance.count ?? 0,
                    },
                },
                { upsert: true }
            );
            if (update.upsertedCount) result.institutionalContributions += 1;
        }

        for (const extension of doc.category3?.extensionActivities ?? []) {
            const title = extension.title?.trim();
            if (!title || !academicYearId) continue;
            const program = await ensureSocialProgram(title);
            const update = await FacultySocialExtension.updateOne(
                { facultyId, programId: program._id, academicYearId, activityName: title },
                { $setOnInsert: { hoursContributed: 0 } },
                { upsert: true }
            );
            if (update.upsertedCount) result.extensions += 1;
        }

        for (const conference of doc.category2?.conferences ?? []) {
            const title = conference.title?.trim();
            if (!title) continue;
            const event = await ensureEventForConference(
                facultyId,
                title,
                conference.organizer?.trim(),
                conference.year,
                facultyCache
            );
            if (!event) continue;
            const update = await FacultyEventParticipation.updateOne(
                { facultyId, eventId: event._id, role: "Participant" },
                { $setOnInsert: { paperPresented: false, organized: false } },
                { upsert: true }
            );
            if (update.upsertedCount) result.conferences += 1;
        }
    }

    return result;
}

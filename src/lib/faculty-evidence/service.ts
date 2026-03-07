import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import User from "@/models/core/user";
import FacultyEvidence from "@/models/core/faculty-evidence";
import { facultyEvidenceSchema } from "@/lib/faculty-evidence/validators";
import type { CasApplicationInput } from "@/lib/cas/validators";
import type { PbasApplicationInput } from "@/lib/pbas/validators";
import type { AqarApplicationInput } from "@/lib/aqar/validators";

function uniqueBy<T>(items: T[], keyOf: (item: T) => string) {
    const map = new Map<string, T>();
    for (const item of items) {
        const key = keyOf(item).trim().toLowerCase();
        if (!key) continue;
        map.set(key, item);
    }
    return Array.from(map.values()).sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
}

async function getOrCreateEvidence(facultyId: string) {
    await dbConnect();

    const user = await User.findById(facultyId).select("role");
    if (!user || user.role !== "Faculty") {
        throw new AuthError("Faculty evidence profile not found.", 404);
    }

    const evidence =
        (await FacultyEvidence.findOne({ facultyId })) ||
        (await FacultyEvidence.create({
            facultyId,
            publications: [],
            books: [],
            projects: [],
            patents: [],
            conferences: [],
            workshops: [],
            extensionActivities: [],
            collaborations: [],
        }));

    return evidence;
}

export async function getFacultyEvidence(facultyId: string) {
    return getOrCreateEvidence(facultyId);
}

export async function saveFacultyEvidence(facultyId: string, rawInput: unknown) {
    const input = facultyEvidenceSchema.parse(rawInput);
    const evidence = await getOrCreateEvidence(facultyId);

    evidence.publications = uniqueBy(input.publications, (item) => `${item.title}-${item.journal}-${item.year}`);
    evidence.books = uniqueBy(input.books, (item) => `${item.title}-${item.publisher}-${item.year}`);
    evidence.projects = uniqueBy(input.projects, (item) => `${item.title}-${item.fundingAgency}-${item.year}`);
    evidence.patents = uniqueBy(input.patents, (item) => `${item.title}-${item.status}-${item.year}`);
    evidence.conferences = uniqueBy(input.conferences, (item) => `${item.title}-${item.year}`);
    evidence.workshops = uniqueBy(input.workshops, (item) => `${item.title}-${item.year}`);
    evidence.extensionActivities = uniqueBy(input.extensionActivities, (item) => `${item.title}-${item.year}`);
    evidence.collaborations = uniqueBy(input.collaborations, (item) => `${item.organization}-${item.purpose}-${item.year}`);

    await evidence.save();
    return evidence;
}

async function mergeEvidence(
    facultyId: string,
    partial: Partial<{
        publications: Awaited<ReturnType<typeof getOrCreateEvidence>>["publications"];
        books: Awaited<ReturnType<typeof getOrCreateEvidence>>["books"];
        projects: Awaited<ReturnType<typeof getOrCreateEvidence>>["projects"];
        patents: Awaited<ReturnType<typeof getOrCreateEvidence>>["patents"];
        conferences: Awaited<ReturnType<typeof getOrCreateEvidence>>["conferences"];
        workshops: Awaited<ReturnType<typeof getOrCreateEvidence>>["workshops"];
        extensionActivities: Awaited<ReturnType<typeof getOrCreateEvidence>>["extensionActivities"];
        collaborations: Awaited<ReturnType<typeof getOrCreateEvidence>>["collaborations"];
    }>
) {
    const evidence = await getOrCreateEvidence(facultyId);

    const current = {
        publications: evidence.publications.map((item) => ({
            title: item.title,
            journal: item.journal,
            year: item.year,
            issn: item.issn,
            indexing: item.indexing,
        })),
        books: evidence.books.map((item) => ({
            title: item.title,
            publisher: item.publisher,
            isbn: item.isbn,
            year: item.year,
        })),
        projects: evidence.projects.map((item) => ({
            title: item.title,
            fundingAgency: item.fundingAgency,
            amount: item.amount,
            year: item.year,
        })),
        patents: evidence.patents.map((item) => ({
            title: item.title,
            year: item.year,
            status: item.status,
        })),
        conferences: evidence.conferences.map((item) => ({
            title: item.title,
            organizer: item.organizer,
            year: item.year,
            type: item.type,
        })),
        workshops: evidence.workshops.map((item) => ({
            title: item.title,
            role: item.role,
            level: item.level,
            year: item.year,
        })),
        extensionActivities: evidence.extensionActivities.map((item) => ({
            title: item.title,
            roleOrAudience: item.roleOrAudience,
            year: item.year,
        })),
        collaborations: evidence.collaborations.map((item) => ({
            organization: item.organization,
            purpose: item.purpose,
            year: item.year,
        })),
    };

    if (partial.publications) {
        evidence.publications = uniqueBy(
            [...current.publications, ...partial.publications],
            (item) => `${item.title}-${item.journal}-${item.year}`
        );
    }
    if (partial.books) {
        evidence.books = uniqueBy(
            [...current.books, ...partial.books],
            (item) => `${item.title}-${item.publisher}-${item.year}`
        );
    }
    if (partial.projects) {
        evidence.projects = uniqueBy(
            [...current.projects, ...partial.projects],
            (item) => `${item.title}-${item.fundingAgency}-${item.year}`
        );
    }
    if (partial.patents) {
        evidence.patents = uniqueBy(
            [...current.patents, ...partial.patents],
            (item) => `${item.title}-${item.status}-${item.year}`
        );
    }
    if (partial.conferences) {
        evidence.conferences = uniqueBy(
            [...current.conferences, ...partial.conferences],
            (item) => `${item.title}-${item.year}`
        );
    }
    if (partial.workshops) {
        evidence.workshops = uniqueBy(
            [...current.workshops, ...partial.workshops],
            (item) => `${item.title}-${item.year}`
        );
    }
    if (partial.extensionActivities) {
        evidence.extensionActivities = uniqueBy(
            [...current.extensionActivities, ...partial.extensionActivities],
            (item) => `${item.title}-${item.year}`
        );
    }
    if (partial.collaborations) {
        evidence.collaborations = uniqueBy(
            [...current.collaborations, ...partial.collaborations],
            (item) => `${item.organization}-${item.purpose}-${item.year}`
        );
    }

    await evidence.save();
    return evidence;
}

export async function syncEvidenceFromCas(facultyId: string, input: CasApplicationInput) {
    return mergeEvidence(facultyId, {
        publications: input.achievements.publications,
        books: input.achievements.books,
        projects: input.achievements.researchProjects,
        conferences: Array.from({ length: input.achievements.conferences }).map((_, index) => ({
            title: `CAS Conference Contribution ${index + 1}`,
            year: input.eligibilityPeriod.toYear,
        })),
    });
}

export async function syncEvidenceFromPbas(facultyId: string, input: PbasApplicationInput) {
    return mergeEvidence(facultyId, {
        publications: input.category2.researchPapers,
        books: input.category2.books,
        projects: input.category2.projects,
        patents: input.category2.patents,
        conferences: input.category2.conferences,
        extensionActivities: input.category3.extensionActivities.map((item) => ({
            title: item.title,
            roleOrAudience: item.role,
            year: item.year ?? new Date().getFullYear(),
        })),
    });
}

export async function syncEvidenceFromAqar(facultyId: string, input: AqarApplicationInput) {
    return mergeEvidence(facultyId, {
        publications: input.facultyContribution.researchPapers.map((item) => ({
            title: item.paperTitle,
            journal: item.journalName,
            year: item.publicationYear,
            issn: item.issnNumber,
            indexing: item.indexedIn,
        })),
        books: input.facultyContribution.booksChapters.map((item) => ({
            title: item.titleOfWork,
            publisher: item.publisherName ?? "Not specified",
            isbn: item.isbnIssnNumber,
            year: item.publicationYear ?? new Date().getFullYear(),
        })),
        projects: [
            ...input.facultyContribution.seedMoneyProjects.map((item) => ({
                title: item.schemeOrProjectTitle,
                fundingAgency: item.fundingAgencyName,
                amount: item.fundsInInr ?? 0,
                year: item.awardYear,
            })),
            ...input.facultyContribution.consultancyServices.map((item) => ({
                title: item.consultancyProjectName,
                fundingAgency: item.sponsoringAgencyContact,
                amount: item.revenueGeneratedInInr ?? 0,
                year: item.consultancyYear ?? new Date().getFullYear(),
            })),
        ],
        patents: input.facultyContribution.patents.map((item) => ({
            title: item.title,
            year: item.awardYear ?? new Date().getFullYear(),
            status: item.status,
        })),
        conferences: input.facultyContribution.financialSupport.map((item) => ({
            title: item.conferenceName,
            organizer: item.professionalBodyName,
            year: Number(item.year) || new Date().getFullYear(),
            type: "Financial Support",
        })),
        workshops: input.facultyContribution.facultyDevelopmentProgrammes.map((item) => ({
            title: item.programTitle,
            role: item.organizedBy,
            level: "FDP",
            year: Number(item.year) || new Date().getFullYear(),
        })),
        extensionActivities: input.facultyContribution.eContentDeveloped.map((item) => ({
            title: item.moduleName,
            roleOrAudience: item.platform,
            year: Number(item.academicYear?.slice(0, 4)) || new Date().getFullYear(),
        })),
    });
}

export async function getFacultyEvidenceDefaults(facultyId: string) {
    const evidence = await getOrCreateEvidence(facultyId);

    return {
        cas: {
            publications: evidence.publications.map((item) => ({
                title: item.title,
                journal: item.journal,
                year: item.year,
                issn: item.issn,
                indexing: item.indexing,
            })),
            books: evidence.books.map((item) => ({
                title: item.title,
                publisher: item.publisher,
                isbn: item.isbn,
                year: item.year,
            })),
            researchProjects: evidence.projects.map((item) => ({
                title: item.title,
                fundingAgency: item.fundingAgency,
                amount: item.amount ?? 0,
                year: item.year,
            })),
            conferences: evidence.conferences.length,
        },
        pbas: {
            researchPapers: evidence.publications.map((item) => ({
                title: item.title,
                journal: item.journal,
                year: item.year,
                issn: item.issn,
                indexing: item.indexing,
            })),
            books: evidence.books.map((item) => ({
                title: item.title,
                publisher: item.publisher,
                isbn: item.isbn,
                year: item.year,
            })),
            patents: evidence.patents.map((item) => ({
                title: item.title,
                year: item.year,
                status: item.status,
            })),
            conferences: evidence.conferences.map((item) => ({
                title: item.title,
                organizer: item.organizer,
                year: item.year,
                type: item.type ?? "",
            })),
            projects: evidence.projects.map((item) => ({
                title: item.title,
                fundingAgency: item.fundingAgency,
                amount: item.amount ?? 0,
                year: item.year,
            })),
            extensionActivities: evidence.extensionActivities.map((item) => ({
                title: item.title,
                role: item.roleOrAudience,
                year: item.year,
            })),
        },
        aqar: {
            researchPapers: evidence.publications.map((item) => ({
                paperTitle: item.title,
                journalName: item.journal,
                authors: "",
                publicationYear: item.year,
                issnNumber: item.issn,
                year: String(item.year),
                impactFactor: "",
                indexedIn: item.indexing,
                links: "",
                proof: "",
                ifProof: "",
            })),
            seedMoneyProjects: evidence.projects.map((item) => ({
                schemeOrProjectTitle: item.title,
                principalInvestigatorName: "",
                coInvestigator: "",
                fundingAgencyName: item.fundingAgency,
                fundingAgencyType: "Government" as const,
                awardYear: item.year,
                projectDuration: "",
                fundsInInr: item.amount ?? 0,
                projectCategory: "Minor" as const,
                status: "",
                year: String(item.year),
                proof: "",
            })),
            awardsRecognition: [],
            fellowships: [],
            researchFellows: [],
            patents: evidence.patents.map((item) => ({
                type: "Patent",
                patenterName: "",
                patentNumber: "",
                filingDate: "",
                publishedDate: "",
                title: item.title,
                status: item.status,
                level: "National" as const,
                awardYear: item.year,
                academicYear: `${item.year}-${item.year + 1}`,
                proof: "",
            })),
            phdAwards: [],
            booksChapters: evidence.books.map((item) => ({
                type: "Book",
                titleOfWork: item.title,
                titleOfChapter: "",
                paperTitle: "",
                translationWork: "",
                proceedingsTitle: "",
                conferenceName: "",
                level: "National" as const,
                publicationYear: item.year,
                isbnIssnNumber: item.isbn,
                affiliationInstitute: "",
                publisherName: item.publisher,
                academicYear: `${item.year}-${item.year + 1}`,
                proof: "",
            })),
            eContentDeveloped: [],
            consultancyServices: [],
            financialSupport: evidence.conferences.map((item) => ({
                conferenceName: item.title,
                professionalBodyName: item.organizer,
                amountOfSupport: 0,
                panNo: "",
                year: String(item.year),
                proof: "",
            })),
            facultyDevelopmentProgrammes: evidence.workshops.map((item) => ({
                programTitle: item.title,
                organizedBy: item.role ?? "",
                durationFrom: "",
                durationTo: "",
                year: String(item.year),
                proof: "",
            })),
        },
    };
}

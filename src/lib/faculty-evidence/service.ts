import dbConnect from "@/lib/dbConnect";
import User from "@/models/core/user";
import FacultyEvidence from "@/models/core/faculty-evidence";
import Event from "@/models/reference/event";
import SocialProgram from "@/models/reference/social-program";
import FacultyBook from "@/models/faculty/faculty-book";
import FacultyEventParticipation from "@/models/faculty/faculty-event-participation";
import FacultyFdpConducted from "@/models/faculty/faculty-fdp-conducted";
import FacultyPatent from "@/models/faculty/faculty-patent";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultySocialExtension from "@/models/faculty/faculty-social-extension";
import { AuthError } from "@/lib/auth/errors";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import { facultyEvidenceSchema } from "@/lib/faculty-evidence/validators";
import type { CasApplicationInput } from "@/lib/cas/validators";
import type { PbasSnapshot } from "@/lib/pbas/validators";
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

function academicYearLabelFromYear(year: number) {
    return `${year}-${year + 1}`;
}

async function getShadowEvidence(userId: string) {
    await dbConnect();

    const user = await User.findById(userId).select("role");
    if (!user || user.role !== "Faculty") {
        throw new AuthError("Faculty evidence profile not found.", 404);
    }

    const evidence =
        (await FacultyEvidence.findOne({ facultyId: userId })) ||
        (await FacultyEvidence.create({
            facultyId: userId,
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

async function ensureEvent(facultyId: string, title: string, organizer?: string, year?: number) {
    const { faculty } = await ensureFacultyContext(facultyId);
    let event = await Event.findOne({
        title,
        institutionId: faculty.institutionId,
        departmentId: faculty.departmentId,
        eventType: "Conference",
    });

    if (!event) {
        event = await Event.create({
            title,
            eventType: "Conference",
            organizedBy: organizer || faculty.designation || "Faculty",
            startDate: year ? new Date(year, 0, 1) : undefined,
            institutionId: faculty.institutionId,
            departmentId: faculty.departmentId,
        });
    }

    return event;
}

async function ensureSocialProgram(name: string) {
    let program = await SocialProgram.findOne({ name, type: "Extension" });

    if (!program) {
        program = await SocialProgram.create({ name, type: "Extension" });
    }

    return program;
}

async function buildEvidenceState(userId: string) {
    const { faculty } = await ensureFacultyContext(userId);
    const shadowEvidence = await getShadowEvidence(userId);

    const [publications, books, projects, patents, conferences, workshops, extensions] =
        await Promise.all([
            FacultyPublication.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyBook.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyResearchProject.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyPatent.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyEventParticipation.find({ facultyId: faculty._id })
                .populate("eventId", "title organizedBy startDate eventType")
                .sort({ updatedAt: -1 }),
            FacultyFdpConducted.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultySocialExtension.find({ facultyId: faculty._id })
                .populate("programId", "name")
                .sort({ updatedAt: -1 }),
        ]);

    return {
        publications: uniqueBy(
            [
                ...publications.map((item) => ({
                    title: item.title,
                    journal: item.journalName ?? item.publisher ?? "",
                    year: item.publicationDate?.getFullYear() ?? new Date().getFullYear(),
                    issn: item.isbnIssn,
                    indexing: item.indexedIn,
                })),
                ...shadowEvidence.publications.map((item) => ({
                    title: item.title,
                    journal: item.journal,
                    year: item.year,
                    issn: item.issn,
                    indexing: item.indexing,
                })),
            ],
            (item) => `${item.title}-${item.journal}-${item.year}`
        ),
        books: uniqueBy(
            [
                ...books.map((item) => ({
                    title: item.title,
                    publisher: item.publisher ?? "",
                    isbn: item.isbn,
                    year: item.publicationDate?.getFullYear() ?? new Date().getFullYear(),
                })),
                ...shadowEvidence.books.map((item) => ({
                    title: item.title,
                    publisher: item.publisher,
                    isbn: item.isbn,
                    year: item.year,
                })),
            ],
            (item) => `${item.title}-${item.publisher}-${item.year}`
        ),
        projects: uniqueBy(
            [
                ...projects.map((item) => ({
                    title: item.title,
                    fundingAgency: item.fundingAgency ?? "",
                    amount: item.amountSanctioned,
                    year: item.startDate?.getFullYear() ?? new Date().getFullYear(),
                })),
                ...shadowEvidence.projects.map((item) => ({
                    title: item.title,
                    fundingAgency: item.fundingAgency,
                    amount: item.amount,
                    year: item.year,
                })),
            ],
            (item) => `${item.title}-${item.fundingAgency}-${item.year}`
        ),
        patents: uniqueBy(
            [
                ...patents.map((item) => ({
                    title: item.title,
                    year: item.filingDate?.getFullYear() ?? new Date().getFullYear(),
                    status: item.status,
                })),
                ...shadowEvidence.patents.map((item) => ({
                    title: item.title,
                    year: item.year,
                    status: item.status,
                })),
            ],
            (item) => `${item.title}-${item.status}-${item.year}`
        ),
        conferences: uniqueBy(
            [
                ...conferences.map((item) => ({
                    title: (item.eventId as { title?: string })?.title ?? "Conference",
                    organizer: (item.eventId as { organizedBy?: string })?.organizedBy,
                    year:
                        (item.eventId as { startDate?: Date })?.startDate?.getFullYear() ??
                        new Date().getFullYear(),
                    type: (item.eventId as { eventType?: string })?.eventType ?? "Conference",
                })),
                ...shadowEvidence.conferences.map((item) => ({
                    title: item.title,
                    organizer: item.organizer,
                    year: item.year,
                    type: item.type,
                })),
            ],
            (item) => `${item.title}-${item.year}`
        ),
        workshops: uniqueBy(
            [
                ...workshops.map((item) => ({
                    title: item.title,
                    role: item.sponsoredBy,
                    level: item.level,
                    year: item.startDate?.getFullYear() ?? new Date().getFullYear(),
                })),
                ...shadowEvidence.workshops.map((item) => ({
                    title: item.title,
                    role: item.role,
                    level: item.level,
                    year: item.year,
                })),
            ],
            (item) => `${item.title}-${item.year}`
        ),
        extensionActivities: uniqueBy(
            [
                ...extensions.map((item) => ({
                    title: item.activityName,
                    roleOrAudience: (item.programId as { name?: string })?.name,
                    year: new Date().getFullYear(),
                })),
                ...shadowEvidence.extensionActivities.map((item) => ({
                    title: item.title,
                    roleOrAudience: item.roleOrAudience,
                    year: item.year,
                })),
            ],
            (item) => `${item.title}-${item.year}`
        ),
        collaborations: uniqueBy(
            shadowEvidence.collaborations.map((item) => ({
                organization: item.organization,
                purpose: item.purpose,
                year: item.year,
            })),
            (item) => `${item.organization}-${item.purpose}-${item.year}`
        ),
    };
}

export async function getFacultyEvidence(facultyId: string) {
    return buildEvidenceState(facultyId);
}

export async function saveFacultyEvidence(facultyId: string, rawInput: unknown) {
    const input = facultyEvidenceSchema.parse(rawInput);
    const { faculty } = await ensureFacultyContext(facultyId);
    const shadowEvidence = await getShadowEvidence(facultyId);

    shadowEvidence.publications = uniqueBy(input.publications, (item) => `${item.title}-${item.journal}-${item.year}`);
    shadowEvidence.books = uniqueBy(input.books, (item) => `${item.title}-${item.publisher}-${item.year}`);
    shadowEvidence.projects = uniqueBy(input.projects, (item) => `${item.title}-${item.fundingAgency}-${item.year}`);
    shadowEvidence.patents = uniqueBy(input.patents, (item) => `${item.title}-${item.status}-${item.year}`);
    shadowEvidence.conferences = uniqueBy(input.conferences, (item) => `${item.title}-${item.year}`);
    shadowEvidence.workshops = uniqueBy(input.workshops, (item) => `${item.title}-${item.year}`);
    shadowEvidence.extensionActivities = uniqueBy(input.extensionActivities, (item) => `${item.title}-${item.year}`);
    shadowEvidence.collaborations = uniqueBy(input.collaborations, (item) => `${item.organization}-${item.purpose}-${item.year}`);
    await shadowEvidence.save();

    await Promise.all([
        FacultyPublication.deleteMany({ facultyId: faculty._id }),
        FacultyBook.deleteMany({ facultyId: faculty._id }),
        FacultyResearchProject.deleteMany({ facultyId: faculty._id }),
        FacultyPatent.deleteMany({ facultyId: faculty._id }),
        FacultyEventParticipation.deleteMany({ facultyId: faculty._id }),
        FacultyFdpConducted.deleteMany({ facultyId: faculty._id }),
        FacultySocialExtension.deleteMany({ facultyId: faculty._id }),
    ]);

    for (const item of input.publications) {
        await FacultyPublication.create({
            facultyId: faculty._id,
            title: item.title,
            journalName: item.journal,
            publicationType: item.indexing?.toLowerCase().includes("scopus")
                ? "Scopus"
                : item.indexing?.toLowerCase().includes("web of science")
                  ? "WebOfScience"
                  : "UGC",
            isbnIssn: item.issn || undefined,
            indexedIn: item.indexing || undefined,
            publicationDate: new Date(item.year, 0, 1),
        });
    }

    for (const item of input.books) {
        await FacultyBook.create({
            facultyId: faculty._id,
            title: item.title,
            publisher: item.publisher || undefined,
            isbn: item.isbn || undefined,
            publicationDate: new Date(item.year, 0, 1),
            bookType: "Textbook",
        });
    }

    for (const item of input.projects) {
        await FacultyResearchProject.create({
            facultyId: faculty._id,
            title: item.title,
            fundingAgency: item.fundingAgency || undefined,
            projectType: "Major",
            amountSanctioned: item.amount ?? 0,
            startDate: new Date(item.year, 0, 1),
            status: "Completed",
            principalInvestigator: true,
        });
    }

    for (const item of input.patents) {
        await FacultyPatent.create({
            facultyId: faculty._id,
            title: item.title,
            status:
                item.status === "Granted" || item.status === "Published"
                    ? item.status
                    : "Filed",
            filingDate: new Date(item.year, 0, 1),
        });
    }

    for (const item of input.conferences) {
        const event = await ensureEvent(facultyId, item.title, item.organizer, item.year);
        await FacultyEventParticipation.create({
            facultyId: faculty._id,
            eventId: event._id,
            role: "Participant",
            paperPresented: false,
            organized: false,
        });
    }

    for (const item of input.workshops) {
        await FacultyFdpConducted.create({
            facultyId: faculty._id,
            title: item.title,
            sponsoredBy: item.role || undefined,
            level:
                item.level === "State" || item.level === "National" || item.level === "International"
                    ? item.level
                    : "College",
            startDate: new Date(item.year, 0, 1),
            participantsCount: 0,
        });
    }

    for (const item of input.extensionActivities) {
        const program = await ensureSocialProgram(item.title);
        await FacultySocialExtension.create({
            facultyId: faculty._id,
            programId: program._id,
            activityName: item.title,
            hoursContributed: 0,
        });
    }

    return buildEvidenceState(facultyId);
}

async function mergeEvidence(
    facultyId: string,
    partial: Partial<Awaited<ReturnType<typeof getFacultyEvidence>>>
) {
    const current = await getFacultyEvidence(facultyId);

    return saveFacultyEvidence(facultyId, {
        publications: partial.publications
            ? uniqueBy([...current.publications, ...partial.publications], (item) => `${item.title}-${item.journal}-${item.year}`)
            : current.publications,
        books: partial.books
            ? uniqueBy([...current.books, ...partial.books], (item) => `${item.title}-${item.publisher}-${item.year}`)
            : current.books,
        projects: partial.projects
            ? uniqueBy([...current.projects, ...partial.projects], (item) => `${item.title}-${item.fundingAgency}-${item.year}`)
            : current.projects,
        patents: partial.patents
            ? uniqueBy([...current.patents, ...partial.patents], (item) => `${item.title}-${item.status}-${item.year}`)
            : current.patents,
        conferences: partial.conferences
            ? uniqueBy([...current.conferences, ...partial.conferences], (item) => `${item.title}-${item.year}`)
            : current.conferences,
        workshops: partial.workshops
            ? uniqueBy([...current.workshops, ...partial.workshops], (item) => `${item.title}-${item.year}`)
            : current.workshops,
        extensionActivities: partial.extensionActivities
            ? uniqueBy([...current.extensionActivities, ...partial.extensionActivities], (item) => `${item.title}-${item.year}`)
            : current.extensionActivities,
        collaborations: partial.collaborations
            ? uniqueBy([...current.collaborations, ...partial.collaborations], (item) => `${item.organization}-${item.purpose}-${item.year}`)
            : current.collaborations,
    });
}

export async function syncEvidenceFromCas(facultyId: string, input: CasApplicationInput) {
    return mergeEvidence(facultyId, {
        publications: input.achievements.publications.map((item) => ({
            title: item.title,
            journal: item.journal,
            year: item.year,
            issn: item.issn,
            indexing: item.indexing,
        })),
        books: input.achievements.books.map((item) => ({
            title: item.title,
            publisher: item.publisher,
            isbn: item.isbn,
            year: item.year,
        })),
        projects: input.achievements.researchProjects.map((item) => ({
            title: item.title,
            fundingAgency: item.fundingAgency,
            amount: item.amount,
            year: item.year,
        })),
        conferences: Array.from({ length: input.achievements.conferences }).map((_, index) => ({
            title: `CAS Conference Contribution ${index + 1}`,
            year: input.eligibilityPeriod.toYear,
            organizer: "",
            type: "Conference",
        })),
    });
}

export async function syncEvidenceFromPbas(facultyId: string, input: PbasSnapshot) {
    return mergeEvidence(facultyId, {
        publications: input.category2.researchPapers.map((item) => ({
            title: item.title,
            journal: item.journal,
            year: item.year,
            issn: item.issn,
            indexing: item.indexing,
        })),
        books: input.category2.books.map((item) => ({
            title: item.title,
            publisher: item.publisher,
            isbn: item.isbn,
            year: item.year,
        })),
        projects: input.category2.projects.map((item) => ({
            title: item.title,
            fundingAgency: item.fundingAgency,
            amount: item.amount,
            year: item.year,
        })),
        patents: input.category2.patents.map((item) => ({
            title: item.title,
            year: item.year,
            status: item.status,
        })),
        conferences: input.category2.conferences.map((item) => ({
            title: item.title,
            organizer: item.organizer,
            year: item.year,
            type: item.type,
        })),
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
        projects: input.facultyContribution.seedMoneyProjects.map((item) => ({
            title: item.schemeOrProjectTitle,
            fundingAgency: item.fundingAgencyName,
            amount: item.fundsInInr ?? 0,
            year: item.awardYear,
        })),
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
            level: "National",
            year: Number(item.year) || new Date().getFullYear(),
        })),
        extensionActivities: input.facultyContribution.eContentDeveloped.map((item) => ({
            title: item.moduleName,
            roleOrAudience: item.platform,
            year:
                parseInt(item.academicYear?.slice(0, 4) || "", 10) ||
                new Date().getFullYear(),
        })),
    });
}

export async function getFacultyEvidenceDefaults(facultyId: string) {
    const evidence = await getFacultyEvidence(facultyId);

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
                academicYear: academicYearLabelFromYear(item.year),
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
                academicYear: academicYearLabelFromYear(item.year),
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

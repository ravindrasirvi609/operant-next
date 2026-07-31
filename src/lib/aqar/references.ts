import { Types } from "mongoose";

import AcademicYear from "@/models/reference/academic-year";
import FacultyAward from "@/models/faculty/faculty-award";
import FacultyBook from "@/models/faculty/faculty-book";
import FacultyConsultancy from "@/models/faculty/faculty-consultancy";
import FacultyEcontent from "@/models/faculty/faculty-econtent";
import FacultyPatent from "@/models/faculty/faculty-patent";
import FacultyPhdGuidance from "@/models/faculty/faculty-phd-guidance";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import type { IFacultyAward } from "@/models/faculty/faculty-award";
import type { IFacultyBook } from "@/models/faculty/faculty-book";
import type { IFacultyConsultancy } from "@/models/faculty/faculty-consultancy";
import type { IFacultyEcontent } from "@/models/faculty/faculty-econtent";
import type { IFacultyPatent } from "@/models/faculty/faculty-patent";
import type { IFacultyPhdGuidance } from "@/models/faculty/faculty-phd-guidance";
import type { IFacultyPublication } from "@/models/faculty/faculty-publication";
import type { IFacultyResearchProject } from "@/models/faculty/faculty-research-project";
import type {
    IAqarResearchPaper,
    IAqarSeedMoneyProject,
    IAqarAwardRecognition,
    IAqarPatent,
    IAqarPhdAward,
    IAqarBookChapter,
    IAqarEContent,
    IAqarConsultancyService,
} from "@/models/core/aqar-application";

// ---------------------------------------------------------------------------
// Date window helper — same convention as src/lib/pbas/references.ts
// Academic year runs June 1 (yearStart) → May 31 23:59:59 (yearEnd).
// ---------------------------------------------------------------------------

function toAcademicWindow(yearStart: number, yearEnd: number) {
    return {
        start: new Date(Date.UTC(yearStart, 5, 1, 0, 0, 0, 0)),
        end: new Date(Date.UTC(yearEnd, 4, 31, 23, 59, 59, 999)),
    };
}

// ---------------------------------------------------------------------------
// Import context type
// ---------------------------------------------------------------------------

export type AqarImportContext = {
    publications: IFacultyPublication[];
    researchProjects: IFacultyResearchProject[];
    awards: IFacultyAward[];
    patents: IFacultyPatent[];
    phdGuidance: IFacultyPhdGuidance[];
    books: IFacultyBook[];
    econtent: IFacultyEcontent[];
    consultancies: IFacultyConsultancy[];
};

// ---------------------------------------------------------------------------
// Context loader
// ---------------------------------------------------------------------------

/** Load all faculty workspace records relevant to a given academic year for AQAR contribution pre-fill. */
export async function loadAqarImportContext(
    facultyId: Types.ObjectId,
    academicYearId: Types.ObjectId
): Promise<AqarImportContext> {
    const academicYear = await AcademicYear.findById(academicYearId)
        .select("yearStart yearEnd")
        .lean();

    if (!academicYear) {
        throw new Error("Academic year not found.");
    }

    const { start, end } = toAcademicWindow(academicYear.yearStart, academicYear.yearEnd);
    const { yearStart, yearEnd } = academicYear;

    const dateWindowOr = (dateField: string) => ({
        $or: [
            { [dateField]: { $gte: start, $lte: end } },
            { [dateField]: { $exists: false } },
            { [dateField]: null },
        ],
    });

    const [
        publications,
        researchProjects,
        awards,
        patents,
        phdGuidance,
        books,
        econtent,
        consultancies,
    ] = await Promise.all([
        FacultyPublication.find({
            facultyId,
            publicationType: { $ne: "Book" },
            ...dateWindowOr("publicationDate"),
        })
            .sort({ updatedAt: -1 })
            .lean(),

        FacultyResearchProject.find({
            facultyId,
            $or: [
                { startDate: { $gte: start, $lte: end } },
                { endDate: { $gte: start, $lte: end } },
                { startDate: { $exists: false }, endDate: { $exists: false } },
                { startDate: null, endDate: null },
            ],
        })
            .sort({ updatedAt: -1 })
            .lean(),

        FacultyAward.find({
            facultyId,
            ...dateWindowOr("awardDate"),
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

        FacultyPhdGuidance.find({
            facultyId,
            $or: [
                { completionYear: { $gte: yearStart, $lte: yearEnd } },
                { status: "ongoing", registrationYear: { $lte: yearEnd } },
            ],
        })
            .sort({ updatedAt: -1 })
            .lean(),

        FacultyBook.find({
            facultyId,
            ...dateWindowOr("publicationDate"),
        })
            .sort({ updatedAt: -1 })
            .lean(),

        FacultyEcontent.find({ facultyId, academicYearId })
            .sort({ updatedAt: -1 })
            .lean(),

        FacultyConsultancy.find({
            facultyId,
            $or: [
                { startDate: { $gte: start, $lte: end } },
                { endDate: { $gte: start, $lte: end } },
                { startDate: { $exists: false }, endDate: { $exists: false } },
                { startDate: null, endDate: null },
            ],
        })
            .sort({ updatedAt: -1 })
            .lean(),
    ]);

    return {
        publications: publications as unknown as IFacultyPublication[],
        researchProjects: researchProjects as unknown as IFacultyResearchProject[],
        awards: awards as unknown as IFacultyAward[],
        patents: patents as unknown as IFacultyPatent[],
        phdGuidance: phdGuidance as unknown as IFacultyPhdGuidance[],
        books: books as unknown as IFacultyBook[],
        econtent: econtent as unknown as IFacultyEcontent[],
        consultancies: consultancies as unknown as IFacultyConsultancy[],
    };
}

// ---------------------------------------------------------------------------
// Field transform functions
// Unmappable AQAR-only fields (pan, designation, fundingAgencyType, etc.)
// are left as empty string "" — the faculty fills them in manually.
// ---------------------------------------------------------------------------

/** Map a FacultyPublication record to an AQAR researchPapers entry. */
export function mapPublicationToResearchPaper(
    pub: IFacultyPublication,
    facultyName: string
): IAqarResearchPaper {
    // Derive indexing tier from publicationType for the indexedIn field
    const indexingMap: Record<string, string> = {
        Scopus: "Scopus",
        UGC: "UGC CARE",
        WebOfScience: "Web of Science",
    };
    return {
        paperTitle: pub.title,
        journalName: pub.journalName ?? "",
        authors: facultyName,
        publicationYear: pub.publicationDate ? pub.publicationDate.getFullYear() : new Date().getFullYear(),
        issnNumber: pub.isbnIssn ?? "",
        impactFactor: pub.impactFactor != null ? String(pub.impactFactor) : "",
        indexedIn: pub.indexedIn ?? indexingMap[pub.publicationType] ?? "",
        links: pub.doi ?? "",
    };
}

/** Map a FacultyResearchProject record to an AQAR seedMoneyProjects entry. */
export function mapResearchProjectToSeedMoney(
    proj: IFacultyResearchProject,
    facultyName: string
): IAqarSeedMoneyProject {
    const categoryMap: Record<string, "Major" | "Minor"> = {
        Major: "Major",
        Minor: "Minor",
    };
    return {
        schemeOrProjectTitle: proj.title,
        principalInvestigatorName: proj.principalInvestigator ? facultyName : "",
        coInvestigator: "",
        fundingAgencyName: proj.fundingAgency ?? "",
        fundingAgencyType: "Government", // manual classification required
        awardYear: proj.startDate ? proj.startDate.getFullYear() : new Date().getFullYear(),
        fundsInInr: proj.amountSanctioned,
        projectCategory: categoryMap[proj.projectType] ?? undefined,
        status: proj.status,
    };
}

/** Map a FacultyAward record to an AQAR awardsRecognition entry. */
export function mapAwardToAwardRecognition(
    award: IFacultyAward,
    facultyName: string
): IAqarAwardRecognition {
    const levelMap: Record<string, "State" | "National" | "International"> = {
        State: "State",
        National: "National",
        International: "International",
        College: "State", // closest AQAR equivalent
    };
    return {
        teacherName: facultyName,
        awardDate: award.awardDate ? award.awardDate.toISOString().split("T")[0] : "",
        pan: "",
        designation: "",
        awardName: award.title,
        level: levelMap[award.awardLevel ?? "National"] ?? "National",
        awardAgencyName: award.awardingBody ?? "",
        incentiveDetails: "",
    };
}

/** Map a FacultyPatent record to an AQAR patents entry. */
export function mapPatentToAqarPatent(patent: IFacultyPatent, facultyName: string): IAqarPatent {
    return {
        type: patent.status === "Granted" ? "Product" : "Process",
        patenterName: facultyName,
        patentNumber: patent.patentNumber ?? "",
        filingDate: patent.filingDate ? patent.filingDate.toISOString().split("T")[0] : "",
        publishedDate: patent.grantDate ? patent.grantDate.toISOString().split("T")[0] : "",
        title: patent.title,
        status: patent.status,
        level: "National", // manual selection required
        awardYear: patent.grantDate ? patent.grantDate.getFullYear() : undefined,
    };
}

/** Map a FacultyPhdGuidance record to an AQAR phdAwards entry. */
export function mapPhdGuidanceToAqarPhdAward(
    guidance: IFacultyPhdGuidance,
    facultyName: string
): IAqarPhdAward {
    return {
        scholarName: guidance.scholarName,
        departmentName: "",
        guideName: facultyName,
        thesisTitle: guidance.thesisTitle,
        awardStatus: guidance.status === "completed" ? "Awarded" : "Submitted",
        scholarRegistrationYear: guidance.registrationYear,
        awardYear: guidance.completionYear,
    };
}

/** Map a FacultyBook record to an AQAR booksChapters entry. */
export function mapBookToAqarBookChapter(book: IFacultyBook): IAqarBookChapter {
    return {
        type: book.bookType,
        titleOfWork: book.title,
        publisherName: book.publisher ?? "",
        isbnIssnNumber: book.isbn ?? "",
        publicationYear: book.publicationDate ? book.publicationDate.getFullYear() : undefined,
    };
}

/** Map a FacultyEcontent record to an AQAR eContentDeveloped entry. */
export function mapEcontentToAqarEContent(
    econtent: IFacultyEcontent,
    academicYearLabel: string
): IAqarEContent {
    return {
        moduleName: econtent.title,
        creationType: econtent.contentType,
        platform: econtent.platform,
        academicYear: academicYearLabel,
        linkToContent: econtent.url ?? "",
    };
}

/** Map a FacultyConsultancy record to an AQAR consultancyServices entry. */
export function mapConsultancyToAqarConsultancy(
    consult: IFacultyConsultancy,
    facultyName: string
): IAqarConsultancyService {
    return {
        consultantName: facultyName,
        consultancyProjectName: consult.projectTitle,
        sponsoringAgencyContact: consult.clientName,
        consultancyYear: consult.startDate ? consult.startDate.getFullYear() : undefined,
        revenueGeneratedInInr: consult.revenueGenerated,
    };
}

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------

/** Build a partial AQAR facultyContribution object pre-filled from faculty workspace records. */
export function buildAqarImportPayload(
    context: AqarImportContext,
    facultyName: string,
    academicYearLabel: string
) {
    return {
        researchPapers: context.publications.map((p) =>
            mapPublicationToResearchPaper(p, facultyName)
        ),
        seedMoneyProjects: context.researchProjects.map((p) =>
            mapResearchProjectToSeedMoney(p, facultyName)
        ),
        awardsRecognition: context.awards.map((a) =>
            mapAwardToAwardRecognition(a, facultyName)
        ),
        patents: context.patents.map((p) => mapPatentToAqarPatent(p, facultyName)),
        phdAwards: context.phdGuidance.map((g) =>
            mapPhdGuidanceToAqarPhdAward(g, facultyName)
        ),
        booksChapters: context.books.map(mapBookToAqarBookChapter),
        eContentDeveloped: context.econtent.map((e) =>
            mapEcontentToAqarEContent(e, academicYearLabel)
        ),
        consultancyServices: context.consultancies.map((c) =>
            mapConsultancyToAqarConsultancy(c, facultyName)
        ),
    };
}

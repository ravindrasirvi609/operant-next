import { getFacultyWorkspace } from "@/lib/faculty/service";

type AcademicYearRange = {
    label: string;
    startYear: number;
    endYear: number;
    startDate: Date;
    endDate: Date;
};

function academicYearLabelFromYear(year: number) {
    return `${year}-${year + 1}`;
}

function parseAcademicYearRange(academicYear?: string): AcademicYearRange | null {
    const value = String(academicYear ?? "").trim();
    const match = value.match(/(\d{4})\D+(\d{2,4})/);

    if (!match) {
        return null;
    }

    const startYear = Number(match[1]);
    const rawEndYear = Number(match[2]);
    const endYear =
        rawEndYear < 100
            ? Number(`${String(startYear).slice(0, 2)}${String(rawEndYear).padStart(2, "0")}`)
            : rawEndYear;

    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
        return null;
    }

    return {
        label: value,
        startYear,
        endYear,
        startDate: new Date(Date.UTC(startYear, 5, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(endYear, 4, 31, 23, 59, 59, 999)),
    };
}

function parseDate(value?: string | null) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function yearInRange(year: number | undefined, range: AcademicYearRange | null) {
    if (!range || !year) {
        return true;
    }

    return year >= range.startYear && year <= range.endYear;
}

function dateInRange(value: string | undefined, range: AcademicYearRange | null) {
    if (!range) {
        return true;
    }

    const parsed = parseDate(value);
    if (!parsed) {
        return false;
    }

    return parsed >= range.startDate && parsed <= range.endDate;
}

function overlapsRange(
    startValue: string | undefined,
    endValue: string | undefined,
    range: AcademicYearRange | null
) {
    if (!range) {
        return true;
    }

    const startDate = parseDate(startValue);
    const endDate = parseDate(endValue);

    if (startDate && endDate) {
        return startDate <= range.endDate && endDate >= range.startDate;
    }

    if (startDate) {
        return startDate <= range.endDate;
    }

    if (endDate) {
        return endDate >= range.startDate;
    }

    return false;
}

function academicYearMatches(value: string | undefined, range: AcademicYearRange | null) {
    if (!range) {
        return true;
    }

    return String(value ?? "").trim() === range.label;
}

function toAcademicYearYear(value?: string | null) {
    const parsed = parseDate(value);
    return parsed ? parsed.getUTCFullYear() : new Date().getUTCFullYear();
}

export async function getFacultyReportDefaults(
    facultyId: string,
    options?: { academicYear?: string }
) {
    const { user, faculty, facultyRecord } = await getFacultyWorkspace(facultyId);
    const range = parseAcademicYearRange(options?.academicYear);
    const currentYear = range?.startYear ?? new Date().getFullYear();

    const publications = facultyRecord.publications.filter((item) =>
        dateInRange(item.publicationDate, range)
    );
    const books = facultyRecord.books.filter((item) =>
        dateInRange(item.publicationDate, range)
    );
    const researchProjects = facultyRecord.researchProjects.filter((item) =>
        overlapsRange(item.startDate, item.endDate, range)
    );
    const awards = facultyRecord.awards.filter((item) =>
        dateInRange(item.awardDate, range)
    );
    const patents = facultyRecord.patents.filter((item) =>
        dateInRange(item.grantDate, range) || dateInRange(item.filingDate, range)
    );
    const phdAwards = facultyRecord.phdGuidances.filter((item) =>
        yearInRange(item.completionYear, range) || yearInRange(item.registrationYear, range)
    );
    const econtents = facultyRecord.econtents.filter((item) =>
        academicYearMatches(item.academicYear, range)
    );
    const consultancies = facultyRecord.consultancies.filter((item) =>
        overlapsRange(item.startDate, item.endDate, range)
    );
    const conferences = facultyRecord.eventParticipations.filter(
        (item) => item.eventType === "Conference" && dateInRange(item.startDate, range)
    );
    const fdps = facultyRecord.facultyDevelopmentProgrammes.filter((item) =>
        overlapsRange(item.startDate, item.endDate, range)
    );

    return {
        cas: {
            publications: publications.map((item) => ({
                title: item.title,
                journal: item.journalName || item.publisher || "",
                year: item.publicationDate ? new Date(item.publicationDate).getFullYear() : currentYear,
                issn: item.isbnIssn,
                indexing: item.indexedIn,
            })),
            books: books.map((item) => ({
                title: item.title,
                publisher: item.publisher,
                isbn: item.isbn,
                year: item.publicationDate ? new Date(item.publicationDate).getFullYear() : currentYear,
            })),
            researchProjects: researchProjects.map((item) => ({
                title: item.title,
                fundingAgency: item.fundingAgency,
                amount: item.amountSanctioned ?? 0,
                year: item.startDate ? new Date(item.startDate).getFullYear() : currentYear,
            })),
            phdGuided: phdAwards.filter((item) => item.status === "completed").length,
            conferences: conferences.length,
        },
        aqar: {
            researchPapers: publications.map((item) => ({
                paperTitle: item.title,
                journalName: item.journalName || item.publisher || "",
                authors: user.name,
                publicationYear: item.publicationDate ? new Date(item.publicationDate).getFullYear() : currentYear,
                issnNumber: item.isbnIssn,
                year: range?.label ?? academicYearLabelFromYear(toAcademicYearYear(item.publicationDate)),
                impactFactor: item.impactFactor ? String(item.impactFactor) : "",
                indexedIn: item.indexedIn,
                links: item.doi || "",
                proof: "",
                ifProof: "",
            })),
            seedMoneyProjects: researchProjects.map((item) => ({
                schemeOrProjectTitle: item.title,
                principalInvestigatorName: item.principalInvestigator || user.name,
                coInvestigator: "",
                fundingAgencyName: item.fundingAgency,
                fundingAgencyType: "Government" as const,
                awardYear: item.startDate ? new Date(item.startDate).getFullYear() : currentYear,
                projectDuration:
                    item.startDate && item.endDate ? `${item.startDate} to ${item.endDate}` : "",
                fundsInInr: item.amountSanctioned ?? 0,
                projectCategory: item.projectType === "Major" ? ("Major" as const) : ("Minor" as const),
                status: item.status,
                year: range?.label ?? academicYearLabelFromYear(toAcademicYearYear(item.startDate)),
                proof: "",
            })),
            awardsRecognition: awards.map((item) => ({
                teacherName: user.name,
                awardDate: item.awardDate || "",
                pan: "",
                designation: faculty.designation || user.designation || "",
                awardName: item.title,
                level:
                    item.awardLevel === "State"
                        ? "State"
                        : item.awardLevel === "International"
                          ? "International"
                          : "National",
                awardAgencyName: item.awardingBody || "",
                incentiveDetails: "",
                year: range?.label ?? academicYearLabelFromYear(toAcademicYearYear(item.awardDate)),
                proof: "",
            })),
            fellowships: [],
            researchFellows: [],
            patents: patents.map((item) => ({
                type: "Patent",
                patenterName: user.name,
                patentNumber: item.patentNumber || "",
                filingDate: item.filingDate || "",
                publishedDate: item.grantDate || "",
                title: item.title,
                status: item.status,
                level: "National" as const,
                awardYear: item.grantDate ? new Date(item.grantDate).getFullYear() : currentYear,
                academicYear: range?.label ?? academicYearLabelFromYear(toAcademicYearYear(item.grantDate || item.filingDate)),
                proof: "",
            })),
            phdAwards: phdAwards.map((item) => ({
                scholarName: item.scholarName,
                departmentName: user.department || "",
                guideName: user.name,
                thesisTitle: item.thesisTitle,
                registrationDate: "",
                gender: "",
                category: "",
                degree: "",
                awardStatus: item.status === "completed" ? ("Awarded" as const) : ("Submitted" as const),
                scholarRegistrationYear: item.registrationYear,
                awardYear: item.completionYear,
                year: range?.label ?? academicYearLabelFromYear(item.completionYear || item.registrationYear || currentYear),
                proof: "",
            })),
            booksChapters: books.map((item) => ({
                type: item.bookType === "Chapter" ? "Book Chapter" : "Book",
                titleOfWork: item.title,
                titleOfChapter: "",
                paperTitle: "",
                translationWork: "",
                proceedingsTitle: "",
                conferenceName: "",
                level: "National" as const,
                publicationYear: item.publicationDate ? new Date(item.publicationDate).getFullYear() : currentYear,
                isbnIssnNumber: item.isbn,
                affiliationInstitute: user.collegeName || "",
                publisherName: item.publisher,
                academicYear: range?.label ?? academicYearLabelFromYear(toAcademicYearYear(item.publicationDate)),
                proof: "",
            })),
            eContentDeveloped: econtents.map((item) => ({
                moduleName: item.title,
                creationType: item.contentType,
                platform: item.platform,
                academicYear: item.academicYear || range?.label || "",
                linkToContent: item.url,
                proof: "",
            })),
            consultancyServices: consultancies.map((item) => ({
                consultantName: user.name,
                consultancyProjectName: item.projectTitle,
                sponsoringAgencyContact: item.clientName,
                consultancyYear: item.startDate ? new Date(item.startDate).getFullYear() : currentYear,
                revenueGeneratedInInr: item.revenueGenerated ?? 0,
                year: range?.label ?? academicYearLabelFromYear(toAcademicYearYear(item.startDate)),
                proof: "",
            })),
            financialSupport: conferences.map((item) => ({
                conferenceName: item.title,
                professionalBodyName: item.organizer,
                amountOfSupport: 0,
                panNo: "",
                year: range?.label ?? academicYearLabelFromYear(toAcademicYearYear(item.startDate)),
                proof: "",
            })),
            facultyDevelopmentProgrammes: fdps.map((item) => ({
                programTitle: item.title,
                organizedBy: item.sponsoredBy || "",
                durationFrom: item.startDate || "",
                durationTo: item.endDate || "",
                year: range?.label ?? academicYearLabelFromYear(toAcademicYearYear(item.startDate)),
                proof: "",
            })),
        },
    };
}

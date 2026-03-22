import { getFacultyWorkspace } from "@/lib/faculty/service";

function academicYearLabelFromYear(year: number) {
    return `${year}-${year + 1}`;
}

export async function getFacultyReportDefaults(facultyId: string) {
    const { facultyRecord } = await getFacultyWorkspace(facultyId);

    return {
        cas: {
            publications: facultyRecord.publications.map((item) => ({
                title: item.title,
                journal: item.journalName || item.publisher || "",
                year: item.publicationDate ? new Date(item.publicationDate).getFullYear() : new Date().getFullYear(),
                issn: item.isbnIssn,
                indexing: item.indexedIn,
            })),
            books: facultyRecord.books.map((item) => ({
                title: item.title,
                publisher: item.publisher,
                isbn: item.isbn,
                year: item.publicationDate ? new Date(item.publicationDate).getFullYear() : new Date().getFullYear(),
            })),
            researchProjects: facultyRecord.researchProjects.map((item) => ({
                title: item.title,
                fundingAgency: item.fundingAgency,
                amount: item.amountSanctioned ?? 0,
                year: item.startDate ? new Date(item.startDate).getFullYear() : new Date().getFullYear(),
            })),
            phdGuided: facultyRecord.phdGuidances.filter((item) => item.status === "completed").length,
            conferences: facultyRecord.eventParticipations.filter((item) => item.eventType === "Conference").length,
        },
        aqar: {
            researchPapers: facultyRecord.publications.map((item) => ({
                paperTitle: item.title,
                journalName: item.journalName || item.publisher || "",
                authors: "",
                publicationYear: item.publicationDate ? new Date(item.publicationDate).getFullYear() : new Date().getFullYear(),
                issnNumber: item.isbnIssn,
                year: String(item.publicationDate ? new Date(item.publicationDate).getFullYear() : new Date().getFullYear()),
                impactFactor: item.impactFactor ? String(item.impactFactor) : "",
                indexedIn: item.indexedIn,
                links: item.doi || "",
                proof: "",
                ifProof: "",
            })),
            seedMoneyProjects: facultyRecord.researchProjects.map((item) => ({
                schemeOrProjectTitle: item.title,
                principalInvestigatorName: "",
                coInvestigator: "",
                fundingAgencyName: item.fundingAgency,
                fundingAgencyType: "Government" as const,
                awardYear: item.startDate ? new Date(item.startDate).getFullYear() : new Date().getFullYear(),
                projectDuration: "",
                fundsInInr: item.amountSanctioned ?? 0,
                projectCategory: item.projectType === "Major" ? "Major" as const : "Minor" as const,
                status: item.status,
                year: String(item.startDate ? new Date(item.startDate).getFullYear() : new Date().getFullYear()),
                proof: "",
            })),
            awardsRecognition: [],
            fellowships: [],
            researchFellows: [],
            patents: facultyRecord.patents.map((item) => ({
                type: "Patent",
                patenterName: "",
                patentNumber: item.patentNumber || "",
                filingDate: item.filingDate || "",
                publishedDate: item.grantDate || "",
                title: item.title,
                status: item.status,
                level: "National" as const,
                awardYear: item.grantDate ? new Date(item.grantDate).getFullYear() : item.filingDate ? new Date(item.filingDate).getFullYear() : new Date().getFullYear(),
                academicYear: academicYearLabelFromYear(
                    item.grantDate ? new Date(item.grantDate).getFullYear() : item.filingDate ? new Date(item.filingDate).getFullYear() : new Date().getFullYear()
                ),
                proof: "",
            })),
            phdAwards: [],
            booksChapters: facultyRecord.books.map((item) => ({
                typeOfPublication: item.bookType === "Chapter" ? "Book Chapter" as const : "Book",
                titleOfWork: item.title,
                publisherName: item.publisher,
                isbnIssnNumber: item.isbn,
                publicationYear: item.publicationDate ? new Date(item.publicationDate).getFullYear() : new Date().getFullYear(),
                level: "National" as const,
                academicYear: academicYearLabelFromYear(
                    item.publicationDate ? new Date(item.publicationDate).getFullYear() : new Date().getFullYear()
                ),
                proof: "",
            })),
            eContentDeveloped: [],
            consultancyServices: [],
            financialSupport: facultyRecord.eventParticipations
                .filter((item) => item.eventType === "Conference")
                .map((item) => ({
                    teacherName: "",
                    conferenceName: item.title,
                    titleOfPaper: item.paperTitle || "",
                    professionalBodyName: item.organizer,
                    amountInInr: 0,
                    year: String(item.startDate ? new Date(item.startDate).getFullYear() : new Date().getFullYear()),
                    proof: "",
                })),
            facultyDevelopmentProgrammes: facultyRecord.facultyDevelopmentProgrammes.map((item) => ({
                programTitle: item.title,
                organizedBy: item.sponsoredBy || "",
                durationFrom: item.startDate || "",
                durationTo: item.endDate || "",
                year: item.startDate ? String(new Date(item.startDate).getFullYear()) : "",
                proof: "",
            })),
        },
    };
}

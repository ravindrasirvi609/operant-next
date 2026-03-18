import dbConnect from "@/lib/dbConnect";
import { facultyRecordSchema } from "@/lib/faculty/validators";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import AcademicYear from "@/models/reference/academic-year";
import Event from "@/models/reference/event";
import Course from "@/models/academic/course";
import Program from "@/models/academic/program";
import Semester from "@/models/reference/semester";
import SocialProgram from "@/models/reference/social-program";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultyBook from "@/models/faculty/faculty-book";
import FacultyEventParticipation from "@/models/faculty/faculty-event-participation";
import FacultyFdpConducted from "@/models/faculty/faculty-fdp-conducted";
import FacultyInstitutionalContribution from "@/models/faculty/faculty-institutional-contribution";
import FacultyPatent from "@/models/faculty/faculty-patent";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultyResultSummary from "@/models/faculty/faculty-result-summary";
import FacultySocialExtension from "@/models/faculty/faculty-social-extension";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";
import FacultyTeachingSummary from "@/models/faculty/faculty-teaching-summary";

function toDateInput(value?: Date | null) {
    if (!value) {
        return "";
    }

    return value.toISOString().slice(0, 10);
}

function toAcademicYearLabel(yearStart?: number, yearEnd?: number) {
    if (!yearStart || !yearEnd) {
        return "";
    }

    return `${yearStart}-${yearEnd}`;
}

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

async function ensureProgram(
    institutionId: string,
    departmentId: string,
    programName: string
) {
    let program = await Program.findOne({
        institutionId,
        departmentId,
        name: programName,
    });

    if (!program) {
        program = await Program.create({
            name: programName,
            institutionId,
            departmentId,
            degreeType: programName,
            durationYears: 4,
            type: "Regular",
            isCBCS: true,
            isActive: true,
        });
    }

    return program;
}

async function ensureSocialProgram(name: string) {
    let program = await SocialProgram.findOne({ name, type: "Extension" });

    if (!program) {
        program = await SocialProgram.create({ name, type: "Extension" });
    }

    return program;
}

async function ensureSemesterMapping(
    programId: string,
    academicYearId: string,
    semesterNumber: number
) {
    let semester = await Semester.findOne({
        programId,
        academicYearId,
        semesterNumber,
    });

    if (!semester) {
        semester = await Semester.create({
            programId,
            academicYearId,
            semesterNumber,
        });
    }

    return semester;
}

async function ensureCourse(
    programId: string,
    semesterId: string,
    courseName: string,
    subjectCode?: string
) {
    let course = await Course.findOne({
        programId,
        semesterId,
        $or: [
            ...(subjectCode ? [{ subjectCode }] : []),
            { name: courseName },
        ],
    });

    if (!course) {
        course = await Course.create({
            name: courseName,
            subjectCode: subjectCode || undefined,
            courseType: "Theory",
            credits: 0,
            isActive: true,
            programId,
            semesterId,
        });
    }

    return course;
}

async function ensureEvent(
    institutionId: string,
    departmentId: string,
    input: {
        title: string;
        organizer: string;
        eventType: "Seminar" | "Workshop" | "Conference" | "Symposium" | "Webinar" | "Other";
        level: "College" | "State" | "National" | "International";
        startDate?: string;
        endDate?: string;
        location?: string;
    }
) {
    let event = await Event.findOne({
        institutionId,
        departmentId,
        title: input.title,
        eventType: input.eventType,
        organizedBy: input.organizer,
    });

    if (!event) {
        event = await Event.create({
            title: input.title,
            eventType: input.eventType,
            organizedBy: input.organizer,
            level: input.level,
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
            location: input.location || undefined,
            institutionId,
            departmentId,
        });
    }

    return event;
}

export async function getFacultyWorkspace(userId: string) {
    await dbConnect();

    const { user, faculty } = await ensureFacultyContext(userId);

    const academicYears = await AcademicYear.find({})
        .sort({ yearStart: -1, yearEnd: -1 })
        .select("yearStart yearEnd")
        .lean();

    const programMasters = await Program.find({
        institutionId: faculty.institutionId,
        departmentId: faculty.departmentId,
        isActive: true,
    })
        .select("name")
        .sort({ name: 1 })
        .lean();

    const programIds = programMasters.map((item) => item._id);
    const courseMasters = await Course.find({
        programId: { $in: programIds },
        isActive: true,
    })
        .populate("programId", "name")
        .select("name subjectCode programId")
        .sort({ name: 1 })
        .lean();

    const [
        teachingSummaries,
        teachingLoads,
        resultSummaries,
        publications,
        books,
        patents,
        researchProjects,
        eventParticipations,
        administrativeRoles,
        institutionalContributions,
        facultyDevelopmentProgrammes,
        socialExtensionActivities,
    ] =
        await Promise.all([
            FacultyTeachingSummary.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ updatedAt: -1 }),
            FacultyTeachingLoad.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .populate("programId", "name")
                .populate("courseId", "name subjectCode")
                .sort({ updatedAt: -1 }),
            FacultyResultSummary.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ updatedAt: -1 }),
            FacultyPublication.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyBook.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyPatent.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyResearchProject.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyEventParticipation.find({ facultyId: faculty._id })
                .populate("eventId", "title organizedBy eventType level startDate endDate location")
                .sort({ updatedAt: -1 }),
            FacultyAdminRole.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ updatedAt: -1 }),
            FacultyInstitutionalContribution.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ updatedAt: -1 }),
            FacultyFdpConducted.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultySocialExtension.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .populate("programId", "name")
                .sort({ updatedAt: -1 }),
        ]);

    const facultyRecord = {
        employeeCode: faculty.employeeCode ?? "",
        joiningDate: toDateInput(faculty.joiningDate),
        biography: faculty.biography ?? "",
        specialization: faculty.specialization ?? "",
        highestQualification: faculty.highestQualification ?? "",
        employmentType: faculty.employmentType,
        experienceYears: faculty.experienceYears ?? 0,
        researchInterests: faculty.researchInterests ?? [],
        professionalMemberships: faculty.professionalMemberships ?? [],
        certifications: faculty.certifications ?? [],
        administrativeResponsibilities: faculty.administrativeResponsibilities ?? [],
        qualifications: (faculty.qualifications ?? []).map((item) => ({
            level: item.level,
            degree: item.degree,
            subject: item.subject ?? "",
            institution: item.institution ?? "",
            year: item.year ?? "",
        })),
        researchProfile: {
            orcidId: faculty.researchProfile?.orcidId ?? "",
            scopusId: faculty.researchProfile?.scopusId ?? "",
            researcherId: faculty.researchProfile?.researcherId ?? "",
            googleScholarId: faculty.researchProfile?.googleScholarId ?? "",
        },
        teachingSummaries: teachingSummaries.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            classesTaken: item.classesTaken,
            coursePreparationHours: item.coursePreparationHours,
            coursesTaught: item.coursesTaught ?? [],
            mentoringCount: item.mentoringCount,
            labSupervisionCount: item.labSupervisionCount,
            feedbackSummary: item.feedbackSummary ?? "",
        })),
        teachingLoads: teachingLoads.map((item) => ({
            _id: item._id.toString(),
            courseId: item.courseId?.toString() ?? "",
            documentId: item.documentId?.toString() ?? "",
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            programName: (item.programId as { name?: string })?.name ?? "",
            courseName: (item.courseId as { name?: string })?.name ?? item.courseName,
            semester: item.semester,
            subjectCode: (item.courseId as { subjectCode?: string })?.subjectCode ?? item.subjectCode ?? "",
            lectureHours: item.lectureHours,
            tutorialHours: item.tutorialHours,
            practicalHours: item.practicalHours,
            innovativePedagogy: "",
        })),
        resultSummaries: resultSummaries.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            subjectName: item.subjectName,
            appearedStudents: item.appearedStudents,
            passedStudents: item.passedStudents,
            universityRankStudents: item.universityRankStudents,
        })),
        publications: publications.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            title: item.title,
            journalName: item.journalName ?? "",
            publisher: item.publisher ?? "",
            publicationType: item.publicationType,
            impactFactor: item.impactFactor,
            isbnIssn: item.isbnIssn ?? "",
            doi: item.doi ?? "",
            publicationDate: toDateInput(item.publicationDate),
            indexedIn: item.indexedIn ?? "",
            authorPosition: item.authorPosition,
        })),
        books: books.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            title: item.title,
            publisher: item.publisher ?? "",
            isbn: item.isbn ?? "",
            publicationDate: toDateInput(item.publicationDate),
            bookType: item.bookType,
        })),
        patents: patents.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            title: item.title,
            patentNumber: item.patentNumber ?? "",
            status: item.status,
            filingDate: toDateInput(item.filingDate),
            grantDate: toDateInput(item.grantDate),
        })),
        researchProjects: researchProjects.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            title: item.title,
            fundingAgency: item.fundingAgency ?? "",
            projectType: item.projectType,
            amountSanctioned: item.amountSanctioned ?? 0,
            startDate: toDateInput(item.startDate),
            endDate: toDateInput(item.endDate),
            status: item.status,
            principalInvestigator: item.principalInvestigator,
        })),
        eventParticipations: eventParticipations.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            title: (item.eventId as { title?: string })?.title ?? "",
            organizer: (item.eventId as { organizedBy?: string })?.organizedBy ?? "",
            eventType:
                (item.eventId as { eventType?: "Seminar" | "Workshop" | "Conference" | "Symposium" | "Webinar" | "Other" })?.eventType ??
                "Conference",
            level:
                (item.eventId as { level?: "College" | "State" | "National" | "International" })?.level ??
                "College",
            startDate: toDateInput((item.eventId as { startDate?: Date })?.startDate),
            endDate: toDateInput((item.eventId as { endDate?: Date })?.endDate),
            location: (item.eventId as { location?: string })?.location ?? "",
            role: item.role,
            paperPresented: item.paperPresented,
            paperTitle: item.paperTitle ?? "",
            organized: item.organized,
        })),
        administrativeRoles: administrativeRoles.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            roleName: item.roleName,
            committeeName: item.committeeName ?? "",
            responsibilityDescription: item.responsibilityDescription ?? "",
        })),
        institutionalContributions: institutionalContributions.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            activityTitle: item.activityTitle,
            role: item.role,
            impactLevel: item.impactLevel,
            scoreWeightage: item.scoreWeightage ?? 0,
        })),
        facultyDevelopmentProgrammes: facultyDevelopmentProgrammes.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            title: item.title,
            sponsoredBy: item.sponsoredBy ?? "",
            level: item.level,
            startDate: toDateInput(item.startDate),
            endDate: toDateInput(item.endDate),
            participantsCount: item.participantsCount ?? 0,
        })),
        socialExtensionActivities: socialExtensionActivities.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            programName: (item.programId as { name?: string })?.name ?? "",
            activityName: item.activityName,
            hoursContributed: item.hoursContributed ?? 0,
        })),
    };

    return {
        user,
        faculty,
        facultyRecord,
        academicYearOptions: academicYears
            .map((item) => toAcademicYearLabel(item.yearStart, item.yearEnd))
            .filter(Boolean),
        programOptions: programMasters.map((item) => item.name),
        courseOptions: courseMasters.map((item) => ({
            name: item.name,
            subjectCode: item.subjectCode ?? "",
            programName: (item.programId as { name?: string })?.name ?? "",
        })),
    };
}

export async function saveFacultyWorkspace(userId: string, rawInput: unknown) {
    const input = facultyRecordSchema.parse(rawInput);
    const { user, faculty } = await ensureFacultyContext(userId);

    faculty.employeeCode = input.employeeCode?.trim() || faculty.employeeCode;
    faculty.joiningDate = input.joiningDate ? new Date(input.joiningDate) : undefined;
    faculty.biography = input.biography || undefined;
    faculty.specialization = input.specialization || undefined;
    faculty.highestQualification = input.highestQualification || undefined;
    faculty.employmentType = input.employmentType;
    faculty.experienceYears = input.experienceYears;
    faculty.researchInterests = input.researchInterests;
    faculty.professionalMemberships = input.professionalMemberships;
    faculty.certifications = input.certifications;
    faculty.administrativeResponsibilities = input.administrativeResponsibilities;
    faculty.qualifications = input.qualifications.map((item) => ({
        level: item.level,
        degree: item.degree,
        subject: item.subject || undefined,
        institution: item.institution || undefined,
        year: item.year || undefined,
    }));
    faculty.researchProfile = {
        orcidId: input.researchProfile.orcidId || undefined,
        scopusId: input.researchProfile.scopusId || undefined,
        researcherId: input.researchProfile.researcherId || undefined,
        googleScholarId: input.researchProfile.googleScholarId || undefined,
    };
    await faculty.save();

    user.designation = faculty.designation;
    user.department = user.department || undefined;
    user.facultyId = faculty._id;
    await user.save();

    await Promise.all([
        FacultyTeachingSummary.deleteMany({ facultyId: faculty._id }),
        FacultyTeachingLoad.deleteMany({ facultyId: faculty._id }),
        FacultyResultSummary.deleteMany({ facultyId: faculty._id }),
        FacultyPublication.deleteMany({ facultyId: faculty._id }),
        FacultyBook.deleteMany({ facultyId: faculty._id }),
        FacultyPatent.deleteMany({ facultyId: faculty._id }),
        FacultyResearchProject.deleteMany({ facultyId: faculty._id }),
        FacultyEventParticipation.deleteMany({ facultyId: faculty._id }),
        FacultyAdminRole.deleteMany({ facultyId: faculty._id }),
        FacultyInstitutionalContribution.deleteMany({ facultyId: faculty._id }),
        FacultyFdpConducted.deleteMany({ facultyId: faculty._id }),
        FacultySocialExtension.deleteMany({ facultyId: faculty._id }),
    ]);

    for (const entry of input.teachingSummaries) {
        const academicYear = await ensureAcademicYear(entry.academicYear);

        await FacultyTeachingSummary.create({
            facultyId: faculty._id,
            academicYearId: academicYear._id,
            documentId: entry.documentId || undefined,
            classesTaken: entry.classesTaken,
            coursePreparationHours: entry.coursePreparationHours,
            coursesTaught: entry.coursesTaught,
            mentoringCount: entry.mentoringCount,
            labSupervisionCount: entry.labSupervisionCount,
            feedbackSummary: entry.feedbackSummary || undefined,
        });
    }

    for (const entry of input.teachingLoads) {
        const academicYear = await ensureAcademicYear(entry.academicYear);
        const program = await ensureProgram(
            faculty.institutionId.toString(),
            faculty.departmentId.toString(),
            entry.programName
        );
        const semester = await ensureSemesterMapping(
            program._id.toString(),
            academicYear._id.toString(),
            entry.semester
        );
        const course = await ensureCourse(
            program._id.toString(),
            semester._id.toString(),
            entry.courseName,
            entry.subjectCode
        );

        await FacultyTeachingLoad.create({
            facultyId: faculty._id,
            academicYearId: academicYear._id,
            programId: program._id,
            courseId: course._id,
            documentId: entry.documentId || undefined,
            courseName: entry.courseName,
            semester: entry.semester,
            subjectCode: entry.subjectCode || undefined,
            lectureHours: entry.lectureHours,
            tutorialHours: entry.tutorialHours,
            practicalHours: entry.practicalHours,
            totalHours: entry.lectureHours + entry.tutorialHours + entry.practicalHours,
        });
    }

    for (const entry of input.resultSummaries) {
        const academicYear = await ensureAcademicYear(entry.academicYear);
        const appearedStudents = entry.appearedStudents;
        const passedStudents = entry.passedStudents;

        await FacultyResultSummary.create({
            facultyId: faculty._id,
            academicYearId: academicYear._id,
            documentId: entry.documentId || undefined,
            subjectName: entry.subjectName,
            appearedStudents,
            passedStudents,
            resultPercentage:
                appearedStudents > 0 ? Number(((passedStudents / appearedStudents) * 100).toFixed(2)) : 0,
            universityRankStudents: entry.universityRankStudents,
        });
    }

    for (const entry of input.publications) {
        await FacultyPublication.create({
            facultyId: faculty._id,
            documentId: entry.documentId || undefined,
            title: entry.title,
            journalName: entry.journalName || undefined,
            publisher: entry.publisher || undefined,
            publicationType: entry.publicationType,
            impactFactor: entry.impactFactor,
            isbnIssn: entry.isbnIssn || undefined,
            doi: entry.doi || undefined,
            publicationDate: entry.publicationDate ? new Date(entry.publicationDate) : undefined,
            indexedIn: entry.indexedIn || undefined,
            authorPosition: entry.authorPosition,
        });
    }

    for (const entry of input.books) {
        await FacultyBook.create({
            facultyId: faculty._id,
            documentId: entry.documentId || undefined,
            title: entry.title,
            publisher: entry.publisher || undefined,
            isbn: entry.isbn || undefined,
            publicationDate: entry.publicationDate ? new Date(entry.publicationDate) : undefined,
            bookType: entry.bookType,
        });
    }

    for (const entry of input.patents) {
        await FacultyPatent.create({
            facultyId: faculty._id,
            documentId: entry.documentId || undefined,
            title: entry.title,
            patentNumber: entry.patentNumber || undefined,
            status: entry.status,
            filingDate: entry.filingDate ? new Date(entry.filingDate) : undefined,
            grantDate: entry.grantDate ? new Date(entry.grantDate) : undefined,
        });
    }

    for (const entry of input.researchProjects) {
        await FacultyResearchProject.create({
            facultyId: faculty._id,
            documentId: entry.documentId || undefined,
            title: entry.title,
            fundingAgency: entry.fundingAgency || undefined,
            projectType: entry.projectType,
            amountSanctioned: entry.amountSanctioned,
            startDate: entry.startDate ? new Date(entry.startDate) : undefined,
            endDate: entry.endDate ? new Date(entry.endDate) : undefined,
            status: entry.status,
            principalInvestigator: entry.principalInvestigator,
        });
    }

    for (const entry of input.eventParticipations) {
        const event = await ensureEvent(
            faculty.institutionId.toString(),
            faculty.departmentId.toString(),
            {
                title: entry.title,
                organizer: entry.organizer,
                eventType: entry.eventType,
                level: entry.level,
                startDate: entry.startDate,
                endDate: entry.endDate,
                location: entry.location,
            }
        );

        await FacultyEventParticipation.create({
            facultyId: faculty._id,
            eventId: event._id,
            documentId: entry.documentId || undefined,
            role: entry.role,
            paperPresented: entry.paperPresented,
            paperTitle: entry.paperTitle || undefined,
            organized: entry.organized,
        });
    }

    for (const entry of input.administrativeRoles) {
        const academicYear = entry.academicYear ? await ensureAcademicYear(entry.academicYear) : null;

        await FacultyAdminRole.create({
            facultyId: faculty._id,
            academicYearId: academicYear?._id,
            documentId: entry.documentId || undefined,
            roleName: entry.roleName,
            committeeName: entry.committeeName || undefined,
            responsibilityDescription: entry.responsibilityDescription || undefined,
        });
    }

    for (const entry of input.institutionalContributions) {
        const academicYear = await ensureAcademicYear(entry.academicYear);

        await FacultyInstitutionalContribution.create({
            facultyId: faculty._id,
            academicYearId: academicYear._id,
            documentId: entry.documentId || undefined,
            activityTitle: entry.activityTitle,
            role: entry.role,
            impactLevel: entry.impactLevel,
            scoreWeightage: entry.scoreWeightage,
        });
    }

    for (const entry of input.facultyDevelopmentProgrammes) {
        await FacultyFdpConducted.create({
            facultyId: faculty._id,
            documentId: entry.documentId || undefined,
            title: entry.title,
            sponsoredBy: entry.sponsoredBy || undefined,
            level: entry.level,
            startDate: entry.startDate ? new Date(entry.startDate) : undefined,
            endDate: entry.endDate ? new Date(entry.endDate) : undefined,
            participantsCount: entry.participantsCount,
        });
    }

    for (const entry of input.socialExtensionActivities) {
        const academicYear = entry.academicYear ? await ensureAcademicYear(entry.academicYear) : null;
        const program = await ensureSocialProgram(entry.programName);

        await FacultySocialExtension.create({
            facultyId: faculty._id,
            programId: program._id,
            academicYearId: academicYear?._id,
            documentId: entry.documentId || undefined,
            activityName: entry.activityName,
            hoursContributed: entry.hoursContributed,
        });
    }

    const workspace = await getFacultyWorkspace(userId);

    return {
        user: workspace.user,
        facultyRecord: workspace.facultyRecord,
        message: "Faculty profile data saved successfully.",
    };
}

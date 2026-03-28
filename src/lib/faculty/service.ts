import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import { normalizeDegreeType } from "@/lib/academic/program-classification";
import { formatAcademicYearLabel, parseAcademicYearLabel } from "@/lib/academic-year";
import { AuthError } from "@/lib/auth/errors";
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
import FacultyAqarSummary from "@/models/faculty/faculty-aqar-summary";
import FacultyAward from "@/models/faculty/faculty-award";
import FacultyBook from "@/models/faculty/faculty-book";
import FacultyConsultancy from "@/models/faculty/faculty-consultancy";
import FacultyEcontent from "@/models/faculty/faculty-econtent";
import FacultyEventParticipation from "@/models/faculty/faculty-event-participation";
import FacultyFdpConducted from "@/models/faculty/faculty-fdp-conducted";
import FacultyInstitutionalContribution from "@/models/faculty/faculty-institutional-contribution";
import FacultyKpiAchievement from "@/models/faculty/faculty-kpi-achievement";
import FacultyKpiTarget from "@/models/faculty/faculty-kpi-target";
import FacultyMoocCourse from "@/models/faculty/faculty-mooc-course";
import FacultyPatent from "@/models/faculty/faculty-patent";
import FacultyPhdGuidance from "@/models/faculty/faculty-phd-guidance";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyQualification from "@/models/faculty/faculty-qualification";
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
    return formatAcademicYearLabel(yearStart, yearEnd);
}

export async function listFacultyAcademicYearOptions() {
    await dbConnect();

    const academicYears = await AcademicYear.find({})
        .sort({ yearStart: -1, yearEnd: -1 })
        .select("yearStart yearEnd isActive")
        .lean();

    return academicYears
        .map((item) => ({
            id: item._id.toString(),
            label: toAcademicYearLabel(item.yearStart, item.yearEnd),
            isActive: Boolean(item.isActive),
        }))
        .filter((item) => Boolean(item.label));
}

async function ensureAcademicYear(value: string) {
    const parsed = parseAcademicYearLabel(value);

    if (!parsed) {
        throw new AuthError(`Invalid academic year \"${value}\".`, 400);
    }

    const academicYear = await AcademicYear.findOne({
        yearStart: parsed.start,
        yearEnd: parsed.end,
    });

    if (!academicYear) {
        throw new AuthError(
            `Academic year \"${value}\" is not configured. Add it in Admin > Academics first.`,
            400
        );
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
            degreeType: normalizeDegreeType(programName) ?? "Other",
            durationYears: 4,
            type: "Regular",
            isCBCS: true,
            isActive: true,
        });
    }

    return program;
}

async function ensureSocialProgram(name: string) {
    const program = await SocialProgram.findOne({
        name,
        type: "Extension",
        isActive: { $ne: false },
    });

    if (!program) {
        throw new Error(`Social programme "${name}" is not available in governed reference masters.`);
    }

    return program;
}

async function ensureSemesterMapping(semesterNumber: number) {
    let semester = await Semester.findOne({ semesterNumber });

    if (!semester) {
        semester = await Semester.create({
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
    const normalizedName = courseName.trim();
    const normalizedSubjectCode = subjectCode?.trim() || undefined;

    if (normalizedSubjectCode) {
        return Course.findOneAndUpdate(
            { programId, subjectCode: normalizedSubjectCode },
            {
                $setOnInsert: {
                    name: normalizedName,
                    subjectCode: normalizedSubjectCode,
                    courseType: "Theory",
                    credits: 0,
                    isActive: true,
                    programId,
                    semesterId,
                },
            },
            { upsert: true, returnDocument: "after" }
        );
    }

    let course = await Course.findOne({
        programId,
        semesterId,
        name: normalizedName,
    });

    if (course) {
        return course;
    }

    try {
        course = await Course.create({
            name: normalizedName,
            subjectCode: undefined,
            courseType: "Theory",
            credits: 0,
            isActive: true,
            programId,
            semesterId,
        });

        return course;
    } catch (error) {
        const isDuplicateKeyError =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: number }).code === 11000;

        if (!isDuplicateKeyError) {
            throw error;
        }

        const existing = await Course.findOne({
            programId,
            semesterId,
            name: normalizedName,
        });

        if (!existing) {
            throw error;
        }

        return existing;
    }
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
    const event = await Event.findOne({
        institutionId,
        departmentId,
        title: input.title,
        eventType: input.eventType,
        organizedBy: input.organizer,
        isActive: { $ne: false },
    });

    if (!event) {
        throw new Error(`Event "${input.title}" is not available in governed reference masters.`);
    }

    return event;
}

export async function getFacultyWorkspace(userId: string) {
    await dbConnect();

    const { user, faculty } = await ensureFacultyContext(userId);

    const academicYears = await AcademicYear.find({})
        .sort({ yearStart: -1, yearEnd: -1 })
        .select("yearStart yearEnd isActive")
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
        qualifications,
        teachingSummaries,
        teachingLoads,
        resultSummaries,
        publications,
        books,
        patents,
        researchProjects,
        eventParticipations,
        consultancies,
        awards,
        phdGuidances,
        econtents,
        moocCourses,
        administrativeRoles,
        institutionalContributions,
        facultyDevelopmentProgrammes,
        socialExtensionActivities,
        kpiTargets,
        kpiAchievements,
        aqarSummaries,
    ] =
        await Promise.all([
            FacultyQualification.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
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
            FacultyConsultancy.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyAward.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyPhdGuidance.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
            FacultyEcontent.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ updatedAt: -1 }),
            FacultyMoocCourse.find({ facultyId: faculty._id }).sort({ updatedAt: -1 }),
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
            FacultyKpiTarget.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ updatedAt: -1 }),
            FacultyKpiAchievement.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ updatedAt: -1 }),
            FacultyAqarSummary.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
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
        qualifications: (qualifications ?? []).map((item) => ({
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
        consultancies: consultancies.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            clientName: item.clientName,
            projectTitle: item.projectTitle,
            revenueGenerated: item.revenueGenerated ?? 0,
            startDate: toDateInput(item.startDate),
            endDate: toDateInput(item.endDate),
        })),
        awards: awards.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            title: item.title,
            awardingBody: item.awardingBody ?? "",
            awardLevel: item.awardLevel ?? "College",
            awardDate: toDateInput(item.awardDate),
        })),
        phdGuidances: phdGuidances.map((item) => ({
            _id: item._id.toString(),
            documentId: item.documentId?.toString() ?? "",
            scholarName: item.scholarName,
            universityName: item.universityName,
            registrationYear: item.registrationYear,
            thesisTitle: item.thesisTitle,
            status: item.status,
            completionYear: item.completionYear,
        })),
        econtents: econtents.map((item) => ({
            _id: item._id.toString(),
            title: item.title,
            platform: item.platform,
            url: item.url,
            contentType: item.contentType,
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
        })),
        moocCourses: moocCourses.map((item) => ({
            _id: item._id.toString(),
            certificateDocumentId: item.certificateDocumentId?.toString() ?? "",
            courseName: item.courseName,
            platform: item.platform,
            university: item.university ?? "",
            durationWeeks: item.durationWeeks,
            grade: item.grade ?? "",
            completionDate: toDateInput(item.completionDate),
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
        kpiTargets: kpiTargets.map((item) => ({
            _id: item._id.toString(),
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            researchPublicationsTarget: item.researchPublicationsTarget ?? 0,
            fdpTarget: item.fdpTarget ?? 0,
            consultancyTarget: item.consultancyTarget ?? 0,
            resultTargetPercentage: item.resultTargetPercentage ?? 0,
        })),
        kpiAchievements: kpiAchievements.map((item) => ({
            _id: item._id.toString(),
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            publicationsDone: item.publicationsDone ?? 0,
            fdpConducted: item.fdpConducted ?? 0,
            consultancyGenerated: item.consultancyGenerated ?? 0,
            resultPercentage: item.resultPercentage ?? 0,
            overallKpiScore: item.overallKpiScore ?? 0,
        })),
        aqarSummaries: aqarSummaries.map((item) => ({
            _id: item._id.toString(),
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            teachingScore: item.teachingScore ?? 0,
            researchScore: item.researchScore ?? 0,
            publicationScore: item.publicationScore ?? 0,
            administrativeScore: item.administrativeScore ?? 0,
            extensionScore: item.extensionScore ?? 0,
            awardScore: item.awardScore ?? 0,
            apiTotalScore: item.apiTotalScore ?? 0,
            performanceGrade: item.performanceGrade ?? "",
        })),
    };

    return {
        user,
        faculty,
        facultyRecord,
        academicYearOptions: academicYears
            .map((item) => ({
                id: item._id.toString(),
                label: toAcademicYearLabel(item.yearStart, item.yearEnd),
                isActive: Boolean(item.isActive),
            }))
            .filter((item) => Boolean(item.label)),
        programOptions: programMasters.map((item) => item.name),
        courseOptions: courseMasters.map((item) => ({
            name: item.name,
            subjectCode: item.subjectCode ?? "",
            programName: (item.programId as { name?: string })?.name ?? "",
        })),
    };
}

export async function saveFacultyWorkspace(
    userId: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    const input = facultyRecordSchema.parse(rawInput);
    const previousWorkspace = options?.actor ? await getFacultyWorkspace(userId) : null;
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
        FacultyQualification.deleteMany({ facultyId: faculty._id }),
        FacultyTeachingSummary.deleteMany({ facultyId: faculty._id }),
        FacultyTeachingLoad.deleteMany({ facultyId: faculty._id }),
        FacultyResultSummary.deleteMany({ facultyId: faculty._id }),
        FacultyPublication.deleteMany({ facultyId: faculty._id }),
        FacultyBook.deleteMany({ facultyId: faculty._id }),
        FacultyPatent.deleteMany({ facultyId: faculty._id }),
        FacultyResearchProject.deleteMany({ facultyId: faculty._id }),
        FacultyEventParticipation.deleteMany({ facultyId: faculty._id }),
        FacultyConsultancy.deleteMany({ facultyId: faculty._id }),
        FacultyAward.deleteMany({ facultyId: faculty._id }),
        FacultyPhdGuidance.deleteMany({ facultyId: faculty._id }),
        FacultyEcontent.deleteMany({ facultyId: faculty._id }),
        FacultyMoocCourse.deleteMany({ facultyId: faculty._id }),
        FacultyAdminRole.deleteMany({ facultyId: faculty._id }),
        FacultyInstitutionalContribution.deleteMany({ facultyId: faculty._id }),
        FacultyFdpConducted.deleteMany({ facultyId: faculty._id }),
        FacultySocialExtension.deleteMany({ facultyId: faculty._id }),
    ]);

    for (const entry of input.qualifications) {
        await FacultyQualification.create({
            facultyId: faculty._id,
            level: entry.level,
            degree: entry.degree,
            subject: entry.subject || undefined,
            institution: entry.institution || undefined,
            year: entry.year || undefined,
        });
    }

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

    for (const entry of input.consultancies) {
        await FacultyConsultancy.create({
            facultyId: faculty._id,
            documentId: entry.documentId || undefined,
            clientName: entry.clientName,
            projectTitle: entry.projectTitle,
            revenueGenerated: entry.revenueGenerated,
            startDate: entry.startDate ? new Date(entry.startDate) : undefined,
            endDate: entry.endDate ? new Date(entry.endDate) : undefined,
        });
    }

    for (const entry of input.awards) {
        await FacultyAward.create({
            facultyId: faculty._id,
            documentId: entry.documentId || undefined,
            title: entry.title,
            awardingBody: entry.awardingBody || undefined,
            awardLevel: entry.awardLevel,
            awardDate: entry.awardDate ? new Date(entry.awardDate) : undefined,
        });
    }

    for (const entry of input.phdGuidances) {
        await FacultyPhdGuidance.create({
            facultyId: faculty._id,
            documentId: entry.documentId || undefined,
            scholarName: entry.scholarName,
            universityName: entry.universityName,
            registrationYear: entry.registrationYear,
            thesisTitle: entry.thesisTitle,
            status: entry.status,
            completionYear: entry.completionYear,
        });
    }

    for (const entry of input.econtents) {
        const academicYear = await ensureAcademicYear(entry.academicYear);

        await FacultyEcontent.create({
            facultyId: faculty._id,
            title: entry.title,
            platform: entry.platform,
            url: entry.url,
            contentType: entry.contentType,
            academicYearId: academicYear._id,
        });
    }

    for (const entry of input.moocCourses) {
        await FacultyMoocCourse.create({
            facultyId: faculty._id,
            certificateDocumentId: entry.certificateDocumentId || undefined,
            courseName: entry.courseName,
            platform: entry.platform,
            university: entry.university || undefined,
            durationWeeks: entry.durationWeeks,
            grade: entry.grade || undefined,
            completionDate: new Date(entry.completionDate),
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

    const kpiTargetAcademicYearIds: string[] = [];
    for (const entry of input.kpiTargets) {
        const academicYear = await ensureAcademicYear(entry.academicYear);
        kpiTargetAcademicYearIds.push(academicYear._id.toString());

        await FacultyKpiTarget.findOneAndUpdate(
            {
                facultyId: faculty._id,
                academicYearId: academicYear._id,
            },
            {
                $set: {
                    researchPublicationsTarget: entry.researchPublicationsTarget,
                    fdpTarget: entry.fdpTarget,
                    consultancyTarget: entry.consultancyTarget,
                    resultTargetPercentage: entry.resultTargetPercentage,
                },
            },
            { upsert: true, returnDocument: "after" }
        );
    }

    await FacultyKpiTarget.deleteMany({
        facultyId: faculty._id,
        academicYearId: { $nin: kpiTargetAcademicYearIds },
    });

    const kpiAchievementAcademicYearIds: string[] = [];
    for (const entry of input.kpiAchievements) {
        const academicYear = await ensureAcademicYear(entry.academicYear);
        kpiAchievementAcademicYearIds.push(academicYear._id.toString());

        await FacultyKpiAchievement.findOneAndUpdate(
            {
                facultyId: faculty._id,
                academicYearId: academicYear._id,
            },
            {
                $set: {
                    publicationsDone: entry.publicationsDone,
                    fdpConducted: entry.fdpConducted,
                    consultancyGenerated: entry.consultancyGenerated,
                    resultPercentage: entry.resultPercentage,
                    overallKpiScore: entry.overallKpiScore,
                },
            },
            { upsert: true, returnDocument: "after" }
        );
    }

    await FacultyKpiAchievement.deleteMany({
        facultyId: faculty._id,
        academicYearId: { $nin: kpiAchievementAcademicYearIds },
    });

    const aqarSummaryAcademicYearIds: string[] = [];
    for (const entry of input.aqarSummaries) {
        const academicYear = await ensureAcademicYear(entry.academicYear);
        aqarSummaryAcademicYearIds.push(academicYear._id.toString());

        await FacultyAqarSummary.findOneAndUpdate(
            {
                facultyId: faculty._id,
                academicYearId: academicYear._id,
            },
            {
                $set: {
                    teachingScore: entry.teachingScore,
                    researchScore: entry.researchScore,
                    publicationScore: entry.publicationScore,
                    administrativeScore: entry.administrativeScore,
                    extensionScore: entry.extensionScore,
                    awardScore: entry.awardScore,
                    apiTotalScore: entry.apiTotalScore,
                    performanceGrade: entry.performanceGrade || undefined,
                },
            },
            { upsert: true, returnDocument: "after" }
        );
    }

    await FacultyAqarSummary.deleteMany({
        facultyId: faculty._id,
        academicYearId: { $nin: aqarSummaryAcademicYearIds },
    });

    const workspace = await getFacultyWorkspace(userId);

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "FACULTY_WORKSPACE_SAVE",
            tableName: "faculty_workspace",
            recordId: faculty._id.toString(),
            oldData: previousWorkspace?.facultyRecord,
            newData: workspace.facultyRecord,
            auditContext: options.auditContext,
        });
    }

    return {
        user: workspace.user,
        facultyRecord: workspace.facultyRecord,
        message: "Faculty profile data saved successfully.",
    };
}

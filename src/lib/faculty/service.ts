import dbConnect from "@/lib/dbConnect";
import { facultyRecordSchema } from "@/lib/faculty/validators";
import { ensureFacultyContext } from "@/lib/faculty/migration";
import AcademicYear from "@/models/reference/academic-year";
import Program from "@/models/academic/program";
import SocialProgram from "@/models/reference/social-program";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultyFdpConducted from "@/models/faculty/faculty-fdp-conducted";
import FacultyResultSummary from "@/models/faculty/faculty-result-summary";
import FacultySocialExtension from "@/models/faculty/faculty-social-extension";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";

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

export async function getFacultyWorkspace(userId: string) {
    await dbConnect();

    const { user, faculty } = await ensureFacultyContext(userId);

    const [teachingLoads, resultSummaries, administrativeRoles, facultyDevelopmentProgrammes, socialExtensionActivities] =
        await Promise.all([
            FacultyTeachingLoad.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .populate("programId", "name")
                .sort({ updatedAt: -1 }),
            FacultyResultSummary.find({ facultyId: faculty._id })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ updatedAt: -1 }),
            FacultyAdminRole.find({ facultyId: faculty._id })
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
        teachingLoads: teachingLoads.map((item) => ({
            _id: item._id.toString(),
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            programName: (item.programId as { name?: string })?.name ?? "",
            courseName: item.courseName,
            semester: item.semester,
            subjectCode: item.subjectCode ?? "",
            lectureHours: item.lectureHours,
            tutorialHours: item.tutorialHours,
            practicalHours: item.practicalHours,
            innovativePedagogy: "",
        })),
        resultSummaries: resultSummaries.map((item) => ({
            _id: item._id.toString(),
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            subjectName: item.subjectName,
            appearedStudents: item.appearedStudents,
            passedStudents: item.passedStudents,
            universityRankStudents: item.universityRankStudents,
        })),
        administrativeRoles: administrativeRoles.map((item) => ({
            _id: item._id.toString(),
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            roleName: item.roleName,
            committeeName: item.committeeName ?? "",
            responsibilityDescription: item.responsibilityDescription ?? "",
        })),
        facultyDevelopmentProgrammes: facultyDevelopmentProgrammes.map((item) => ({
            _id: item._id.toString(),
            title: item.title,
            sponsoredBy: item.sponsoredBy ?? "",
            level: item.level,
            startDate: toDateInput(item.startDate),
            endDate: toDateInput(item.endDate),
            participantsCount: item.participantsCount ?? 0,
        })),
        socialExtensionActivities: socialExtensionActivities.map((item) => ({
            _id: item._id.toString(),
            academicYear: toAcademicYearLabel(
                (item.academicYearId as { yearStart?: number })?.yearStart,
                (item.academicYearId as { yearEnd?: number })?.yearEnd
            ),
            programName: (item.programId as { name?: string })?.name ?? "",
            activityName: item.activityName,
            hoursContributed: item.hoursContributed ?? 0,
        })),
    };

    return { user, faculty, facultyRecord };
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
        FacultyTeachingLoad.deleteMany({ facultyId: faculty._id }),
        FacultyResultSummary.deleteMany({ facultyId: faculty._id }),
        FacultyAdminRole.deleteMany({ facultyId: faculty._id }),
        FacultyFdpConducted.deleteMany({ facultyId: faculty._id }),
        FacultySocialExtension.deleteMany({ facultyId: faculty._id }),
    ]);

    for (const entry of input.teachingLoads) {
        const academicYear = await ensureAcademicYear(entry.academicYear);
        const program = await ensureProgram(
            faculty.institutionId.toString(),
            faculty.departmentId.toString(),
            entry.programName
        );

        await FacultyTeachingLoad.create({
            facultyId: faculty._id,
            academicYearId: academicYear._id,
            programId: program._id,
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
            subjectName: entry.subjectName,
            appearedStudents,
            passedStudents,
            resultPercentage:
                appearedStudents > 0 ? Number(((passedStudents / appearedStudents) * 100).toFixed(2)) : 0,
            universityRankStudents: entry.universityRankStudents,
        });
    }

    for (const entry of input.administrativeRoles) {
        const academicYear = entry.academicYear ? await ensureAcademicYear(entry.academicYear) : null;

        await FacultyAdminRole.create({
            facultyId: faculty._id,
            academicYearId: academicYear?._id,
            roleName: entry.roleName,
            committeeName: entry.committeeName || undefined,
            responsibilityDescription: entry.responsibilityDescription || undefined,
        });
    }

    for (const entry of input.facultyDevelopmentProgrammes) {
        await FacultyFdpConducted.create({
            facultyId: faculty._id,
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

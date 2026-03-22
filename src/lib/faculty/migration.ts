import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import Program from "@/models/academic/program";
import User from "@/models/core/user";
import AqarApplication from "@/models/core/aqar-application";
import CasApplication from "@/models/core/cas-application";
import FacultyEvidence from "@/models/core/faculty-evidence";
import FacultyRecord from "@/models/core/faculty-record";
import AcademicYear from "@/models/reference/academic-year";
import Department from "@/models/reference/department";
import Event from "@/models/reference/event";
import Institution from "@/models/reference/institution";
import SocialProgram from "@/models/reference/social-program";
import Faculty from "@/models/faculty/faculty";
import FacultyAdminRole from "@/models/faculty/faculty-admin-role";
import FacultyBook from "@/models/faculty/faculty-book";
import FacultyConsultancy from "@/models/faculty/faculty-consultancy";
import FacultyEventParticipation from "@/models/faculty/faculty-event-participation";
import FacultyFdpConducted from "@/models/faculty/faculty-fdp-conducted";
import FacultyPatent from "@/models/faculty/faculty-patent";
import FacultyPublication from "@/models/faculty/faculty-publication";
import FacultyResearchProject from "@/models/faculty/faculty-research-project";
import FacultySocialExtension from "@/models/faculty/faculty-social-extension";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";

function splitName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] ?? "Faculty",
        lastName: parts.slice(1).join(" ") || undefined,
    };
}

function parseDate(value?: string | Date | null) {
    if (!value) {
        return undefined;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseAcademicYearLabel(value?: string | null) {
    const text = String(value ?? "").trim();
    const match = text.match(/(\d{4})\D+(\d{2,4})/);

    if (!match) {
        return null;
    }

    const start = Number(match[1]);
    const endValue = Number(match[2]);
    const end = endValue < 100 ? Number(`${String(start).slice(0, 2)}${String(endValue).padStart(2, "0")}`) : endValue;

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
    }

    return { start, end };
}

async function ensureInstitution(name?: string | null) {
    const normalizedName = String(name ?? "").trim() || "Institution";
    let institution = await Institution.findOne({ name: normalizedName });

    if (!institution) {
        institution = await Institution.create({ name: normalizedName });
    }

    return institution;
}

async function ensureDepartment(institutionId: Types.ObjectId, name?: string | null) {
    const normalizedName = String(name ?? "").trim() || "Department";
    let department = await Department.findOne({ institutionId, name: normalizedName });

    if (!department) {
        department = await Department.create({ institutionId, name: normalizedName });
    }

    return department;
}

async function ensureAcademicYear(label?: string | null) {
    const parsed = parseAcademicYearLabel(label);
    if (!parsed) {
        return null;
    }

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
    institutionId: Types.ObjectId,
    departmentId: Types.ObjectId,
    name?: string | null
) {
    const normalizedName = String(name ?? "").trim();

    if (!normalizedName) {
        return null;
    }

    let program = await Program.findOne({ departmentId, name: normalizedName });

    if (!program) {
        program = await Program.create({
            name: normalizedName,
            institutionId,
            departmentId,
            degreeType: normalizedName,
            durationYears: 4,
            type: "Regular",
            isCBCS: true,
            isActive: true,
        });
    }

    return program;
}

async function ensureEvent(
    faculty: InstanceType<typeof Faculty>,
    title: string,
    organizer?: string | null,
    year?: number,
    type: "Workshop" | "Conference" = "Conference"
) {
    const startDate = year ? new Date(year, 0, 1) : undefined;
    let event = await Event.findOne({
        title,
        eventType: type,
        institutionId: faculty.institutionId,
        departmentId: faculty.departmentId,
    });

    if (!event) {
        event = await Event.create({
            title,
            eventType: type,
            organizedBy: organizer?.trim() || faculty.departmentId.toString(),
            startDate,
            institutionId: faculty.institutionId,
            departmentId: faculty.departmentId,
        });
    }

    return event;
}

async function ensureSocialProgram(name: string) {
    let program = await SocialProgram.findOne({ name, type: "Extension" });

    if (!program) {
        program = await SocialProgram.create({
            name,
            type: "Extension",
        });
    }

    return program;
}

function sameId(value: unknown, expected: Types.ObjectId) {
    return String(value ?? "") === expected.toString();
}

export async function ensureFacultyContext(userId: string) {
    await dbConnect();

    const user = await User.findById(userId).select("+password");

    if (!user || user.role !== "Faculty") {
        throw new AuthError("Faculty profile not found.", 404);
    }

    const legacyRecord = await FacultyRecord.findOne({ userId: user._id });
    const institution = await ensureInstitution(user.universityName);
    const department = await ensureDepartment(institution._id, user.department);
    const nameParts = splitName(user.name);

    const lookupConditions: Array<Record<string, unknown>> = [{ userId: user._id }];

    if (legacyRecord?.employeeId) {
        lookupConditions.push({ employeeCode: legacyRecord.employeeId });
    }

    if (user.email) {
        lookupConditions.push({ email: user.email.toLowerCase() });
    }

    let faculty =
        (user.facultyId ? await Faculty.findById(user.facultyId) : null) ||
        (await Faculty.findOne({ $or: lookupConditions }));

    if (!faculty) {
        faculty = await Faculty.create({
            userId: user._id,
            employeeCode: legacyRecord?.employeeId || user.email.split("@")[0],
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            email: user.email.toLowerCase(),
            mobile: user.phone,
            designation: user.designation || "Faculty Member",
            joiningDate: parseDate(legacyRecord?.joiningDate),
            employmentType: "Permanent",
            institutionId: institution._id,
            departmentId: department._id,
            biography: legacyRecord?.biography,
            researchInterests: legacyRecord?.researchInterests ?? [],
            professionalMemberships: legacyRecord?.professionalMemberships ?? [],
            certifications: legacyRecord?.certifications ?? [],
            administrativeResponsibilities: legacyRecord?.administrativeResponsibilities ?? [],
            highestQualification:
                legacyRecord?.degrees?.[legacyRecord.degrees.length - 1]?.degree ?? undefined,
            specialization: legacyRecord?.specialization,
            experienceYears: 0,
            status: user.isActive ? "Active" : "Inactive",
        });
    } else {
        let changed = false;

        if (!faculty.userId || !sameId(faculty.userId, user._id)) {
            faculty.userId = user._id;
            changed = true;
        }
        if (!sameId(faculty.institutionId, institution._id)) {
            faculty.institutionId = institution._id;
            changed = true;
        }
        if (!sameId(faculty.departmentId, department._id)) {
            faculty.departmentId = department._id;
            changed = true;
        }
        if (!faculty.email && user.email) {
            faculty.email = user.email.toLowerCase();
            changed = true;
        }
        if (!faculty.mobile && user.phone) {
            faculty.mobile = user.phone;
            changed = true;
        }
        if (!faculty.designation && user.designation) {
            faculty.designation = user.designation;
            changed = true;
        }
        if (!faculty.employeeCode && legacyRecord?.employeeId) {
            faculty.employeeCode = legacyRecord.employeeId;
            changed = true;
        }
        if (!faculty.biography && legacyRecord?.biography) {
            faculty.biography = legacyRecord.biography;
            changed = true;
        }
        if (!(faculty.researchInterests?.length ?? 0) && legacyRecord?.researchInterests?.length) {
            faculty.researchInterests = legacyRecord.researchInterests;
            changed = true;
        }
        if (!(faculty.professionalMemberships?.length ?? 0) && legacyRecord?.professionalMemberships?.length) {
            faculty.professionalMemberships = legacyRecord.professionalMemberships;
            changed = true;
        }
        if (!(faculty.certifications?.length ?? 0) && legacyRecord?.certifications?.length) {
            faculty.certifications = legacyRecord.certifications;
            changed = true;
        }
        if (!(faculty.administrativeResponsibilities?.length ?? 0) && legacyRecord?.administrativeResponsibilities?.length) {
            faculty.administrativeResponsibilities = legacyRecord.administrativeResponsibilities;
            changed = true;
        }
        if (changed) {
            await faculty.save();
        }
    }

    let userChanged = false;
    if (!user.facultyId || !sameId(user.facultyId, faculty._id)) {
        user.facultyId = faculty._id;
        userChanged = true;
    }
    if (!user.institutionId || !sameId(user.institutionId, institution._id)) {
        user.institutionId = institution._id;
        userChanged = true;
    }
    if (!user.departmentId || !sameId(user.departmentId, department._id)) {
        user.departmentId = department._id;
        userChanged = true;
    }
    if (!user.designation && faculty.designation) {
        user.designation = faculty.designation;
        userChanged = true;
    }
    if (userChanged) {
        await user.save();
    }

    await Promise.all([
        CasApplication.updateMany({ facultyId: user._id }, { $set: { facultyId: faculty._id } }),
        AqarApplication.updateMany({ facultyId: user._id }, { $set: { facultyId: faculty._id } }),
    ]);

    if (legacyRecord) {
        for (const entry of legacyRecord.pbasEntries ?? []) {
            const academicYear = await ensureAcademicYear(entry.academicYear);
            if (!academicYear) {
                continue;
            }

            for (const courseName of entry.coursesHandled ?? []) {
                const program = await ensureProgram(institution._id, department._id, courseName);
                if (!program) {
                    continue;
                }

                await FacultyTeachingLoad.updateOne(
                    {
                        facultyId: faculty._id,
                        academicYearId: academicYear._id,
                        programId: program._id,
                        courseName,
                        semester: 1,
                        subjectCode: undefined,
                    },
                    {
                        $set: {
                            lectureHours: entry.teachingHours ?? 0,
                            tutorialHours: 0,
                            practicalHours: entry.labSupervisionCount ?? 0,
                            totalHours:
                                Number(entry.teachingHours ?? 0) +
                                Number(entry.labSupervisionCount ?? 0),
                        },
                    },
                    { upsert: true }
                );
            }

            if (entry.academicYear) {
                await FacultyAdminRole.updateOne(
                    {
                        facultyId: faculty._id,
                        roleName: "Committee Work",
                        academicYearId: academicYear._id,
                        committeeName: entry.committeeWork || "Institutional Committee",
                    },
                    {
                        $set: {
                            responsibilityDescription: [entry.committeeWork, entry.examDuties, entry.studentGuidance]
                                .filter(Boolean)
                                .join(" | "),
                        },
                    },
                    { upsert: true }
                );
            }
        }

        for (const entry of legacyRecord.aqarEntries ?? []) {
            const academicYear = await ensureAcademicYear(entry.academicYear);
            if (!academicYear) {
                continue;
            }

            if (entry.teachingInnovations || entry.studentResults) {
                const program = await ensureProgram(
                    institution._id,
                    department._id,
                    user.department || "General Programme"
                );

                if (program) {
                    await FacultyTeachingLoad.updateOne(
                        {
                            facultyId: faculty._id,
                            academicYearId: academicYear._id,
                            programId: program._id,
                            courseName: "Teaching Innovation Summary",
                            semester: 1,
                            subjectCode: "SUMMARY",
                        },
                        {
                            $set: {
                                lectureHours: 0,
                                tutorialHours: 0,
                                practicalHours: 0,
                                totalHours: 0,
                            },
                        },
                        { upsert: true }
                    );
                }
            }
        }
    }

    const legacyEvidence = await FacultyEvidence.findOne({ facultyId: user._id });

    if (legacyEvidence) {
        for (const item of legacyEvidence.publications) {
            await FacultyPublication.updateOne(
                {
                    facultyId: faculty._id,
                    title: item.title,
                    publicationDate: item.year ? new Date(item.year, 0, 1) : undefined,
                },
                {
                    $set: {
                        journalName: item.journal,
                        publicationType: item.indexing?.toLowerCase().includes("scopus")
                            ? "Scopus"
                            : item.indexing?.toLowerCase().includes("web of science")
                              ? "WebOfScience"
                              : "UGC",
                        isbnIssn: item.issn,
                        indexedIn: item.indexing,
                    },
                },
                { upsert: true }
            );
        }

        for (const item of legacyEvidence.books) {
            await FacultyBook.updateOne(
                {
                    facultyId: faculty._id,
                    title: item.title,
                    publicationDate: item.year ? new Date(item.year, 0, 1) : undefined,
                },
                {
                    $set: {
                        publisher: item.publisher,
                        isbn: item.isbn,
                        bookType: "Textbook",
                    },
                },
                { upsert: true }
            );
        }

        for (const item of legacyEvidence.projects) {
            await FacultyResearchProject.updateOne(
                {
                    facultyId: faculty._id,
                    title: item.title,
                },
                {
                    $set: {
                        fundingAgency: item.fundingAgency,
                        amountSanctioned: item.amount,
                        startDate: item.year ? new Date(item.year, 0, 1) : undefined,
                        status: "Completed",
                        projectType: "Major",
                        principalInvestigator: true,
                    },
                },
                { upsert: true }
            );
        }

        for (const item of legacyEvidence.patents) {
            await FacultyPatent.updateOne(
                {
                    facultyId: faculty._id,
                    title: item.title,
                },
                {
                    $set: {
                        status:
                            item.status === "Granted" || item.status === "Published"
                                ? item.status
                                : "Filed",
                        filingDate: item.year ? new Date(item.year, 0, 1) : undefined,
                    },
                },
                { upsert: true }
            );
        }

        for (const item of legacyEvidence.projects) {
            await FacultyConsultancy.updateOne(
                {
                    facultyId: faculty._id,
                    projectTitle: item.title,
                    clientName: item.fundingAgency,
                },
                {
                    $set: {
                        revenueGenerated: item.amount ?? 0,
                        startDate: item.year ? new Date(item.year, 0, 1) : undefined,
                    },
                },
                { upsert: true }
            );
        }

        for (const item of legacyEvidence.conferences) {
            const event = await ensureEvent(
                faculty,
                item.title,
                item.organizer,
                item.year,
                "Conference"
            );
            await FacultyEventParticipation.updateOne(
                {
                    facultyId: faculty._id,
                    eventId: event._id,
                    role: "Participant",
                },
                {
                    $set: {
                        paperPresented: false,
                        organized: false,
                    },
                },
                { upsert: true }
            );
        }

        for (const item of legacyEvidence.workshops) {
            await FacultyFdpConducted.updateOne(
                {
                    facultyId: faculty._id,
                    title: item.title,
                    startDate: item.year ? new Date(item.year, 0, 1) : undefined,
                },
                {
                    $set: {
                        sponsoredBy: item.role,
                        level:
                            item.level === "State" ||
                            item.level === "National" ||
                            item.level === "International"
                                ? item.level
                                : "College",
                        participantsCount: 0,
                    },
                },
                { upsert: true }
            );
        }

        for (const item of legacyEvidence.extensionActivities) {
            const socialProgram = await ensureSocialProgram(item.title);
            const academicYear = await ensureAcademicYear(
                `${item.year}-${Number(item.year) + 1}`
            );
            await FacultySocialExtension.updateOne(
                {
                    facultyId: faculty._id,
                    programId: socialProgram._id,
                    academicYearId: academicYear?._id,
                    activityName: item.title,
                },
                {
                    $set: {
                        hoursContributed: 0,
                    },
                },
                { upsert: true }
            );
        }
    }

    return {
        user,
        faculty,
        institution,
        department,
    };
}

export async function getFacultyByIds(ids: string[]) {
    await dbConnect();

    const objectIds = ids
        .filter(Boolean)
        .map((id) => new Types.ObjectId(id));

    if (!objectIds.length) {
        return [];
    }

    return Faculty.find({ _id: { $in: objectIds } });
}

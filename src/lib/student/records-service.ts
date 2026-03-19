import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import User from "@/models/core/user";
import MasterData from "@/models/core/master-data";
import Student from "@/models/student/student";
import StudentAcademicRecord from "@/models/student/student-academic-record";
import StudentPublication from "@/models/student/student-publication";
import StudentResearchProject from "@/models/student/student-research-project";
import StudentAward from "@/models/student/student-award";
import StudentSkill from "@/models/student/student-skill";
import StudentSport from "@/models/student/student-sport";
import StudentCulturalParticipation from "@/models/student/student-cultural-participation";
import StudentEventParticipation from "@/models/student/student-event-participation";
import StudentSocialParticipation from "@/models/student/student-social-participation";
import Placement from "@/models/student/placement";
import Internship from "@/models/student/internship";
import Award from "@/models/reference/award";
import Skill from "@/models/reference/skill";
import Sport from "@/models/reference/sport";
import CulturalActivity from "@/models/reference/cultural-activity";
import Event from "@/models/reference/event";
import SocialProgram from "@/models/reference/social-program";
import Semester from "@/models/reference/semester";
import AcademicYear from "@/models/reference/academic-year";
import Program from "@/models/academic/program";
import DocumentModel from "@/models/reference/document";
import type { RecordType } from "./record-validators";
import { recordSchemaMap, recordTypeSchema } from "./record-validators";
import { Types } from "mongoose";

// ── Helpers ──────────────────────────────────────────────────────

// Ensure referenced models are registered before populate calls.
void AcademicYear;

async function resolveStudent(userId: string) {
    const user = await User.findById(userId);
    if (!user || user.role !== "Student") {
        throw new AuthError("Student account not found.", 404);
    }
    const student =
        (user.studentId
            ? await Student.findById(user.studentId)
            : await Student.findOne({ userId: user._id })) ?? null;
    if (!student) {
        throw new AuthError("Student record not found.", 404);
    }
    return { user, student };
}

function toDateOrUndefined(value?: string) {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function readMetaString(meta: Record<string, unknown> | undefined, key: string) {
    const value = meta?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const awardLevelSet = new Set(["College", "State", "National", "International"]);
const skillCategorySet = new Set(["Technical", "SoftSkill", "Domain", "Language", "Other"]);
const eventTypeSet = new Set(["Seminar", "Workshop", "Conference", "Symposium", "Webinar", "Other"]);
const socialProgramTypeSet = new Set(["NSS", "NCC", "Social", "Extension", "Other"]);

function sanitizeEnum(value: string | undefined, allowed: Set<string>) {
    if (!value) return undefined;
    return allowed.has(value) ? value : undefined;
}

function populateIfPathExists<TQuery extends { populate: (path: string, select?: string) => TQuery }>(
    model: { schema?: { path?: (path: string) => unknown } } | null | undefined,
    query: TQuery,
    path: string,
    select?: string
): TQuery {
    if (model?.schema?.path?.(path)) {
        return query.populate(path, select);
    }
    return query;
}

async function resolveMasterData(
    id: string,
    categories: string[]
) {
    if (!Types.ObjectId.isValid(id)) return null;
    return MasterData.findOne({
        _id: id,
        category: { $in: categories },
        isActive: true,
    }).lean();
}

async function resolveDocumentId(documentId?: string, userId?: string) {
    if (!documentId) return undefined;
    const doc = await DocumentModel.findOne({
        _id: documentId,
        ...(userId ? { uploadedBy: userId } : {}),
    }).select("_id");
    if (!doc) {
        throw new AuthError("Document not found or not accessible.", 404);
    }
    return doc._id;
}

// ── GET all records ──────────────────────────────────────────────

export async function getAllStudentRecords(userId: string) {
    await dbConnect();
    const { student } = await resolveStudent(userId);
    const studentId = student._id;

    const [
        academics,
        publications,
        research,
        awards,
        skills,
        sports,
        cultural,
        events,
        social,
        placements,
        internships,
    ] = await Promise.all([
        StudentAcademicRecord.find({ studentId })
            .populate("semesterId", "semesterNumber academicYearId")
            .sort({ semesterId: 1 })
            .lean(),
        populateIfPathExists(
            StudentPublication,
            StudentPublication.find({ studentId }),
            "documentId",
            "fileName fileUrl fileType verified verificationStatus verificationRemarks"
        )
            .sort({ publicationDate: -1 })
            .lean(),
        populateIfPathExists(
            StudentResearchProject,
            StudentResearchProject.find({ studentId }),
            "documentId",
            "fileName fileUrl fileType verified verificationStatus verificationRemarks"
        )
            .sort({ startDate: -1 })
            .lean(),
        populateIfPathExists(
            StudentAward,
            StudentAward.find({ studentId }).populate("awardId"),
            "documentId",
            "fileName fileUrl fileType verified verificationStatus verificationRemarks"
        )
            .sort({ awardDate: -1 })
            .lean(),
        populateIfPathExists(
            StudentSkill,
            StudentSkill.find({ studentId }).populate("skillId"),
            "documentId",
            "fileName fileUrl fileType verified verificationStatus verificationRemarks"
        )
            .sort({ startDate: -1 })
            .lean(),
        populateIfPathExists(
            StudentSport,
            StudentSport.find({ studentId }).populate("sportId"),
            "documentId",
            "fileName fileUrl fileType verified verificationStatus verificationRemarks"
        )
            .sort({ eventDate: -1 })
            .lean(),
        populateIfPathExists(
            StudentCulturalParticipation,
            StudentCulturalParticipation.find({ studentId }).populate("activityId"),
            "documentId",
            "fileName fileUrl fileType verified verificationStatus verificationRemarks"
        )
            .sort({ date: -1 })
            .lean(),
        populateIfPathExists(
            StudentEventParticipation,
            StudentEventParticipation.find({ studentId }).populate("eventId"),
            "documentId",
            "fileName fileUrl fileType verified verificationStatus verificationRemarks"
        )
            .sort({ createdAt: -1 })
            .lean(),
        populateIfPathExists(
            StudentSocialParticipation,
            StudentSocialParticipation.find({ studentId }).populate("programId"),
            "documentId",
            "fileName fileUrl fileType verified"
        )
            .sort({ date: -1 })
            .lean(),
        Placement.find({ studentId }).sort({ offerDate: -1 }).lean(),
        populateIfPathExists(
            Internship,
            Internship.find({ studentId }),
            "documentId",
            "fileName fileUrl fileType verified"
        )
            .sort({ startDate: -1 })
            .lean(),
    ]);

    return {
        academics,
        publications,
        research,
        awards,
        skills,
        sports,
        cultural,
        events,
        social,
        placements,
        internships,
    };
}

export async function getStudentSemesters(userId: string) {
    await dbConnect();
    const { student } = await resolveStudent(userId);

    let semesters = await Semester.find({ programId: student.programId })
        .populate("academicYearId", "yearStart yearEnd")
        .sort({ semesterNumber: 1 })
        .lean();

    if (semesters.length === 0) {
        const programs = await Program.find({ departmentId: student.departmentId })
            .select("_id")
            .lean();
        const programIds = programs.map((program) => program._id);
        if (programIds.length) {
            semesters = await Semester.find({ programId: { $in: programIds } })
                .populate("academicYearId", "yearStart yearEnd")
                .sort({ semesterNumber: 1 })
                .lean();
        }
    }

    return semesters;
}

// ── CREATE a record ──────────────────────────────────────────────

async function findOrCreateAward(input: {
    awardTitle: string;
    category?: string;
    organizingBody?: string;
    level?: string;
}) {
    let award = await Award.findOne({
        title: input.awardTitle,
        ...(input.organizingBody && { organizingBody: input.organizingBody }),
    });
    if (!award) {
        award = await Award.create({
            title: input.awardTitle,
            category: input.category,
            organizingBody: input.organizingBody,
            level: input.level,
        });
    }
    return award;
}

async function findOrCreateSkill(input: { skillName: string; category?: string }) {
    let skill = await Skill.findOne({ name: input.skillName });
    if (!skill) {
        skill = await Skill.create({
            name: input.skillName,
            category: input.category ?? "Other",
        });
    }
    return skill;
}

async function findOrCreateSport(sportName: string) {
    let sport = await Sport.findOne({ sportName });
    if (!sport) {
        sport = await Sport.create({ sportName });
    }
    return sport;
}

async function findOrCreateCulturalActivity(input: {
    activityName: string;
    activityCategory?: string;
}) {
    let activity = await CulturalActivity.findOne({ name: input.activityName });
    if (!activity) {
        activity = await CulturalActivity.create({
            name: input.activityName,
            category: input.activityCategory,
        });
    }
    return activity;
}

async function findOrCreateEvent(input: {
    eventTitle: string;
    eventType?: string;
    organizedBy?: string;
    eventDate?: string;
}) {
    let event = await Event.findOne({ title: input.eventTitle });
    if (!event) {
        event = await Event.create({
            title: input.eventTitle,
            eventType: input.eventType ?? "Other",
            organizedBy: input.organizedBy ?? "Unknown",
            startDate: toDateOrUndefined(input.eventDate),
        });
    }
    return event;
}

async function findOrCreateSocialProgram(input: {
    programName: string;
    programType?: string;
}) {
    let prog = await SocialProgram.findOne({ name: input.programName });
    if (!prog) {
        prog = await SocialProgram.create({
            name: input.programName,
            type: input.programType ?? "Other",
        });
    }
    return prog;
}

export async function createStudentRecord(
    userId: string,
    type: string,
    rawData: unknown
) {
    await dbConnect();
    const parsedType = recordTypeSchema.parse(type) as RecordType;
    const schema = recordSchemaMap[parsedType];
    const data = schema.parse(rawData);
    const { student, user } = await resolveStudent(userId);
    const studentId = student._id;

    switch (parsedType) {
        case "academic": {
            const d = data as { semesterId: string; sgpa?: number; cgpa?: number; percentage?: number; rank?: number; resultStatus?: string };
            return StudentAcademicRecord.create({
                studentId,
                semesterId: d.semesterId,
                sgpa: d.sgpa,
                cgpa: d.cgpa,
                percentage: d.percentage,
                rank: d.rank,
                resultStatus: d.resultStatus,
            });
        }
        case "publication": {
            const d = data as {
                title: string;
                journalName?: string;
                publisher?: string;
                publicationType?: string;
                publicationDate?: string;
                doi?: string;
                indexedIn?: string;
                documentId?: string;
            };
            return StudentPublication.create({
                studentId,
                title: d.title,
                journalName: d.journalName,
                publisher: d.publisher,
                publicationType: d.publicationType,
                publicationDate: toDateOrUndefined(d.publicationDate),
                doi: d.doi,
                indexedIn: d.indexedIn,
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
        case "research": {
            const d = data as {
                title: string;
                guideName?: string;
                startDate?: string;
                endDate?: string;
                status?: string;
                description?: string;
                documentId?: string;
            };
            return StudentResearchProject.create({
                studentId,
                title: d.title,
                guideName: d.guideName,
                startDate: toDateOrUndefined(d.startDate),
                endDate: toDateOrUndefined(d.endDate),
                status: d.status,
                description: d.description,
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
        case "award": {
            const d = data as { awardId?: string; awardTitle?: string; category?: string; organizingBody?: string; level?: string; awardDate?: string; documentId?: string };
            let award = d.awardId ? await Award.findById(d.awardId) : null;
            if (!award && d.awardId) {
                const master = await resolveMasterData(d.awardId, ["award"]);
                if (master) {
                    award = await findOrCreateAward({
                        awardTitle: master.label,
                        category: readMetaString(master.metadata as Record<string, unknown>, "category") ?? undefined,
                        organizingBody:
                            readMetaString(master.metadata as Record<string, unknown>, "organizingBody") ??
                            readMetaString(master.metadata as Record<string, unknown>, "organizedBy") ??
                            undefined,
                        level: sanitizeEnum(
                            readMetaString(master.metadata as Record<string, unknown>, "level"),
                            awardLevelSet
                        ),
                    });
                }
            }
            if (!award) {
                award = await findOrCreateAward({
                    awardTitle: d.awardTitle ?? "",
                    category: d.category,
                    organizingBody: d.organizingBody,
                    level: d.level,
                });
            }
            if (!award) {
                throw new AuthError("Award not found.", 404);
            }
            return StudentAward.create({
                studentId,
                awardId: award._id,
                awardDate: toDateOrUndefined(d.awardDate),
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
        case "skill": {
            const d = data as { skillId?: string; skillName?: string; category?: string; provider?: string; startDate?: string; endDate?: string; documentId?: string };
            let skill = d.skillId ? await Skill.findById(d.skillId) : null;
            if (!skill && d.skillId) {
                const master = await resolveMasterData(d.skillId, ["skill"]);
                if (master) {
                    skill = await findOrCreateSkill({
                        skillName: master.label,
                        category: sanitizeEnum(
                            readMetaString(master.metadata as Record<string, unknown>, "category"),
                            skillCategorySet
                        ),
                    });
                }
            }
            if (!skill) {
                skill = await findOrCreateSkill({
                    skillName: d.skillName ?? "",
                    category: d.category,
                });
            }
            if (!skill) {
                throw new AuthError("Skill not found.", 404);
            }
            return StudentSkill.create({
                studentId,
                skillId: skill._id,
                provider: d.provider,
                startDate: toDateOrUndefined(d.startDate),
                endDate: toDateOrUndefined(d.endDate),
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
        case "sport": {
            const d = data as { sportId?: string; sportName?: string; eventName: string; level?: string; position?: string; eventDate?: string; documentId?: string };
            let sport = d.sportId ? await Sport.findById(d.sportId) : null;
            if (!sport && d.sportId) {
                const master = await resolveMasterData(d.sportId, ["sport"]);
                if (master) {
                    sport = await findOrCreateSport(master.label);
                }
            }
            if (!sport) {
                sport = await findOrCreateSport(d.sportName ?? "");
            }
            if (!sport) {
                throw new AuthError("Sport not found.", 404);
            }
            return StudentSport.create({
                studentId,
                sportId: sport._id,
                eventName: d.eventName,
                level: d.level,
                position: d.position,
                eventDate: toDateOrUndefined(d.eventDate),
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
        case "cultural": {
            const d = data as { activityId?: string; activityName?: string; activityCategory?: string; eventName: string; level?: string; position?: string; date?: string; documentId?: string };
            let activity = d.activityId ? await CulturalActivity.findById(d.activityId) : null;
            if (!activity && d.activityId) {
                const master = await resolveMasterData(d.activityId, ["cultural-activity"]);
                if (master) {
                    activity = await findOrCreateCulturalActivity({
                        activityName: master.label,
                        activityCategory: readMetaString(master.metadata as Record<string, unknown>, "category") ?? undefined,
                    });
                }
            }
            if (!activity) {
                activity = await findOrCreateCulturalActivity({
                    activityName: d.activityName ?? "",
                    activityCategory: d.activityCategory,
                });
            }
            if (!activity) {
                throw new AuthError("Cultural activity not found.", 404);
            }
            return StudentCulturalParticipation.create({
                studentId,
                activityId: activity._id,
                eventName: d.eventName,
                level: d.level,
                position: d.position,
                date: toDateOrUndefined(d.date),
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
        case "event": {
            const d = data as { eventId?: string; eventTitle?: string; eventType?: string; organizedBy?: string; role: string; paperTitle?: string; eventDate?: string; documentId?: string };
            let event = d.eventId ? await Event.findById(d.eventId) : null;
            if (!event && d.eventId) {
                const master = await resolveMasterData(d.eventId, ["event"]);
                if (master) {
                    event = await findOrCreateEvent({
                        eventTitle: master.label,
                        eventType: sanitizeEnum(
                            readMetaString(master.metadata as Record<string, unknown>, "eventType"),
                            eventTypeSet
                        ),
                        organizedBy: readMetaString(master.metadata as Record<string, unknown>, "organizedBy") ?? undefined,
                        eventDate: readMetaString(master.metadata as Record<string, unknown>, "eventDate") ?? undefined,
                    });
                }
            }
            if (!event) {
                event = await findOrCreateEvent({
                    eventTitle: d.eventTitle ?? "",
                    eventType: d.eventType,
                    organizedBy: d.organizedBy,
                    eventDate: d.eventDate,
                });
            }
            if (!event) {
                throw new AuthError("Event not found.", 404);
            }
            return StudentEventParticipation.create({
                studentId,
                eventId: event._id,
                role: d.role,
                paperTitle: d.paperTitle,
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
        case "social": {
            const d = data as { programId?: string; programName?: string; programType?: string; activityName: string; hoursContributed?: number; date?: string; documentId?: string };
            let prog = d.programId ? await SocialProgram.findById(d.programId) : null;
            if (!prog && d.programId) {
                const master = await resolveMasterData(d.programId, ["social-program"]);
                if (master) {
                    prog = await findOrCreateSocialProgram({
                        programName: master.label,
                        programType: sanitizeEnum(
                            readMetaString(master.metadata as Record<string, unknown>, "type"),
                            socialProgramTypeSet
                        ),
                    });
                }
            }
            if (!prog) {
                prog = await findOrCreateSocialProgram({
                    programName: d.programName ?? "",
                    programType: d.programType,
                });
            }
            if (!prog) {
                throw new AuthError("Social program not found.", 404);
            }
            return StudentSocialParticipation.create({
                studentId,
                programId: prog._id,
                activityName: d.activityName,
                hoursContributed: d.hoursContributed,
                date: toDateOrUndefined(d.date),
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
        case "placement": {
            const d = data as { companyName: string; jobRole?: string; package?: number; offerDate?: string; joiningDate?: string };
            return Placement.create({
                studentId,
                companyName: d.companyName,
                jobRole: d.jobRole,
                package: d.package,
                offerDate: toDateOrUndefined(d.offerDate),
                joiningDate: toDateOrUndefined(d.joiningDate),
            });
        }
        case "internship": {
            const d = data as { companyName: string; role?: string; startDate?: string; endDate?: string; stipend?: number; documentId?: string };
            return Internship.create({
                studentId,
                companyName: d.companyName,
                role: d.role,
                startDate: toDateOrUndefined(d.startDate),
                endDate: toDateOrUndefined(d.endDate),
                stipend: d.stipend,
                documentId: await resolveDocumentId(d.documentId, user._id.toString()),
            });
        }
    }
}

// ── DELETE a record ──────────────────────────────────────────────

const modelMap = {
    academic: StudentAcademicRecord,
    publication: StudentPublication,
    research: StudentResearchProject,
    award: StudentAward,
    skill: StudentSkill,
    sport: StudentSport,
    cultural: StudentCulturalParticipation,
    event: StudentEventParticipation,
    social: StudentSocialParticipation,
    placement: Placement,
    internship: Internship,
} as const;

const documentCapableModels = {
    award: StudentAward,
    skill: StudentSkill,
    sport: StudentSport,
    cultural: StudentCulturalParticipation,
    event: StudentEventParticipation,
    social: StudentSocialParticipation,
    publication: StudentPublication,
    research: StudentResearchProject,
    internship: Internship,
} as const;

export async function deleteStudentRecord(
    userId: string,
    type: string,
    recordId: string
) {
    await dbConnect();
    const parsedType = recordTypeSchema.parse(type) as RecordType;
    const { student } = await resolveStudent(userId);

    const Model = modelMap[parsedType];
    const record = await (Model as any).findOneAndDelete({
        _id: recordId,
        studentId: student._id,
    });

    if (!record) {
        throw new AuthError("Record not found or does not belong to this student.", 404);
    }

    return { deleted: true };
}

export async function updateStudentRecordDocument(
    userId: string,
    type: string,
    recordId: string,
    documentId: string
) {
    await dbConnect();
    const parsedType = recordTypeSchema.parse(type) as RecordType;
    const Model = (documentCapableModels as Record<string, unknown>)[parsedType];
    if (!Model) {
        throw new AuthError("Evidence documents are not supported for this record type.", 400);
    }

    const { student } = await resolveStudent(userId);
    const resolvedDocumentId = await resolveDocumentId(documentId, userId);
    if (!resolvedDocumentId) {
        throw new AuthError("Document is required for evidence linking.", 400);
    }

    const record = await (Model as any).findOneAndUpdate(
        { _id: recordId, studentId: student._id },
        { $set: { documentId: resolvedDocumentId } },
        { new: true }
    );

    if (!record) {
        throw new AuthError("Record not found or does not belong to this student.", 404);
    }

    return record;
}

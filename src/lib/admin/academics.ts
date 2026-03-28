import mongoose from "mongoose";

import { createAuditLog, type AuditActor, type AuditRequestContext } from "@/lib/audit/service";
import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { normalizeDegreeType } from "@/lib/academic/program-classification";
import AcademicYear from "@/models/reference/academic-year";
import Institution from "@/models/reference/institution";
import Department from "@/models/reference/department";
import Program from "@/models/academic/program";
import Course from "@/models/academic/course";
import Semester from "@/models/reference/semester";
import FacultyTeachingLoad from "@/models/faculty/faculty-teaching-load";
import {
    academicYearSchema,
    academicYearUpdateSchema,
    courseSchema,
    courseUpdateSchema,
    programSchema,
    programUpdateSchema,
    semesterSchema,
    semesterUpdateSchema,
} from "@/lib/admin/academics-validators";

type ProgramInput = import("zod").output<typeof programSchema>;
type SemesterInput = import("zod").output<typeof semesterSchema>;
type CourseInput = import("zod").output<typeof courseSchema>;

type DuplicateKeyError = {
    code?: number;
    keyPattern?: Record<string, unknown>;
    keyValue?: Record<string, unknown>;
};

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === 11000
    );
}

function toDisplayValue(value: unknown, fallback: string) {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    return fallback;
}

export async function listAcademicYears() {
    await dbConnect();
    return AcademicYear.find({}).sort({ yearStart: -1 }).lean();
}

export async function createAcademicYear(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = academicYearSchema.parse(rawInput);

    const session = await mongoose.startSession();
    try {
        let created: InstanceType<typeof AcademicYear> | null = null;
        await session.withTransaction(async () => {
            const [doc] = await AcademicYear.create([input], { session });
            created = doc;

            if (input.isActive) {
                await AcademicYear.updateMany(
                    { _id: { $ne: doc._id } },
                    { $set: { isActive: false } },
                    { session }
                );
            }
        });
        if (!created) {
            throw new AuthError("Academic year creation failed.", 500);
        }
        const createdAcademicYear = created;
        if (options?.actor) {
            await createAuditLog({
                actor: options.actor,
                action: "ACADEMIC_YEAR_CREATE",
                tableName: "academic_years",
                recordId: String((createdAcademicYear as { _id: unknown })._id),
                newData: createdAcademicYear,
                auditContext: options.auditContext,
            });
        }

        return createdAcademicYear;
    } finally {
        await session.endSession();
    }
}

export async function updateAcademicYear(
    id: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = academicYearUpdateSchema.parse(rawInput);

    const existing = await AcademicYear.findById(id);
    if (!existing) {
        throw new AuthError("Academic year not found.", 404);
    }

    const oldState = existing.toObject();

    const nextYearStart = input.yearStart ?? existing.yearStart;
    const nextYearEnd = input.yearEnd ?? existing.yearEnd;
    if (nextYearEnd <= nextYearStart) {
        throw new AuthError("Year end must be greater than year start.", 400);
    }

    const session = await mongoose.startSession();
    try {
        let updated: InstanceType<typeof AcademicYear> | null = null;
        await session.withTransaction(async () => {
            updated = await AcademicYear.findByIdAndUpdate(
                id,
                { $set: { ...input } },
                { returnDocument: "after", session }
            );

            if (input.isActive) {
                await AcademicYear.updateMany(
                    { _id: { $ne: id } },
                    { $set: { isActive: false } },
                    { session }
                );
            }
        });
        if (!updated) {
            throw new AuthError("Academic year update failed.", 500);
        }
        const updatedAcademicYear = updated;
        if (options?.actor) {
            await createAuditLog({
                actor: options.actor,
                action: "ACADEMIC_YEAR_UPDATE",
                tableName: "academic_years",
                recordId: String((updatedAcademicYear as { _id: unknown })._id),
                oldData: oldState,
                newData: updatedAcademicYear,
                auditContext: options.auditContext,
            });
        }

        return updatedAcademicYear;
    } finally {
        await session.endSession();
    }
}

export async function deleteAcademicYear(
    id: string,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();

    const existing = await AcademicYear.findById(id).select("_id");
    if (!existing) {
        throw new AuthError("Academic year not found.", 404);
    }

    const usedByPrograms = await Program.exists({ startAcademicYearId: id });

    if (usedByPrograms) {
        throw new AuthError(
            "Academic year is mapped to programs and cannot be deleted.",
            409
        );
    }

    const deletedState = existing.toObject();
    await AcademicYear.findByIdAndDelete(id);

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "ACADEMIC_YEAR_DELETE",
            tableName: "academic_years",
            recordId: id,
            oldData: deletedState,
            auditContext: options.auditContext,
        });
    }
}

export async function listPrograms() {
    await dbConnect();
    return Program.find({})
        .populate("institutionId", "name")
        .populate("departmentId", "name")
        .populate("startAcademicYearId", "yearStart yearEnd isActive")
        .sort({ name: 1 })
        .lean();
}

function formatAcademicYearLabel(yearStart: number) {
    return `${yearStart}-${yearStart + 1}`;
}

async function resolveRequiredAcademicYears(startYearStart: number, durationYears: number) {
    const requiredStarts = Array.from({ length: durationYears }, (_, idx) => startYearStart + idx);
    const existing = await AcademicYear.find({
        yearStart: { $in: requiredStarts },
    }).sort({ yearStart: 1 });

    const existingStarts = new Set(existing.map((item) => item.yearStart));
    const missing = requiredStarts.filter((year) => !existingStarts.has(year));

    if (missing.length) {
        throw new AuthError(
            `Missing academic years: ${missing.map(formatAcademicYearLabel).join(", ")}.`,
            400
        );
    }

    return existing;
}

function ensureSupportedDegreeType(value: string) {
    const normalized = normalizeDegreeType(value);

    if (!normalized) {
        throw new AuthError("Invalid degree type. Select a supported option.", 400);
    }

    return normalized;
}

type SemesterKeyOptions = {
    semesterNumber: number;
};

function buildSemesterKeyFilter({ semesterNumber }: SemesterKeyOptions) {
    return {
        semesterNumber,
    };
}

function semesterDuplicateMessage() {
    return "Semester already exists.";
}

async function resolveInstitutionForDepartment(
    departmentId: string,
    compatibilityInstitutionId?: string
) {
    const department = await Department.findById(departmentId);
    if (!department) {
        throw new AuthError("Department not found.", 404);
    }

    const institution = await Institution.findById(department.institutionId);
    if (!institution) {
        throw new AuthError("Institution for selected department not found.", 404);
    }

    if (
        compatibilityInstitutionId &&
        compatibilityInstitutionId !== institution._id.toString()
    ) {
        throw new AuthError(
            "Institution is auto-resolved from department in single-university mode.",
            400
        );
    }

    return { institution, department };
}

export async function createProgram(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = programSchema.parse(rawInput) as ProgramInput;
    const degreeType = ensureSupportedDegreeType(input.degreeType);
    const { institution, department } = await resolveInstitutionForDepartment(
        input.departmentId,
        input.institutionId
    );

    const startAcademicYear = input.startAcademicYearId
        ? await AcademicYear.findById(input.startAcademicYearId)
        : null;

    if (input.startAcademicYearId && !startAcademicYear) {
        throw new AuthError("Start academic year not found.", 404);
    }

    const session = await mongoose.startSession();
    try {
        let createdProgramId: string | null = null;
        await session.withTransaction(async () => {
            const [doc] = await Program.create(
                [
                    {
                        name: input.name,
                        institutionId: institution._id,
                        departmentId: department._id,
                        startAcademicYearId: startAcademicYear?._id,
                        degreeType,
                        durationYears: input.durationYears,
                        isActive: input.isActive,
                    },
                ],
                { session }
            );
            createdProgramId = doc._id.toString();

            if (startAcademicYear) {
                const totalSemesters = input.durationYears * 2;
                for (let semesterNumber = 1; semesterNumber <= totalSemesters; semesterNumber += 1) {
                    await Semester.findOneAndUpdate(
                        { semesterNumber },
                        { $setOnInsert: { semesterNumber } },
                        { upsert: true, session }
                    );
                }
            }
        });

        if (!createdProgramId) {
            throw new AuthError("Program creation failed.", 500);
        }

        const createdProgram = await Program.findById(createdProgramId)
            .populate("institutionId", "name")
            .populate("departmentId", "name")
            .populate("startAcademicYearId", "yearStart yearEnd isActive");

        if (createdProgram && options?.actor) {
            await createAuditLog({
                actor: options.actor,
                action: "PROGRAM_CREATE",
                tableName: "programs",
                recordId: createdProgram._id.toString(),
                newData: createdProgram,
                auditContext: options.auditContext,
            });
        }

        return createdProgram;
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            const keyPattern = error.keyPattern ?? {};
            const keyValue = error.keyValue ?? {};

            if ("name" in keyPattern) {
                const programName = toDisplayValue(keyValue.name, input.name);
                throw new AuthError(
                    `Program "${programName}" already exists for the selected department.`,
                    409
                );
            }

            if ("code" in keyPattern) {
                const programCode = toDisplayValue(keyValue.code, "this code");
                throw new AuthError(
                    `Program code "${programCode}" already exists for the selected department.`,
                    409
                );
            }

            throw new AuthError(
                "Duplicate program entry found for selected mapping.",
                409
            );
        }

        throw error;
    } finally {
        await session.endSession();
    }
}

export async function updateProgram(
    id: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = programUpdateSchema.parse(rawInput) as Partial<ProgramInput>;
    const sanitizedInput = {
        ...input,
        degreeType:
            input.degreeType !== undefined
                ? ensureSupportedDegreeType(input.degreeType)
                : undefined,
    };

    try {
        const program = await Program.findById(id);
        if (!program) {
            throw new AuthError("Program not found.", 404);
        }

        const oldState = program.toObject();

        let resolvedInstitutionId: string | undefined;
        if (sanitizedInput.departmentId) {
            const resolved = await resolveInstitutionForDepartment(
                sanitizedInput.departmentId,
                sanitizedInput.institutionId
            );
            resolvedInstitutionId = resolved.institution._id.toString();
        } else if (sanitizedInput.institutionId) {
            const currentDepartment = await Department.findById(program.departmentId);
            if (!currentDepartment) {
                throw new AuthError("Department not found.", 404);
            }

            if (currentDepartment.institutionId.toString() !== sanitizedInput.institutionId) {
                throw new AuthError(
                    "Institution is auto-resolved from department in single-university mode.",
                    400
                );
            }
            resolvedInstitutionId = currentDepartment.institutionId.toString();
        }

        const updatePayload = {
            ...sanitizedInput,
            institutionId: resolvedInstitutionId,
        };

        const updated = await Program.findByIdAndUpdate(
            id,
            { $set: updatePayload },
            { returnDocument: "after" }
        )
            .populate("institutionId", "name")
            .populate("departmentId", "name")
            .populate("startAcademicYearId", "yearStart yearEnd isActive");

        if (!updated) {
            throw new AuthError("Program update failed.", 500);
        }

        if (options?.actor) {
            await createAuditLog({
                actor: options.actor,
                action: "PROGRAM_UPDATE",
                tableName: "programs",
                recordId: updated._id.toString(),
                oldData: oldState,
                newData: updated,
                auditContext: options.auditContext,
            });
        }

        return updated;
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            const keyPattern = error.keyPattern ?? {};
            const keyValue = error.keyValue ?? {};

            if ("name" in keyPattern) {
                const programName = toDisplayValue(
                    keyValue.name,
                    typeof input.name === "string" ? input.name : "this program"
                );
                throw new AuthError(
                    `Program "${programName}" already exists for the selected department.`,
                    409
                );
            }

            if ("code" in keyPattern) {
                const programCode = toDisplayValue(keyValue.code, "this code");
                throw new AuthError(
                    `Program code "${programCode}" already exists for the selected department.`,
                    409
                );
            }

            throw new AuthError("Duplicate program entry found for selected mapping.", 409);
        }

        throw error;
    }
}

export async function deleteProgram(
    id: string,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();

    const existing = await Program.findById(id).select("_id");
    if (!existing) {
        throw new AuthError("Program not found.", 404);
    }

    const [hasCourses, hasTeachingLoads] = await Promise.all([
        Course.exists({ programId: id }),
        FacultyTeachingLoad.exists({ programId: id }),
    ]);

    if (hasCourses || hasTeachingLoads) {
        throw new AuthError(
            "Program is linked to courses or faculty teaching loads and cannot be deleted.",
            409
        );
    }

    const deletedState = existing.toObject();
    await Program.findByIdAndDelete(id);

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "PROGRAM_DELETE",
            tableName: "programs",
            recordId: id,
            oldData: deletedState,
            auditContext: options.auditContext,
        });
    }
}

export async function listSemesters() {
    await dbConnect();
    return Semester.find({})
        .sort({ semesterNumber: 1 })
        .lean();
}

export async function createSemester(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = semesterSchema.parse(rawInput) as SemesterInput;

    const existing = await Semester.findOne(
        buildSemesterKeyFilter({
            semesterNumber: input.semesterNumber,
        })
    ).select("_id");
    if (existing) {
        throw new AuthError(semesterDuplicateMessage(), 409);
    }

    const semesterPayload: {
        semesterNumber: number;
    } = {
        semesterNumber: input.semesterNumber,
    };

    const semester = await Semester.create(semesterPayload);

    const createdSemester = await Semester.findById(semester._id);

    if (createdSemester && options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "SEMESTER_CREATE",
            tableName: "semesters",
            recordId: createdSemester._id.toString(),
            newData: createdSemester,
            auditContext: options.auditContext,
        });
    }

    return createdSemester;
}

export async function updateSemester(
    id: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = semesterUpdateSchema.parse(rawInput) as Partial<SemesterInput>;

    const existing = await Semester.findById(id);
    if (!existing) {
        throw new AuthError("Semester not found.", 404);
    }

    const oldState = existing.toObject();

    const nextSemesterNumber = input.semesterNumber ?? existing.semesterNumber;

    const duplicate = await Semester.findOne({
        _id: { $ne: existing._id },
        ...buildSemesterKeyFilter({
            semesterNumber: nextSemesterNumber,
        }),
    }).select("_id");
    if (duplicate) {
        throw new AuthError("Another semester already exists with this number.", 409);
    }

    const updatePayload: {
        semesterNumber?: number;
    } = {
        ...(input.semesterNumber !== undefined ? { semesterNumber: input.semesterNumber } : {}),
    };

    const updateOps: {
        $set?: typeof updatePayload;
    } = {};

    if (Object.keys(updatePayload).length) {
        updateOps.$set = updatePayload;
    }

    const updated = await Semester.findByIdAndUpdate(
        id,
        updateOps,
        { returnDocument: "after" }
    );

    if (!updated) {
        throw new AuthError("Semester update failed.", 500);
    }

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "SEMESTER_UPDATE",
            tableName: "semesters",
            recordId: updated._id.toString(),
            oldData: oldState,
            newData: updated,
            auditContext: options.auditContext,
        });
    }

    return updated;
}

export async function deleteSemester(
    id: string,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();

    const existing = await Semester.findById(id).select("_id");
    if (!existing) {
        throw new AuthError("Semester not found.", 404);
    }

    const hasCourses = await Course.exists({ semesterId: id });
    if (hasCourses) {
        throw new AuthError(
            "Semester is linked to one or more courses and cannot be deleted.",
            409
        );
    }

    const deletedState = existing.toObject();
    await Semester.findByIdAndDelete(id);

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "SEMESTER_DELETE",
            tableName: "semesters",
            recordId: id,
            oldData: deletedState,
            auditContext: options.auditContext,
        });
    }
}

export async function listCourses() {
    await dbConnect();
    return Course.find({})
        .populate("programId", "name")
        .populate({
            path: "semesterId",
            select: "semesterNumber",
        })
        .sort({ name: 1 })
        .lean();
}

export async function createCourse(
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = courseSchema.parse(rawInput) as CourseInput;

    const program = await Program.findById(input.programId).select("_id durationYears");
    if (!program) {
        throw new AuthError("Program not found.", 404);
    }

    const semester = await Semester.findById(input.semesterId).select("_id semesterNumber");
    if (!semester) {
        throw new AuthError("Semester not found.", 404);
    }

    const maxSemester = program.durationYears * 2;
    if (semester.semesterNumber > maxSemester) {
        throw new AuthError("Semester mapping exceeds program duration.", 400);
    }

    const course = await Course.create({
        name: input.name,
        subjectCode: input.subjectCode || undefined,
        courseType: input.courseType,
        credits: input.credits,
        isActive: input.isActive,
        programId: program._id,
        semesterId: semester._id,
    });

    const createdCourse = await Course.findById(course._id)
        .populate("programId", "name")
        .populate({
            path: "semesterId",
            select: "semesterNumber",
        });

    if (createdCourse && options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "COURSE_CREATE",
            tableName: "courses",
            recordId: createdCourse._id.toString(),
            newData: createdCourse,
            auditContext: options.auditContext,
        });
    }

    return createdCourse;
}

export async function updateCourse(
    id: string,
    rawInput: unknown,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();
    const input = courseUpdateSchema.parse(rawInput) as Partial<CourseInput>;

    const existing = await Course.findById(id);
    if (!existing) {
        throw new AuthError("Course not found.", 404);
    }

    const oldState = existing.toObject();

    const nextProgramId = input.programId ?? existing.programId.toString();
    const nextSemesterId = input.semesterId ?? existing.semesterId.toString();

    const program = await Program.findById(nextProgramId).select("_id durationYears");
    if (!program) {
        throw new AuthError("Program not found.", 404);
    }

    const semester = await Semester.findById(nextSemesterId).select("_id semesterNumber");
    if (!semester) {
        throw new AuthError("Semester not found.", 404);
    }

    const maxSemester = program.durationYears * 2;
    if (semester.semesterNumber > maxSemester) {
        throw new AuthError("Semester mapping exceeds program duration.", 400);
    }

    const updated = await Course.findByIdAndUpdate(
        id,
        {
            $set: {
                ...input,
                subjectCode: input.subjectCode || undefined,
            },
        },
        { returnDocument: "after" }
    )
        .populate("programId", "name")
        .populate({
            path: "semesterId",
            select: "semesterNumber",
        });

    if (!updated) {
        throw new AuthError("Course update failed.", 500);
    }

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "COURSE_UPDATE",
            tableName: "courses",
            recordId: updated._id.toString(),
            oldData: oldState,
            newData: updated,
            auditContext: options.auditContext,
        });
    }

    return updated;
}

export async function deleteCourse(
    id: string,
    options?: { actor?: AuditActor; auditContext?: AuditRequestContext }
) {
    await dbConnect();

    const existing = await Course.findById(id).select("_id");
    if (!existing) {
        throw new AuthError("Course not found.", 404);
    }

    const deletedState = existing.toObject();

    const hasTeachingLoads = await FacultyTeachingLoad.exists({ courseId: id });
    if (hasTeachingLoads) {
        throw new AuthError(
            "Course is linked to faculty teaching loads and cannot be deleted.",
            409
        );
    }

    await Course.findByIdAndDelete(id);

    if (options?.actor) {
        await createAuditLog({
            actor: options.actor,
            action: "COURSE_DELETE",
            tableName: "courses",
            recordId: id,
            oldData: deletedState,
            auditContext: options.auditContext,
        });
    }
}

import mongoose from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import AcademicYear from "@/models/reference/academic-year";
import Institution from "@/models/reference/institution";
import Department from "@/models/reference/department";
import Program from "@/models/academic/program";
import Semester from "@/models/reference/semester";
import {
    academicYearSchema,
    academicYearUpdateSchema,
    programSchema,
    programUpdateSchema,
    semesterSchema,
    semesterUpdateSchema,
} from "@/lib/admin/academics-validators";

type AcademicYearInput = import("zod").output<typeof academicYearSchema>;
type ProgramInput = import("zod").output<typeof programSchema>;
type SemesterInput = import("zod").output<typeof semesterSchema>;

export async function listAcademicYears() {
    await dbConnect();
    return AcademicYear.find({}).sort({ yearStart: -1 }).lean();
}

export async function createAcademicYear(rawInput: unknown) {
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
        return created;
    } finally {
        await session.endSession();
    }
}

export async function updateAcademicYear(id: string, rawInput: unknown) {
    await dbConnect();
    const input = academicYearUpdateSchema.parse(rawInput);

    const existing = await AcademicYear.findById(id);
    if (!existing) {
        throw new AuthError("Academic year not found.", 404);
    }

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
                { new: true, session }
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
        return updated;
    } finally {
        await session.endSession();
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

export async function createProgram(rawInput: unknown) {
    await dbConnect();
    const input = programSchema.parse(rawInput) as ProgramInput;

    const institution = await Institution.findById(input.institutionId);
    if (!institution) {
        throw new AuthError("Institution not found.", 404);
    }

    const department = await Department.findById(input.departmentId);
    if (!department) {
        throw new AuthError("Department not found.", 404);
    }
    if (department.institutionId.toString() !== institution._id.toString()) {
        throw new AuthError("Department does not belong to the selected institution.", 400);
    }

    const startAcademicYear = await AcademicYear.findById(input.startAcademicYearId);
    if (!startAcademicYear) {
        throw new AuthError("Start academic year not found.", 404);
    }

    const academicYears = await resolveRequiredAcademicYears(
        startAcademicYear.yearStart,
        input.durationYears
    );

    const session = await mongoose.startSession();
    try {
        let created: InstanceType<typeof Program> | null = null;
        await session.withTransaction(async () => {
            const [doc] = await Program.create(
                [
                    {
                        name: input.name,
                        institutionId: institution._id,
                        departmentId: department._id,
                        startAcademicYearId: startAcademicYear._id,
                        degreeType: input.degreeType,
                        durationYears: input.durationYears,
                        isActive: input.isActive,
                    },
                ],
                { session }
            );
            created = doc;

            const semesters: SemesterInput[] = [];
            academicYears.forEach((year, index) => {
                semesters.push({
                    programId: doc._id.toString(),
                    academicYearId: year._id.toString(),
                    semesterNumber: index * 2 + 1,
                });
                semesters.push({
                    programId: doc._id.toString(),
                    academicYearId: year._id.toString(),
                    semesterNumber: index * 2 + 2,
                });
            });

            await Semester.insertMany(
                semesters.map((semester) => ({
                    programId: semester.programId,
                    academicYearId: semester.academicYearId,
                    semesterNumber: semester.semesterNumber,
                })),
                { session }
            );
        });

        if (!created) {
            throw new AuthError("Program creation failed.", 500);
        }

        return Program.findById(created._id)
            .populate("institutionId", "name")
            .populate("departmentId", "name")
            .populate("startAcademicYearId", "yearStart yearEnd isActive");
    } finally {
        await session.endSession();
    }
}

export async function updateProgram(id: string, rawInput: unknown) {
    await dbConnect();
    const input = programUpdateSchema.parse(rawInput) as Partial<ProgramInput>;

    const program = await Program.findById(id);
    if (!program) {
        throw new AuthError("Program not found.", 404);
    }

    const semestersExist = await Semester.exists({ programId: program._id });
    if (
        semestersExist &&
        ((input.startAcademicYearId && input.startAcademicYearId !== program.startAcademicYearId?.toString()) ||
            (input.durationYears && input.durationYears !== program.durationYears))
    ) {
        throw new AuthError(
            "Cannot change start academic year or duration after semesters are generated.",
            400
        );
    }

    if (input.institutionId) {
        const institution = await Institution.findById(input.institutionId);
        if (!institution) {
            throw new AuthError("Institution not found.", 404);
        }
    }

    if (input.departmentId) {
        const department = await Department.findById(input.departmentId);
        if (!department) {
            throw new AuthError("Department not found.", 404);
        }
        const expectedInstitutionId = input.institutionId ?? program.institutionId?.toString();
        if (expectedInstitutionId && department.institutionId.toString() !== expectedInstitutionId) {
            throw new AuthError("Department does not belong to the selected institution.", 400);
        }
    }

    const updated = await Program.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true }
    )
        .populate("institutionId", "name")
        .populate("departmentId", "name")
        .populate("startAcademicYearId", "yearStart yearEnd isActive");

    if (!updated) {
        throw new AuthError("Program update failed.", 500);
    }

    return updated;
}

export async function listSemesters() {
    await dbConnect();
    return Semester.find({})
        .populate("programId", "name")
        .populate("academicYearId", "yearStart yearEnd")
        .sort({ semesterNumber: 1 })
        .lean();
}

export async function createSemester(rawInput: unknown) {
    await dbConnect();
    const input = semesterSchema.parse(rawInput) as SemesterInput;

    const program = await Program.findById(input.programId);
    if (!program) {
        throw new AuthError("Program not found.", 404);
    }

    const academicYear = await AcademicYear.findById(input.academicYearId);
    if (!academicYear) {
        throw new AuthError("Academic year not found.", 404);
    }

    const existing = await Semester.findOne({
        programId: program._id,
        academicYearId: academicYear._id,
        semesterNumber: input.semesterNumber,
    }).select("_id");
    if (existing) {
        throw new AuthError("Semester already exists for this program and academic year.", 409);
    }

    const semester = await Semester.create({
        programId: program._id,
        academicYearId: academicYear._id,
        semesterNumber: input.semesterNumber,
    });

    return Semester.findById(semester._id)
        .populate("programId", "name")
        .populate("academicYearId", "yearStart yearEnd");
}

export async function updateSemester(id: string, rawInput: unknown) {
    await dbConnect();
    const input = semesterUpdateSchema.parse(rawInput) as Partial<SemesterInput>;

    const existing = await Semester.findById(id);
    if (!existing) {
        throw new AuthError("Semester not found.", 404);
    }

    const nextProgramId = input.programId ?? existing.programId.toString();
    const nextAcademicYearId = input.academicYearId ?? existing.academicYearId.toString();
    const nextSemesterNumber = input.semesterNumber ?? existing.semesterNumber;

    const duplicate = await Semester.findOne({
        _id: { $ne: existing._id },
        programId: nextProgramId,
        academicYearId: nextAcademicYearId,
        semesterNumber: nextSemesterNumber,
    }).select("_id");
    if (duplicate) {
        throw new AuthError("Another semester already exists with this mapping.", 409);
    }

    const updated = await Semester.findByIdAndUpdate(
        id,
        { $set: input },
        { new: true }
    )
        .populate("programId", "name")
        .populate("academicYearId", "yearStart yearEnd");

    if (!updated) {
        throw new AuthError("Semester update failed.", 500);
    }

    return updated;
}

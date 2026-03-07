import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import User from "@/models/core/user";
import FacultyRecord from "@/models/core/faculty-record";
import { facultyRecordSchema } from "@/lib/faculty/validators";

function ensureStringArray(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    return String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeFacultyInput(rawInput: unknown) {
    const input = rawInput as Record<string, unknown>;

    return facultyRecordSchema.parse({
        ...input,
        researchInterests: ensureStringArray(input.researchInterests),
        professionalMemberships: ensureStringArray(input.professionalMemberships),
        certifications: ensureStringArray(input.certifications),
        awards: ensureStringArray(input.awards),
        coursesTaught: ensureStringArray(input.coursesTaught),
        administrativeResponsibilities: ensureStringArray(input.administrativeResponsibilities),
        pbasEntries: Array.isArray(input.pbasEntries)
            ? input.pbasEntries.map((entry) => ({
                  ...entry,
                  coursesHandled: ensureStringArray((entry as Record<string, unknown>).coursesHandled),
              }))
            : [],
        casEntries: Array.isArray(input.casEntries) ? input.casEntries : [],
        aqarEntries: Array.isArray(input.aqarEntries) ? input.aqarEntries : [],
        degrees: Array.isArray(input.degrees) ? input.degrees : [],
    });
}

export async function getFacultyWorkspace(userId: string) {
    await dbConnect();

    const [user, record] = await Promise.all([
        User.findById(userId),
        FacultyRecord.findOne({ userId }),
    ]);

    if (!user || user.role !== "Faculty") {
        throw new AuthError("Faculty profile not found.", 404);
    }

    const facultyRecord =
        record ??
        (await FacultyRecord.create({
            userId: user._id,
            researchInterests: [],
            professionalMemberships: [],
            certifications: [],
            awards: [],
            coursesTaught: [],
            administrativeResponsibilities: [],
            degrees: [],
            casEntries: [],
            pbasEntries: [],
            aqarEntries: [],
        }));

    return { user, facultyRecord };
}

export async function saveFacultyWorkspace(userId: string, rawInput: unknown) {
    const input = normalizeFacultyInput(rawInput);
    const payload = rawInput as Record<string, unknown>;
    const { user, facultyRecord } = await getFacultyWorkspace(userId);

    facultyRecord.employeeId = input.employeeId || undefined;
    facultyRecord.joiningDate = input.joiningDate || undefined;
    facultyRecord.biography = input.biography || undefined;
    facultyRecord.specialization = input.specialization || undefined;
    facultyRecord.researchInterests = input.researchInterests;
    facultyRecord.professionalMemberships = input.professionalMemberships;
    facultyRecord.certifications = input.certifications;
    facultyRecord.awards = input.awards;
    facultyRecord.coursesTaught = input.coursesTaught;
    facultyRecord.administrativeResponsibilities = input.administrativeResponsibilities;
    facultyRecord.degrees = input.degrees;
    if ("casEntries" in payload) {
        facultyRecord.casEntries = input.casEntries.map((entry) => {
            const { _id: _discardId, ...rest } = entry;
            void _discardId;

            return {
                ...rest,
                submittedAt: rest.status === "Submitted" ? new Date() : undefined,
            };
        });
    }

    if ("pbasEntries" in payload) {
        facultyRecord.pbasEntries = input.pbasEntries.map((entry) => {
            const { _id: _discardId, ...rest } = entry;
            void _discardId;

            return {
                ...rest,
                totalApiScore:
                    Number(rest.teachingScore ?? 0) +
                    Number(rest.researchScore ?? 0) +
                    Number(rest.institutionalScore ?? 0),
                submittedAt: new Date(),
            };
        });
    }
    if ("aqarEntries" in payload) {
        facultyRecord.aqarEntries = input.aqarEntries.map((entry) => {
            const { _id: _discardId, ...rest } = entry;
            void _discardId;

            return {
                ...rest,
                submittedAt: new Date(),
            };
        });
    }

    await facultyRecord.save();

    return {
        user,
        facultyRecord,
        message: "Faculty profile data saved successfully.",
    };
}

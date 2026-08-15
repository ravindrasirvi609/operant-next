import { Types } from "mongoose";

import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";
import Student from "@/models/student/student";
import Program from "@/models/academic/program";
import Faculty from "@/models/faculty/faculty";
import Semester from "@/models/reference/semester";
import StudentAcademicRecord from "@/models/student/student-academic-record";
import Placement from "@/models/student/placement";
import User from "@/models/core/user";
import {
    computeGraduatingCohortMetrics,
    computeStudentTeacherRatio,
} from "@/lib/naac-metric-warehouse/student-metrics";

beforeAll(async () => {
    await setupTestDatabase();
});

afterAll(async () => {
    await teardownTestDatabase();
});

afterEach(async () => {
    await clearDatabase();
});

describe("computeStudentTeacherRatio (integration)", () => {
    it("divides active students by active, permanent faculty", async () => {
        await Student.create([
            { enrollmentNo: "S1", firstName: "A", departmentId: new Types.ObjectId(), programId: new Types.ObjectId(), admissionYear: 2023, status: "Active" },
            { enrollmentNo: "S2", firstName: "B", departmentId: new Types.ObjectId(), programId: new Types.ObjectId(), admissionYear: 2023, status: "Active" },
            { enrollmentNo: "S3", firstName: "C", departmentId: new Types.ObjectId(), programId: new Types.ObjectId(), admissionYear: 2023, status: "Active" },
            { enrollmentNo: "S4", firstName: "D", departmentId: new Types.ObjectId(), programId: new Types.ObjectId(), admissionYear: 2023, status: "Active" },
            { enrollmentNo: "S5", firstName: "E", departmentId: new Types.ObjectId(), programId: new Types.ObjectId(), admissionYear: 2023, status: "Inactive" },
        ]);
        const facultyUser1 = await User.create({ name: "F1", email: "f1@example.com", role: "Faculty" });
        const facultyUser2 = await User.create({ name: "F2", email: "f2@example.com", role: "Faculty" });
        const adhocUser = await User.create({ name: "F3", email: "f3@example.com", role: "Faculty" });
        const departmentId = new Types.ObjectId();
        const institutionId = new Types.ObjectId();
        await Faculty.create([
            { userId: facultyUser1._id, employeeCode: "EMP1", firstName: "F1", employmentType: "Permanent", status: "Active", designation: "Assistant Professor", departmentId, institutionId },
            { userId: facultyUser2._id, employeeCode: "EMP2", firstName: "F2", employmentType: "Permanent", status: "Active", designation: "Assistant Professor", departmentId, institutionId },
            { userId: adhocUser._id, employeeCode: "EMP3", firstName: "F3", employmentType: "AdHoc", status: "Active", designation: "Assistant Professor", departmentId, institutionId },
        ]);

        const result = await computeStudentTeacherRatio();

        expect(result.studentCount).toBe(4);
        expect(result.facultyCount).toBe(2);
        expect(result.ratio).toBe(2);
    });

    it("returns a zero ratio when there are no full-time faculty", async () => {
        const result = await computeStudentTeacherRatio();
        expect(result.ratio).toBe(0);
    });
});

describe("computeGraduatingCohortMetrics (integration)", () => {
    async function makeProgram(durationYears: number) {
        return Program.create({
            name: `Program ${durationYears}y`,
            departmentId: new Types.ObjectId(),
            degreeType: "Bachelor",
            durationYears,
        });
    }

    async function makeStudent(programId: Types.ObjectId, admissionYear: number, enrollmentNo: string) {
        return Student.create({
            enrollmentNo,
            firstName: "Student",
            departmentId: new Types.ObjectId(),
            programId,
            admissionYear,
        });
    }

    it("computes pass and placement percentage for the students graduating in the target academic year", async () => {
        const program = await makeProgram(3);
        const finalSemester = await Semester.create({ semesterNumber: 6 });

        // Admitted 2021 + 3-year duration -> graduates starting academic year 2023-2024.
        const passingStudent = await makeStudent(program._id, 2021, "GRAD-1");
        const failingStudent = await makeStudent(program._id, 2021, "GRAD-2");
        const noRecordStudent = await makeStudent(program._id, 2021, "GRAD-3");
        const promotedStudent = await makeStudent(program._id, 2021, "GRAD-4");

        // Admitted 2020 -> graduates starting academic year 2022-2023, must NOT be in this cohort.
        const priorCohortStudent = await makeStudent(program._id, 2020, "GRAD-OLD");

        await StudentAcademicRecord.create([
            { studentId: passingStudent._id, semesterId: finalSemester._id, resultStatus: "Pass" },
            { studentId: failingStudent._id, semesterId: finalSemester._id, resultStatus: "Fail" },
            { studentId: promotedStudent._id, semesterId: finalSemester._id, resultStatus: "Promoted" },
            { studentId: priorCohortStudent._id, semesterId: finalSemester._id, resultStatus: "Pass" },
        ]);

        await Placement.create({ studentId: passingStudent._id, companyName: "Acme" });

        const result = await computeGraduatingCohortMetrics("2023-2024");

        expect(result.cohortSize).toBe(4);
        expect(result.appearedCount).toBe(3);
        expect(result.passedCount).toBe(2);
        expect(result.passPercentage).toBe(Number(((2 / 3) * 100).toFixed(2)));
        expect(result.placedCount).toBe(1);
        expect(result.placementPercentage).toBe(25);
        void noRecordStudent;
    });

    it("returns zero percentages without dividing by zero when no students graduate that year", async () => {
        const result = await computeGraduatingCohortMetrics("2099-2100");

        expect(result.cohortSize).toBe(0);
        expect(result.appearedCount).toBe(0);
        expect(result.passPercentage).toBe(0);
        expect(result.placementPercentage).toBe(0);
    });
});

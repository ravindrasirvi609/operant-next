import { parseAcademicYearLabel } from "@/lib/academic-year";
import dbConnect from "@/lib/dbConnect";
import Student from "@/models/student/student";
import Program from "@/models/academic/program";
import Faculty from "@/models/faculty/faculty";
import Semester from "@/models/reference/semester";
import StudentAcademicRecord from "@/models/student/student-academic-record";
import Placement from "@/models/student/placement";

/** NAAC 2.2.2 — total active students against full-time (Permanent) faculty. */
export async function computeStudentTeacherRatio() {
    await dbConnect();
    const [studentCount, facultyCount] = await Promise.all([
        Student.countDocuments({ status: "Active" }),
        Faculty.countDocuments({ employmentType: "Permanent", status: "Active" }),
    ]);

    return {
        studentCount,
        facultyCount,
        ratio: facultyCount > 0 ? Number((studentCount / facultyCount).toFixed(2)) : 0,
    };
}

export type GraduatingCohortMetrics = {
    cohortSize: number;
    appearedCount: number;
    passedCount: number;
    placedCount: number;
    passPercentage: number;
    placementPercentage: number;
};

const passingResultStatuses = new Set(["Pass", "Promoted"]);

/**
 * NAAC 2.6.3 (pass %) and 5.2.2 (placement %) for the students graduating in
 * `academicYearLabel`. Neither StudentAcademicRecord nor Placement carries an
 * academic-year field, so the graduating cohort is derived algebraically from
 * admissionYear + Program.durationYears (assumes 2 semesters/year).
 */
export async function computeGraduatingCohortMetrics(
    academicYearLabel: string
): Promise<GraduatingCohortMetrics> {
    await dbConnect();
    const parsed = parseAcademicYearLabel(academicYearLabel);

    if (!parsed) {
        return {
            cohortSize: 0,
            appearedCount: 0,
            passedCount: 0,
            placedCount: 0,
            passPercentage: 0,
            placementPercentage: 0,
        };
    }

    const [students, programs, semesters, records, placements] = await Promise.all([
        Student.find({}).select("_id admissionYear programId").lean(),
        Program.find({}).select("_id durationYears").lean(),
        Semester.find({}).select("_id semesterNumber").lean(),
        StudentAcademicRecord.find({}).select("_id studentId semesterId resultStatus").lean(),
        Placement.find({}).select("_id studentId").lean(),
    ]);

    const durationByProgramId = new Map(programs.map((program) => [String(program._id), program.durationYears]));
    const semesterNumberById = new Map(semesters.map((semester) => [String(semester._id), semester.semesterNumber]));
    const placedStudentIds = new Set(placements.map((placement) => String(placement.studentId)));

    const cohort = students.filter((student) => {
        const durationYears = durationByProgramId.get(String(student.programId));
        if (!durationYears) {
            return false;
        }
        const graduationStartYear = student.admissionYear + durationYears - 1;
        return graduationStartYear === parsed.start;
    });

    const cohortIds = new Set(cohort.map((student) => String(student._id)));
    const finalSemesterByStudentId = new Map(
        cohort.map((student) => [
            String(student._id),
            (durationByProgramId.get(String(student.programId)) ?? 0) * 2,
        ])
    );

    const finalYearRecords = records.filter((record) => {
        const studentId = String(record.studentId);
        if (!cohortIds.has(studentId)) {
            return false;
        }
        const semesterNumber = semesterNumberById.get(String(record.semesterId));
        return semesterNumber === finalSemesterByStudentId.get(studentId);
    });

    const appeared = finalYearRecords.filter((record) => record.resultStatus != null);
    const passed = appeared.filter((record) => passingResultStatuses.has(record.resultStatus as string));
    const placedCount = cohort.filter((student) => placedStudentIds.has(String(student._id))).length;

    return {
        cohortSize: cohort.length,
        appearedCount: appeared.length,
        passedCount: passed.length,
        placedCount,
        passPercentage:
            appeared.length > 0 ? Number(((passed.length / appeared.length) * 100).toFixed(2)) : 0,
        placementPercentage:
            cohort.length > 0 ? Number(((placedCount / cohort.length) * 100).toFixed(2)) : 0,
    };
}

import { Types } from "mongoose";

import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";
import Student from "@/models/student/student";
import Faculty from "@/models/faculty/faculty";
import StudentSupportMentorGroup from "@/models/student/student-support-mentor-group";
import StudentSupportGrievance from "@/models/student/student-support-grievance";
import StudentSupportProgression from "@/models/student/student-support-progression";
import StudentSupportRepresentation from "@/models/student/student-support-representation";
import type { IStudentSupportGovernanceAssignment } from "@/models/student/student-support-governance-assignment";
import { AuthError } from "@/lib/auth/errors";
import { studentSupportGovernanceContributionDraftSchema } from "@/lib/student-support-governance/validators";
import {
    syncGrievances,
    syncMentorGroups,
    syncProgressions,
    syncRepresentations,
} from "@/lib/student-support-governance/service";

beforeAll(async () => {
    await setupTestDatabase();
});

afterAll(async () => {
    await teardownTestDatabase();
});

afterEach(async () => {
    await clearDatabase();
});

function fakeAssignment() {
    return {
        _id: new Types.ObjectId(),
        planId: new Types.ObjectId(),
    } as unknown as IStudentSupportGovernanceAssignment;
}

async function makeStudent(enrollmentNo: string) {
    return Student.create({
        enrollmentNo,
        firstName: "Student",
        departmentId: new Types.ObjectId(),
        programId: new Types.ObjectId(),
        admissionYear: 2023,
    });
}

async function makeFaculty(employeeCode: string) {
    return Faculty.create({
        employeeCode,
        firstName: "Mentor",
        designation: "Assistant Professor",
        departmentId: new Types.ObjectId(),
        institutionId: new Types.ObjectId(),
    });
}

describe("syncGrievances (integration)", () => {
    it("links a real student and persists studentId", async () => {
        const student = await makeStudent("GRV-1");
        const input = studentSupportGovernanceContributionDraftSchema.parse({
            grievances: [{ studentId: student._id.toString() }],
        });

        const ids = await syncGrievances(fakeAssignment(), input);

        const saved = await StudentSupportGrievance.findById(ids[0]);
        expect(saved?.studentId?.toString()).toBe(student._id.toString());
    });

    it("rejects a grievance linked to a student that does not exist", async () => {
        const input = studentSupportGovernanceContributionDraftSchema.parse({
            grievances: [{ studentId: new Types.ObjectId().toString() }],
        });

        await expect(syncGrievances(fakeAssignment(), input)).rejects.toThrow(AuthError);
    });

    it("still allows an anonymous grievance with no studentId", async () => {
        const input = studentSupportGovernanceContributionDraftSchema.parse({
            grievances: [{ category: "Harassment", lodgedByType: "Anonymous" }],
        });

        const ids = await syncGrievances(fakeAssignment(), input);

        const saved = await StudentSupportGrievance.findById(ids[0]);
        expect(saved?.studentId).toBeUndefined();
    });
});

describe("syncMentorGroups (integration)", () => {
    it("links a real mentor and mentees, deriving menteeCount from menteeIds", async () => {
        const mentor = await makeFaculty("FAC-1");
        const mentee1 = await makeStudent("MG-1");
        const mentee2 = await makeStudent("MG-2");
        const input = studentSupportGovernanceContributionDraftSchema.parse({
            mentorGroups: [
                {
                    groupName: "Group A",
                    mentorId: mentor._id.toString(),
                    menteeIds: [mentee1._id.toString(), mentee2._id.toString()],
                    menteeCount: 99,
                },
            ],
        });

        const ids = await syncMentorGroups(fakeAssignment(), input);

        const saved = await StudentSupportMentorGroup.findById(ids[0]);
        expect(saved?.mentorId?.toString()).toBe(mentor._id.toString());
        expect(saved?.menteeIds?.map(String)).toEqual([mentee1._id.toString(), mentee2._id.toString()]);
        expect(saved?.menteeCount).toBe(2);
    });

    it("rejects a mentor group referencing a nonexistent mentee", async () => {
        const input = studentSupportGovernanceContributionDraftSchema.parse({
            mentorGroups: [
                { groupName: "Group B", menteeIds: [new Types.ObjectId().toString()] },
            ],
        });

        await expect(syncMentorGroups(fakeAssignment(), input)).rejects.toThrow(AuthError);
    });

    it("keeps the manually entered menteeCount when no menteeIds are provided", async () => {
        const input = studentSupportGovernanceContributionDraftSchema.parse({
            mentorGroups: [{ groupName: "Group C", menteeCount: 12 }],
        });

        const ids = await syncMentorGroups(fakeAssignment(), input);

        const saved = await StudentSupportMentorGroup.findById(ids[0]);
        expect(saved?.menteeCount).toBe(12);
    });
});

describe("syncProgressions (integration)", () => {
    it("links real students and derives studentCount from studentIds", async () => {
        const student = await makeStudent("PR-1");
        const input = studentSupportGovernanceContributionDraftSchema.parse({
            progressionRows: [
                {
                    title: "Campus placement drive",
                    studentIds: [student._id.toString()],
                    studentCount: 50,
                },
            ],
        });

        const ids = await syncProgressions(fakeAssignment(), input);

        const saved = await StudentSupportProgression.findById(ids[0]);
        expect(saved?.studentIds?.map(String)).toEqual([student._id.toString()]);
        expect(saved?.studentCount).toBe(1);
    });
});

describe("syncRepresentations (integration)", () => {
    it("links real students and derives studentCount from studentIds", async () => {
        const student = await makeStudent("REP-1");
        const input = studentSupportGovernanceContributionDraftSchema.parse({
            representationRows: [
                {
                    bodyName: "Student Council",
                    studentIds: [student._id.toString()],
                },
            ],
        });

        const ids = await syncRepresentations(fakeAssignment(), input);

        const saved = await StudentSupportRepresentation.findById(ids[0]);
        expect(saved?.studentIds?.map(String)).toEqual([student._id.toString()]);
        expect(saved?.studentCount).toBe(1);
    });
});

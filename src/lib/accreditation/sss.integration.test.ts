import { Types } from "mongoose";

import { clearDatabase, setupTestDatabase, teardownTestDatabase } from "@/test/db";
import Student from "@/models/student/student";
import User from "@/models/core/user";
import SssSurvey from "@/models/engagement/sss-survey";
import SssQuestion from "@/models/engagement/sss-question";
import SssEligibleStudent from "@/models/engagement/sss-eligible-student";
import SssResultAnalytics from "@/models/engagement/sss-result-analytics";
import Notification from "@/models/core/notification";
import { AuthError } from "@/lib/auth/errors";
import {
    createSssSurvey,
    submitStudentSssResponse,
    updateSssSurvey,
} from "@/lib/accreditation/service";

beforeAll(async () => {
    await setupTestDatabase();
});

afterAll(async () => {
    await teardownTestDatabase();
});

afterEach(async () => {
    await clearDatabase();
});

const admin = { id: new Types.ObjectId().toString(), name: "Admin", role: "Admin" };

async function makeStudentWithUser(enrollmentNo: string) {
    const student = await Student.create({
        enrollmentNo,
        firstName: "Student",
        departmentId: new Types.ObjectId(),
        programId: new Types.ObjectId(),
        admissionYear: 2023,
        institutionId: new Types.ObjectId(),
    });
    const user = await User.create({
        name: `Student ${enrollmentNo}`,
        email: `${enrollmentNo.toLowerCase()}@example.com`,
        role: "Student",
        studentId: student._id,
        emailVerified: true,
    });
    student.userId = user._id;
    await student.save();
    return { student, user };
}

function surveyInput(overrides: Record<string, unknown> = {}) {
    return {
        institutionId: new Types.ObjectId().toString(),
        academicYearId: new Types.ObjectId().toString(),
        surveyTitle: "Annual SSS",
        surveyStatus: "Draft",
        startDate: "2024-06-01",
        endDate: "2024-06-30",
        questions: [
            { questionText: "Teaching is effective.", questionType: "Rating", ratingScaleMax: 5, displayOrder: 1, isMandatory: true, analyticsBucket: "TeachingLearning" },
            { questionText: "What would you improve?", questionType: "Subjective", displayOrder: 2, isMandatory: true, analyticsBucket: "General" },
        ],
        ...overrides,
    };
}

describe("createSssSurvey (integration)", () => {
    it("persists the question type for both rating and subjective questions", async () => {
        const survey = await createSssSurvey(admin, surveyInput());

        const questions = await SssQuestion.find({ surveyId: survey._id }).sort({ displayOrder: 1 });
        expect(questions.map((q) => q.questionType)).toEqual(["Rating", "Subjective"]);
    });

    it("notifies eligible students immediately when created as Active", async () => {
        const { student, user } = await makeStudentWithUser("SSS-1");
        const survey = await createSssSurvey(
            admin,
            surveyInput({ surveyStatus: "Active", eligibleStudentIds: [student._id.toString()] })
        );

        const notifications = await Notification.find({ userId: user._id });
        expect(notifications.length).toBe(1);
        expect(notifications[0].entityId).toBe(survey._id.toString());
    });

    it("normalizes a user id to the linked student id for eligibility", async () => {
        const { student, user } = await makeStudentWithUser("SSS-USER-ID");
        const survey = await createSssSurvey(
            admin,
            surveyInput({ surveyStatus: "Active", eligibleStudentIds: [user._id.toString()] })
        );

        const eligibility = await SssEligibleStudent.findOne({ surveyId: survey._id });
        expect(eligibility?.studentId.toString()).toBe(student._id.toString());
    });

    it("does not notify anyone while the survey is still Draft", async () => {
        const { student, user } = await makeStudentWithUser("SSS-2");
        await createSssSurvey(admin, surveyInput({ eligibleStudentIds: [student._id.toString()] }));

        const notifications = await Notification.find({ userId: user._id });
        expect(notifications.length).toBe(0);
    });
});

describe("submitStudentSssResponse (integration)", () => {
    async function makeActiveSurveyWithStudent() {
        const { student, user } = await makeStudentWithUser("SUB-1");
        const survey = await createSssSurvey(
            admin,
            surveyInput({ surveyStatus: "Active", eligibleStudentIds: [student._id.toString()] })
        );
        const questions = await SssQuestion.find({ surveyId: survey._id }).sort({ displayOrder: 1 });
        return { survey, student, user, ratingQuestion: questions[0], subjectiveQuestion: questions[1] };
    }

    it("accepts a rating answer for a rating question and a text answer for a subjective question", async () => {
        const { survey, student, ratingQuestion, subjectiveQuestion } = await makeActiveSurveyWithStudent();

        await submitStudentSssResponse(
            { id: student.userId!.toString(), name: "Student", role: "Student" },
            survey._id.toString(),
            {
                answers: [
                    { questionId: ratingQuestion._id.toString(), ratingValue: 4 },
                    { questionId: subjectiveQuestion._id.toString(), textAnswer: "More library hours." },
                ],
            }
        );

        const analytics = await SssResultAnalytics.findOne({ surveyId: survey._id });
        expect(analytics?.submittedResponses).toBe(1);
    });

    it("rejects a rating value submitted for a subjective question", async () => {
        const { survey, student, subjectiveQuestion, ratingQuestion } = await makeActiveSurveyWithStudent();

        await expect(
            submitStudentSssResponse(
                { id: student.userId!.toString(), name: "Student", role: "Student" },
                survey._id.toString(),
                {
                    answers: [
                        { questionId: ratingQuestion._id.toString(), ratingValue: 4 },
                        { questionId: subjectiveQuestion._id.toString(), ratingValue: 3 },
                    ],
                }
            )
        ).rejects.toThrow(AuthError);
    });

    it("rejects a text answer submitted for a rating question", async () => {
        const { survey, student, subjectiveQuestion, ratingQuestion } = await makeActiveSurveyWithStudent();

        await expect(
            submitStudentSssResponse(
                { id: student.userId!.toString(), name: "Student", role: "Student" },
                survey._id.toString(),
                {
                    answers: [
                        { questionId: ratingQuestion._id.toString(), textAnswer: "five" },
                        { questionId: subjectiveQuestion._id.toString(), textAnswer: "Better wifi." },
                    ],
                }
            )
        ).rejects.toThrow(AuthError);
    });

    it("excludes subjective answers from the rating-based analytics averages", async () => {
        const { survey, student, ratingQuestion, subjectiveQuestion } = await makeActiveSurveyWithStudent();

        await submitStudentSssResponse(
            { id: student.userId!.toString(), name: "Student", role: "Student" },
            survey._id.toString(),
            {
                answers: [
                    { questionId: ratingQuestion._id.toString(), ratingValue: 5 },
                    { questionId: subjectiveQuestion._id.toString(), textAnswer: "N/A" },
                ],
            }
        );

        const analytics = await SssResultAnalytics.findOne({ surveyId: survey._id });
        // Only one rating (5 of 5 = 100%); a bug would drag this toward 50% by
        // averaging in an implicit 0 for the subjective answer.
        expect(analytics?.overallSatisfactionIndex).toBe(100);
    });
});

describe("SSS response-rate threshold (integration)", () => {
    it("computes the NAAC minimum as 10% of eligible students, capped at 500", async () => {
        const students = await Promise.all(
            Array.from({ length: 10 }, (_, i) => makeStudentWithUser(`RATE-${i}`))
        );
        const survey = await createSssSurvey(
            admin,
            surveyInput({
                surveyStatus: "Active",
                eligibleStudentIds: students.map(({ student }) => student._id.toString()),
            })
        );

        const analytics = await SssResultAnalytics.findOne({ surveyId: survey._id });
        expect(analytics?.minimumRequiredResponses).toBe(1);
        expect(analytics?.meetsResponseRateThreshold).toBe(false);

        const [ratingQuestion] = await SssQuestion.find({ surveyId: survey._id }).sort({ displayOrder: 1 });
        await submitStudentSssResponse(
            { id: students[0].student.userId!.toString(), name: "Student", role: "Student" },
            survey._id.toString(),
            { answers: [{ questionId: ratingQuestion._id.toString(), ratingValue: 5 }, { questionId: (await SssQuestion.find({ surveyId: survey._id }))[1]._id.toString(), textAnswer: "ok" }] }
        );

        const updatedAnalytics = await SssResultAnalytics.findOne({ surveyId: survey._id });
        expect(updatedAnalytics?.meetsResponseRateThreshold).toBe(true);
    });
});

describe("updateSssSurvey eligible-student sync (integration)", () => {
    it("preserves existing submission state for students who remain eligible", async () => {
        const { student, user } = await makeStudentWithUser("KEEP-1");
        const survey = await createSssSurvey(
            admin,
            surveyInput({ surveyStatus: "Active", eligibleStudentIds: [student._id.toString()] })
        );
        const [ratingQuestion, subjectiveQuestion] = await SssQuestion.find({ surveyId: survey._id }).sort({ displayOrder: 1 });
        await submitStudentSssResponse(
            { id: user._id.toString(), name: "Student", role: "Student" },
            survey._id.toString(),
            {
                answers: [
                    { questionId: ratingQuestion._id.toString(), ratingValue: 4 },
                    { questionId: subjectiveQuestion._id.toString(), textAnswer: "Fine." },
                ],
            }
        );

        const { student: newStudent } = await makeStudentWithUser("KEEP-2");
        await updateSssSurvey(admin, survey._id.toString(), {
            eligibleStudentIds: [student._id.toString(), newStudent._id.toString()],
        });

        const existingEligibility = await SssEligibleStudent.findOne({ surveyId: survey._id, studentId: student._id });
        const newEligibility = await SssEligibleStudent.findOne({ surveyId: survey._id, studentId: newStudent._id });

        expect(existingEligibility?.isResponseSubmitted).toBe(true);
        expect(newEligibility?.isResponseSubmitted).toBe(false);
    });

    it("removes eligibility for students dropped from the list", async () => {
        const { student } = await makeStudentWithUser("DROP-1");
        const survey = await createSssSurvey(
            admin,
            surveyInput({ eligibleStudentIds: [student._id.toString()] })
        );

        await updateSssSurvey(admin, survey._id.toString(), { eligibleStudentIds: [] });

        const remaining = await SssEligibleStudent.findOne({ surveyId: survey._id, studentId: student._id });
        expect(remaining).toBeNull();
    });

    it("notifies newly eligible students when the survey transitions from Draft to Active", async () => {
        const { student, user } = await makeStudentWithUser("NOTIFY-1");
        const survey = await createSssSurvey(
            admin,
            surveyInput({ eligibleStudentIds: [student._id.toString()] })
        );
        expect(await Notification.countDocuments({ userId: user._id })).toBe(0);

        await updateSssSurvey(admin, survey._id.toString(), { surveyStatus: "Active" });

        expect(await Notification.countDocuments({ userId: user._id })).toBe(1);
    });
});

import { randomUUID } from "crypto";
import { Types } from "mongoose";

import dbConnect from "@/lib/dbConnect";
import { AuthError } from "@/lib/auth/errors";
import { createAuditLog, type AuditRequestContext } from "@/lib/audit/service";
import { resolveAuthorizationProfile, type AuthorizationActor } from "@/lib/authorization/service";
import AcademicYear from "@/models/reference/academic-year";
import Institution from "@/models/reference/institution";
import Department from "@/models/reference/department";
import Program from "@/models/academic/program";
import User from "@/models/core/user";
import Student from "@/models/student/student";
import DocumentModel from "@/models/reference/document";
import SssSurvey from "@/models/engagement/sss-survey";
import SssQuestion from "@/models/engagement/sss-question";
import SssEligibleStudent from "@/models/engagement/sss-eligible-student";
import SssResponse from "@/models/engagement/sss-response";
import SssResponseDetail from "@/models/engagement/sss-response-detail";
import SssResultAnalytics from "@/models/engagement/sss-result-analytics";
import AisheSurveyCycle from "@/models/reporting/aishe-survey-cycle";
import AisheInstitutionProfile from "@/models/reporting/aishe-institution-profile";
import AisheProgramStatistic from "@/models/reporting/aishe-program-statistic";
import AisheStudentEnrollment from "@/models/reporting/aishe-student-enrollment";
import AisheFacultyStatistic from "@/models/reporting/aishe-faculty-statistic";
import AisheStaffStatistic from "@/models/reporting/aishe-staff-statistic";
import AisheInfrastructureStatistic from "@/models/reporting/aishe-infrastructure-statistic";
import AisheFinancialStatistic from "@/models/reporting/aishe-financial-statistic";
import AisheStudentSupportStatistic from "@/models/reporting/aishe-student-support-statistic";
import AisheSubmissionLog from "@/models/reporting/aishe-submission-log";
import AisheSupportingDocument from "@/models/reporting/aishe-supporting-document";
import NirfRankingCycle from "@/models/reporting/nirf-ranking-cycle";
import NirfParameter from "@/models/reporting/nirf-parameter";
import NirfMetric from "@/models/reporting/nirf-metric";
import NirfMetricValue from "@/models/reporting/nirf-metric-value";
import NirfMetricScore from "@/models/reporting/nirf-metric-score";
import NirfParameterScore from "@/models/reporting/nirf-parameter-score";
import NirfCompositeScore from "@/models/reporting/nirf-composite-score";
import NirfBenchmarkDataset from "@/models/reporting/nirf-benchmark-dataset";
import NirfDepartmentContribution from "@/models/reporting/nirf-department-contribution";
import NirfTrendAnalysis from "@/models/reporting/nirf-trend-analysis";
import NirfSubmissionLog from "@/models/reporting/nirf-submission-log";
import NirfMetricDocument from "@/models/reporting/nirf-metric-document";
import RegulatoryBody from "@/models/core/regulatory-body";
import InstitutionalApproval from "@/models/core/institutional-approval";
import StatutoryComplianceReport from "@/models/core/statutory-compliance-report";
import InspectionVisit from "@/models/core/inspection-visit";
import ComplianceActionItem from "@/models/core/compliance-action-item";
import {
    aisheCycleSchema,
    aisheCycleUpdateSchema,
    complianceActionItemSchema,
    complianceActionItemUpdateSchema,
    inspectionVisitSchema,
    inspectionVisitUpdateSchema,
    institutionalApprovalSchema,
    institutionalApprovalUpdateSchema,
    nirfCycleSchema,
    nirfCycleUpdateSchema,
    regulatoryBodySchema,
    regulatoryBodyUpdateSchema,
    sssStudentResponseSchema,
    sssSurveySchema,
    sssSurveyUpdateSchema,
    statutoryComplianceReportSchema,
    statutoryComplianceReportUpdateSchema,
} from "@/lib/accreditation/validators";

type AccreditationActor = {
    id: string;
    name: string;
    role: string;
    auditContext?: AuditRequestContext;
};

type StudentActor = {
    id: string;
    name: string;
    role: string;
};

const defaultSssQuestionBlueprint = [
    {
        questionText: "The teaching and mentoring process in your institution facilitates you in cognitive, social and emotional growth.",
        ratingScaleMax: 5,
        displayOrder: 1,
        isMandatory: true,
        analyticsBucket: "TeachingLearning" as const,
    },
    {
        questionText: "The institution provides adequate infrastructure and learning resources for your academic needs.",
        ratingScaleMax: 5,
        displayOrder: 2,
        isMandatory: true,
        analyticsBucket: "Infrastructure" as const,
    },
    {
        questionText: "Student support services such as guidance, grievance handling, and mentoring are effective.",
        ratingScaleMax: 5,
        displayOrder: 3,
        isMandatory: true,
        analyticsBucket: "StudentSupport" as const,
    },
    {
        questionText: "Governance, communication, and institutional responsiveness meet your expectations.",
        ratingScaleMax: 5,
        displayOrder: 4,
        isMandatory: true,
        analyticsBucket: "Governance" as const,
    },
] as const;

const defaultNirfParameterBlueprint = [
    { parameterCode: "TLR", parameterName: "Teaching Learning and Resources", weightagePercentage: 30, displayOrder: 1 },
    { parameterCode: "RPC", parameterName: "Research and Professional Practice", weightagePercentage: 30, displayOrder: 2 },
    { parameterCode: "GO", parameterName: "Graduation Outcomes", weightagePercentage: 20, displayOrder: 3 },
    { parameterCode: "OI", parameterName: "Outreach and Inclusivity", weightagePercentage: 10, displayOrder: 4 },
    { parameterCode: "PR", parameterName: "Perception", weightagePercentage: 10, displayOrder: 5 },
] as const;

function ensureAdminActor(actor: AccreditationActor) {
    if (actor.role !== "Admin") {
        throw new AuthError("Admin access is required.", 403);
    }
}

function ensureObjectId(value: string, message = "Invalid identifier.") {
    if (!Types.ObjectId.isValid(value)) {
        throw new AuthError(message, 400);
    }

    return new Types.ObjectId(value);
}

function toDate(value?: string | Date | null) {
    if (!value) {
        return undefined;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new AuthError(`Invalid date "${value}".`, 400);
    }

    return parsed;
}

async function createAuditEntry(
    actor: AccreditationActor | undefined,
    action: string,
    tableName: string,
    recordId: string,
    oldData?: unknown,
    newData?: unknown
) {
    if (!actor?.id) {
        return;
    }

    await createAuditLog({
        actor: { id: actor.id, name: actor.name, role: actor.role },
        action,
        tableName,
        recordId,
        oldData,
        newData,
        auditContext: actor.auditContext,
    });
}

function toOption(record: Record<string, any>, label = "name") {
    return {
        id: String(record._id),
        label: String(record[label] ?? record.name ?? record.title ?? record.email ?? record.code ?? ""),
    };
}

async function replaceMany<ModelInput extends Record<string, unknown>>(
    model: any,
    filter: Record<string, unknown>,
    records: ModelInput[]
) {
    await model.deleteMany(filter);
    if (records.length) {
        await model.insertMany(records);
    }
}

async function recomputeSssAnalytics(surveyId: string | Types.ObjectId) {
    const resolvedSurveyId = typeof surveyId === "string" ? new Types.ObjectId(surveyId) : surveyId;
    const [questions, eligibles, responses] = await Promise.all([
        SssQuestion.find({ surveyId: resolvedSurveyId }).lean(),
        SssEligibleStudent.find({ surveyId: resolvedSurveyId }).lean(),
        SssResponse.find({ surveyId: resolvedSurveyId }).select("_id").lean(),
    ]);

    const responseIds = responses.map((item) => item._id);
    const details = responseIds.length
        ? await SssResponseDetail.find({ responseId: { $in: responseIds } }).lean()
        : [];

    const questionsById = new Map(questions.map((question) => [String(question._id), question]));
    const totalEligible = eligibles.length;
    const submittedResponses = responses.length;
    const responseRate = totalEligible > 0 ? Number(((submittedResponses / totalEligible) * 100).toFixed(2)) : 0;

    const averageForBucket = (bucket?: string) => {
        const scopedDetails = details.filter((detail) => {
            const question = questionsById.get(String(detail.questionId));
            return bucket ? question?.analyticsBucket === bucket : true;
        });

        if (!scopedDetails.length) {
            return 0;
        }

        const normalized = scopedDetails.map((detail) => {
            const question = questionsById.get(String(detail.questionId));
            const max = Math.max(1, Number(question?.ratingScaleMax ?? 5));
            return (Number(detail.ratingValue ?? 0) / max) * 100;
        });

        return Number((normalized.reduce((sum, value) => sum + value, 0) / normalized.length).toFixed(2));
    };

    const payload = {
        overallSatisfactionIndex: averageForBucket(),
        teachingLearningScore: averageForBucket("TeachingLearning"),
        infrastructureScore: averageForBucket("Infrastructure"),
        studentSupportScore: averageForBucket("StudentSupport"),
        governanceScore: averageForBucket("Governance"),
        submittedResponses,
        eligibleResponses: totalEligible,
        responseRate,
        generatedAt: new Date(),
    };

    await SssResultAnalytics.updateOne(
        { surveyId: resolvedSurveyId },
        { $set: payload, $setOnInsert: { surveyId: resolvedSurveyId } },
        { upsert: true }
    );

    return SssResultAnalytics.findOne({ surveyId: resolvedSurveyId }).lean();
}

async function loadSssAdminRecords() {
    const [surveys, questions, eligibles, analytics] = await Promise.all([
        SssSurvey.find({}).sort({ createdAt: -1 }).lean(),
        SssQuestion.find({}).sort({ surveyId: 1, displayOrder: 1 }).lean(),
        SssEligibleStudent.find({}).lean(),
        SssResultAnalytics.find({}).lean(),
    ]);

    const analyticsBySurveyId = new Map(analytics.map((item) => [String(item.surveyId), item]));
    const questionCountBySurveyId = questions.reduce<Map<string, number>>((map, item) => {
        const key = String(item.surveyId);
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
    }, new Map());
    const eligibleCountBySurveyId = eligibles.reduce<Map<string, number>>((map, item) => {
        const key = String(item.surveyId);
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
    }, new Map());

    return surveys.map((survey) => ({
        ...survey,
        questionCount: questionCountBySurveyId.get(String(survey._id)) ?? 0,
        eligibleCount: eligibleCountBySurveyId.get(String(survey._id)) ?? 0,
        analytics: analyticsBySurveyId.get(String(survey._id)) ?? null,
        questions: questions
            .filter((question) => String(question.surveyId) === String(survey._id))
            .map((question) => ({
                ...question,
                _id: String(question._id),
                surveyId: String(question.surveyId),
            })),
        eligibleStudentIds: eligibles
            .filter((item) => String(item.surveyId) === String(survey._id))
            .map((item) => String(item.studentId)),
    }));
}

async function loadAisheAdminRecords() {
    const [
        cycles,
        profiles,
        programStatistics,
        enrollments,
        facultyStats,
        staffStats,
        infrastructureStats,
        financialStats,
        studentSupportStats,
        submissionLogs,
        supportingDocuments,
    ] = await Promise.all([
        AisheSurveyCycle.find({}).sort({ createdAt: -1 }).lean(),
        AisheInstitutionProfile.find({}).lean(),
        AisheProgramStatistic.find({}).lean(),
        AisheStudentEnrollment.find({}).lean(),
        AisheFacultyStatistic.find({}).lean(),
        AisheStaffStatistic.find({}).lean(),
        AisheInfrastructureStatistic.find({}).lean(),
        AisheFinancialStatistic.find({}).lean(),
        AisheStudentSupportStatistic.find({}).lean(),
        AisheSubmissionLog.find({}).lean(),
        AisheSupportingDocument.find({}).lean(),
    ]);

    const profileByCycleId = new Map(profiles.map((item) => [String(item.surveyCycleId), item]));
    const programStatisticsByCycleId = programStatistics.reduce<Map<string, typeof programStatistics>>((map, item) => {
        const key = String(item.surveyCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());
    const enrollmentByCycleId = enrollments.reduce<Map<string, number>>((map, item) => {
        const key = String(item.surveyCycleId);
        const total =
            Number(item.maleStudents ?? 0) +
            Number(item.femaleStudents ?? 0) +
            Number(item.transgenderStudents ?? 0);
        map.set(key, (map.get(key) ?? 0) + total);
        return map;
    }, new Map());
    const facultyByCycleId = facultyStats.reduce<Map<string, number>>((map, item) => {
        const key = String(item.surveyCycleId);
        map.set(key, (map.get(key) ?? 0) + Number(item.totalFaculty ?? 0));
        return map;
    }, new Map());
    const studentEnrollmentsByCycleId = enrollments.reduce<Map<string, typeof enrollments>>((map, item) => {
        const key = String(item.surveyCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());
    const facultyStatisticsByCycleId = facultyStats.reduce<Map<string, typeof facultyStats>>((map, item) => {
        const key = String(item.surveyCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());
    const staffStatsByCycleId = new Map(staffStats.map((item) => [String(item.surveyCycleId), item]));
    const infrastructureStatsByCycleId = new Map(
        infrastructureStats.map((item) => [String(item.surveyCycleId), item])
    );
    const financialStatsByCycleId = new Map(financialStats.map((item) => [String(item.surveyCycleId), item]));
    const studentSupportStatsByCycleId = new Map(
        studentSupportStats.map((item) => [String(item.surveyCycleId), item])
    );
    const submissionLogsByCycleId = submissionLogs.reduce<Map<string, typeof submissionLogs>>((map, item) => {
        const key = String(item.surveyCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());
    const supportingDocumentsByCycleId = supportingDocuments.reduce<Map<string, typeof supportingDocuments>>((map, item) => {
        const key = String(item.surveyCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());

    return cycles.map((cycle) => ({
        ...cycle,
        institutionProfile: profileByCycleId.get(String(cycle._id)) ?? null,
        totalEnrollment: enrollmentByCycleId.get(String(cycle._id)) ?? 0,
        totalFaculty: facultyByCycleId.get(String(cycle._id)) ?? 0,
        programStatistics: programStatisticsByCycleId.get(String(cycle._id)) ?? [],
        studentEnrollments: studentEnrollmentsByCycleId.get(String(cycle._id)) ?? [],
        facultyStatistics: facultyStatisticsByCycleId.get(String(cycle._id)) ?? [],
        staffStatistics: staffStatsByCycleId.get(String(cycle._id)) ?? null,
        infrastructureStatistics: infrastructureStatsByCycleId.get(String(cycle._id)) ?? null,
        financialStatistics: financialStatsByCycleId.get(String(cycle._id)) ?? null,
        studentSupportStatistics: studentSupportStatsByCycleId.get(String(cycle._id)) ?? null,
        submissionLogs: submissionLogsByCycleId.get(String(cycle._id)) ?? [],
        supportingDocuments: supportingDocumentsByCycleId.get(String(cycle._id)) ?? [],
    }));
}

async function loadNirfAdminRecords() {
    const [
        cycles,
        compositeScores,
        parameters,
        metrics,
        values,
        scores,
        benchmarks,
        departmentContributions,
        trends,
        submissionLogs,
        metricDocuments,
    ] = await Promise.all([
        NirfRankingCycle.find({}).sort({ rankingYear: -1, createdAt: -1 }).lean(),
        NirfCompositeScore.find({}).lean(),
        NirfParameter.find({}).sort({ displayOrder: 1 }).lean(),
        NirfMetric.find({}).lean(),
        NirfMetricValue.find({}).lean(),
        NirfMetricScore.find({}).lean(),
        NirfBenchmarkDataset.find({}).lean(),
        NirfDepartmentContribution.find({}).lean(),
        NirfTrendAnalysis.find({}).lean(),
        NirfSubmissionLog.find({}).lean(),
        NirfMetricDocument.find({}).lean(),
    ]);

    const compositeByCycleId = new Map(compositeScores.map((item) => [String(item.rankingCycleId), item]));
    const parameterById = new Map(parameters.map((item) => [String(item._id), item]));
    const metricCountByCycleId = metrics.reduce<Map<string, number>>((map, item) => {
        const key = String(item.rankingCycleId);
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
    }, new Map());
    const verifiedCountByCycleId = values.reduce<Map<string, number>>((map, item) => {
        const key = String(item.rankingCycleId);
        map.set(key, (map.get(key) ?? 0) + (item.dataVerified ? 1 : 0));
        return map;
    }, new Map());
    const metricsByCycleId = metrics.reduce<Map<string, typeof metrics>>((map, item) => {
        const key = String(item.rankingCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());
    const valuesByMetricId = new Map(values.map((item) => [String(item.metricId), item]));
    const scoresByMetricId = new Map(scores.map((item) => [String(item.metricId), item]));
    const documentsByMetricValueId = metricDocuments.reduce<Map<string, typeof metricDocuments>>((map, item) => {
        const key = String(item.metricValueId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());
    const parametersByCycleId = parameters.reduce<Map<string, typeof parameters>>((map, item) => {
        const key = String(item.rankingCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());
    const benchmarksByCycleId = benchmarks.reduce<Map<string, typeof benchmarks>>((map, item) => {
        const key = String(item.rankingCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());
    const contributionsByCycleId = departmentContributions.reduce<Map<string, typeof departmentContributions>>(
        (map, item) => {
            const key = String(item.rankingCycleId);
            const existing = map.get(key) ?? [];
            existing.push(item);
            map.set(key, existing);
            return map;
        },
        new Map()
    );
    const submissionLogsByCycleId = submissionLogs.reduce<Map<string, typeof submissionLogs>>((map, item) => {
        const key = String(item.rankingCycleId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());

    return cycles.map((cycle) => ({
        ...cycle,
        compositeScore: compositeByCycleId.get(String(cycle._id)) ?? null,
        metricCount: metricCountByCycleId.get(String(cycle._id)) ?? 0,
        verifiedMetricCount: verifiedCountByCycleId.get(String(cycle._id)) ?? 0,
        institutionId:
            compositeByCycleId.get(String(cycle._id))?.institutionId
                ? String(compositeByCycleId.get(String(cycle._id))?.institutionId)
                : undefined,
        parameters: parametersByCycleId.get(String(cycle._id)) ?? [],
        metrics: (metricsByCycleId.get(String(cycle._id)) ?? []).map((metric) => {
            const value = valuesByMetricId.get(String(metric._id));
            const score = scoresByMetricId.get(String(metric._id));
            const documents = value ? documentsByMetricValueId.get(String(value._id)) ?? [] : [];
            const parameter = parameterById.get(String(metric.parameterId));

            return {
                ...metric,
                parameterCode: parameter?.parameterCode ?? "",
                institutionId: value?.institutionId ? String(value.institutionId) : undefined,
                metricValueNumeric: value?.metricValueNumeric,
                metricValueText: value?.metricValueText,
                dataVerified: Boolean(value?.dataVerified),
                scoreObtained: Number(score?.scoreObtained ?? 0),
                scoreNormalized: Number(score?.scoreNormalized ?? 0),
                documentIds: documents.map((document) => String(document.documentId)),
                documentPurpose: documents[0]?.documentPurpose,
                verificationStatus: documents[0]?.verificationStatus ?? "Pending",
            };
        }),
        benchmarks: benchmarksByCycleId.get(String(cycle._id)) ?? [],
        departmentContributions: contributionsByCycleId.get(String(cycle._id)) ?? [],
        trends: trends.filter(
            (item) =>
                item.frameworkType === cycle.frameworkType &&
                String(item.institutionId) ===
                    String(compositeByCycleId.get(String(cycle._id))?.institutionId ?? "")
        ),
        submissionLogs: submissionLogsByCycleId.get(String(cycle._id)) ?? [],
    }));
}

export async function getAccreditationAdminConsole() {
    await dbConnect();

    const [
        institutions,
        academicYears,
        departments,
        programs,
        users,
        students,
        documents,
        sssSurveys,
        aisheCycles,
        nirfCycles,
        regulatoryBodies,
        approvals,
        reports,
        inspections,
        actionItems,
    ] = await Promise.all([
        Institution.find({}).sort({ name: 1 }).lean(),
        AcademicYear.find({}).sort({ yearStart: -1 }).lean(),
        Department.find({}).sort({ name: 1 }).lean(),
        Program.find({ isActive: true }).sort({ name: 1 }).lean(),
        User.find({ isActive: true }).sort({ name: 1 }).select("_id name email role").lean(),
        Student.find({ status: "Active" }).sort({ firstName: 1 }).select("_id firstName lastName enrollmentNo institutionId").lean(),
        DocumentModel.find({}).sort({ uploadedAt: -1 }).select("_id fileName").limit(200).lean(),
        loadSssAdminRecords(),
        loadAisheAdminRecords(),
        loadNirfAdminRecords(),
        RegulatoryBody.find({}).sort({ bodyName: 1 }).lean(),
        InstitutionalApproval.find({}).sort({ approvalEndDate: -1, createdAt: -1 }).lean(),
        StatutoryComplianceReport.find({}).sort({ reportYear: -1, createdAt: -1 }).lean(),
        InspectionVisit.find({}).sort({ visitDate: -1 }).lean(),
        ComplianceActionItem.find({}).sort({ targetCompletionDate: 1, createdAt: -1 }).lean(),
    ]);

    return {
        institutionOptions: institutions.map((item) => toOption(item)),
        academicYearOptions: academicYears.map((item) => ({
            id: String(item._id),
            label: `${item.yearStart}-${item.yearEnd}`,
        })),
        departmentOptions: departments.map((item) => toOption(item)),
        programOptions: programs.map((item) => toOption(item)),
        userOptions: users.map((item) => ({
            id: String(item._id),
            label: `${item.name}${item.role ? ` (${item.role})` : ""}`,
        })),
        studentOptions: students.map((item) => ({
            id: String(item._id),
            label: `${item.firstName} ${item.lastName ?? ""}`.trim() + ` (${item.enrollmentNo})`,
            institutionId: item.institutionId ? String(item.institutionId) : undefined,
        })),
        documentOptions: documents.map((item) => toOption(item, "fileName")),
        sssSurveys,
        aisheCycles,
        nirfCycles,
        regulatoryBodies,
        approvals,
        reports,
        inspections: inspections.map((inspection) => ({
            ...inspection,
            actionItems: actionItems.filter((item) => String(item.inspectionId) === String(inspection._id)),
        })),
        actionItems,
    };
}

export async function createSssSurvey(actor: AccreditationActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = sssSurveySchema.parse(rawInput);
    const survey = await SssSurvey.create({
        institutionId: ensureObjectId(input.institutionId),
        academicYearId: ensureObjectId(input.academicYearId),
        surveyTitle: input.surveyTitle,
        surveyStatus: input.surveyStatus,
        startDate: toDate(input.startDate),
        endDate: toDate(input.endDate),
        createdByUserId: new Types.ObjectId(actor.id),
    });

    const questionPayload = (input.questions.length ? input.questions : defaultSssQuestionBlueprint).map((question) => ({
        surveyId: survey._id,
        questionText: question.questionText,
        ratingScaleMax: question.ratingScaleMax,
        displayOrder: question.displayOrder,
        isMandatory: question.isMandatory,
        analyticsBucket: question.analyticsBucket,
    }));
    await SssQuestion.insertMany(questionPayload);

    const activeStudents = input.eligibleStudentIds.length
        ? input.eligibleStudentIds.map((value) => ensureObjectId(value))
        : (
              await Student.find({
                  status: "Active",
                  ...(Types.ObjectId.isValid(input.institutionId)
                      ? { institutionId: new Types.ObjectId(input.institutionId) }
                      : {}),
              })
                  .select("_id")
                  .lean()
          ).map((student) => student._id);

    if (activeStudents.length) {
        await SssEligibleStudent.insertMany(
            activeStudents.map((studentId) => ({
                surveyId: survey._id,
                studentId,
                isResponseSubmitted: false,
            }))
        );
    }

    await recomputeSssAnalytics(survey._id);
    await createAuditEntry(actor, "SSS_SURVEY_CREATE", "sss_surveys", survey._id.toString(), undefined, survey.toObject());

    return survey;
}

export async function updateSssSurvey(actor: AccreditationActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();

    const input = sssSurveyUpdateSchema.parse(rawInput);
    const survey = await SssSurvey.findById(id);
    if (!survey) {
        throw new AuthError("SSS survey not found.", 404);
    }

    const oldData = survey.toObject();
    if (input.institutionId) {
        survey.institutionId = ensureObjectId(input.institutionId);
    }
    if (input.academicYearId) {
        survey.academicYearId = ensureObjectId(input.academicYearId);
    }
    if (typeof input.surveyTitle === "string") {
        survey.surveyTitle = input.surveyTitle;
    }
    if (input.surveyStatus) {
        survey.surveyStatus = input.surveyStatus;
    }
    if (input.startDate) {
        survey.startDate = toDate(input.startDate) as Date;
    }
    if (input.endDate) {
        survey.endDate = toDate(input.endDate) as Date;
    }
    await survey.save();

    if (input.questions) {
        await replaceMany(
            SssQuestion,
            { surveyId: survey._id },
            input.questions.map((question) => ({
                surveyId: survey._id,
                questionText: question.questionText,
                ratingScaleMax: question.ratingScaleMax,
                displayOrder: question.displayOrder,
                isMandatory: question.isMandatory,
                analyticsBucket: question.analyticsBucket,
            }))
        );
    }

    if (input.eligibleStudentIds) {
        await replaceMany(
            SssEligibleStudent,
            { surveyId: survey._id },
            input.eligibleStudentIds.map((studentId) => ({
                surveyId: survey._id,
                studentId: ensureObjectId(studentId),
                isResponseSubmitted: false,
            }))
        );
    }

    await recomputeSssAnalytics(survey._id);
    await createAuditEntry(actor, "SSS_SURVEY_UPDATE", "sss_surveys", survey._id.toString(), oldData, survey.toObject());

    return survey;
}

export async function getStudentSssWorkspace(actor: StudentActor) {
    await dbConnect();

    const student = await Student.findOne({ userId: new Types.ObjectId(actor.id) })
        .select("_id firstName lastName enrollmentNo")
        .lean();
    if (!student) {
        throw new AuthError("Student profile not found.", 404);
    }

    const eligibilities = await SssEligibleStudent.find({ studentId: student._id })
        .sort({ updatedAt: -1 })
        .lean();
    const surveyIds = eligibilities.map((item) => item.surveyId);
    const [surveys, questions, analytics] = await Promise.all([
        SssSurvey.find({
            _id: { $in: surveyIds },
            surveyStatus: { $in: ["Active", "Closed"] },
        })
            .sort({ endDate: -1 })
            .lean(),
        SssQuestion.find({ surveyId: { $in: surveyIds } }).sort({ displayOrder: 1 }).lean(),
        SssResultAnalytics.find({ surveyId: { $in: surveyIds } }).lean(),
    ]);

    const eligibilityBySurveyId = new Map(eligibilities.map((item) => [String(item.surveyId), item]));
    const analyticsBySurveyId = new Map(analytics.map((item) => [String(item.surveyId), item]));
    const questionsBySurveyId = questions.reduce<Map<string, typeof questions>>((map, item) => {
        const key = String(item.surveyId);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
        return map;
    }, new Map());

    return {
        student,
        surveys: surveys.map((survey) => ({
            ...survey,
            eligibility: eligibilityBySurveyId.get(String(survey._id)) ?? null,
            analytics: analyticsBySurveyId.get(String(survey._id)) ?? null,
            questions: questionsBySurveyId.get(String(survey._id)) ?? [],
        })),
    };
}

export async function submitStudentSssResponse(actor: StudentActor, surveyId: string, rawInput: unknown) {
    await dbConnect();

    const input = sssStudentResponseSchema.parse(rawInput);
    const student = await Student.findOne({ userId: new Types.ObjectId(actor.id) }).select("_id").lean();
    if (!student) {
        throw new AuthError("Student profile not found.", 404);
    }

    const survey = await SssSurvey.findById(surveyId).lean();
    if (!survey) {
        throw new AuthError("SSS survey not found.", 404);
    }
    if (survey.surveyStatus !== "Active") {
        throw new AuthError("This survey is not accepting responses.", 409);
    }

    const eligibility = await SssEligibleStudent.findOne({
        surveyId: survey._id,
        studentId: student._id,
    });
    if (!eligibility) {
        throw new AuthError("You are not eligible for this survey.", 403);
    }
    if (eligibility.isResponseSubmitted) {
        throw new AuthError("You have already submitted this survey.", 409);
    }

    const questions = await SssQuestion.find({ surveyId: survey._id }).sort({ displayOrder: 1 }).lean();
    const questionById = new Map(questions.map((question) => [String(question._id), question]));
    const answeredQuestionIds = new Set(input.answers.map((answer) => answer.questionId));
    for (const question of questions) {
        if (question.isMandatory && !answeredQuestionIds.has(String(question._id))) {
            throw new AuthError("All mandatory survey questions must be answered.", 400);
        }
    }
    for (const answer of input.answers) {
        const question = questionById.get(answer.questionId);
        if (!question) {
            throw new AuthError("One or more survey answers reference an unknown question.", 400);
        }
        if (answer.ratingValue > question.ratingScaleMax) {
            throw new AuthError(`Rating for "${question.questionText}" exceeds the configured scale.`, 400);
        }
    }

    const response = await SssResponse.create({
        surveyId: survey._id,
        anonymousToken: `sss_${randomUUID().replaceAll("-", "")}`,
        submittedAt: new Date(),
    });

    await SssResponseDetail.insertMany(
        input.answers.map((answer) => ({
            responseId: response._id,
            questionId: ensureObjectId(answer.questionId),
            ratingValue: answer.ratingValue,
            remarks: answer.remarks?.trim() || undefined,
        }))
    );

    eligibility.isResponseSubmitted = true;
    eligibility.responseSubmittedAt = new Date();
    await eligibility.save();

    await recomputeSssAnalytics(survey._id);

    return {
        message: "Student Satisfaction Survey submitted successfully.",
    };
}

export async function createAisheCycle(actor: AccreditationActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = aisheCycleSchema.parse(rawInput);

    const cycle = await AisheSurveyCycle.create({
        academicYearId: ensureObjectId(input.academicYearId),
        surveyYearLabel: input.surveyYearLabel,
        submissionStartDate: toDate(input.submissionStartDate),
        submissionEndDate: toDate(input.submissionEndDate),
        submissionStatus: input.submissionStatus,
    });

    await upsertAisheSubRecords(cycle._id, input);
    await createAuditEntry(actor, "AISHE_CYCLE_CREATE", "aishe_survey_cycles", cycle._id.toString(), undefined, cycle.toObject());
    return cycle;
}

export async function updateAisheCycle(actor: AccreditationActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = aisheCycleUpdateSchema.parse(rawInput);
    const cycle = await AisheSurveyCycle.findById(id);
    if (!cycle) {
        throw new AuthError("AISHE cycle not found.", 404);
    }

    const oldData = cycle.toObject();
    if (input.academicYearId) {
        cycle.academicYearId = ensureObjectId(input.academicYearId);
    }
    if (typeof input.surveyYearLabel === "string") {
        cycle.surveyYearLabel = input.surveyYearLabel;
    }
    if (input.submissionStartDate !== undefined) {
        cycle.submissionStartDate = toDate(input.submissionStartDate);
    }
    if (input.submissionEndDate !== undefined) {
        cycle.submissionEndDate = toDate(input.submissionEndDate);
    }
    if (input.submissionStatus) {
        cycle.submissionStatus = input.submissionStatus;
    }
    await cycle.save();

    await upsertAisheSubRecords(cycle._id, input);
    await createAuditEntry(actor, "AISHE_CYCLE_UPDATE", "aishe_survey_cycles", cycle._id.toString(), oldData, cycle.toObject());
    return cycle;
}

async function upsertAisheSubRecords(cycleId: Types.ObjectId, input: Record<string, any>) {
    if (input.institutionProfile) {
        await AisheInstitutionProfile.updateOne(
            { surveyCycleId: cycleId },
            {
                $set: {
                    surveyCycleId: cycleId,
                    institutionId: ensureObjectId(input.institutionProfile.institutionId),
                    establishmentYear: input.institutionProfile.establishmentYear,
                    institutionType: input.institutionProfile.institutionType,
                    affiliatingUniversity: input.institutionProfile.affiliatingUniversity?.trim() || undefined,
                    campusAreaAcres: input.institutionProfile.campusAreaAcres,
                    totalBuiltupAreaSqft: input.institutionProfile.totalBuiltupAreaSqft,
                    locationType: input.institutionProfile.locationType,
                    naacGrade: input.institutionProfile.naacGrade?.trim() || undefined,
                    nirfRank: input.institutionProfile.nirfRank,
                },
            },
            { upsert: true }
        );
    }

    if (input.programStatistics) {
        await replaceMany(
            AisheProgramStatistic,
            { surveyCycleId: cycleId },
            input.programStatistics.map((item: Record<string, any>) => ({
                surveyCycleId: cycleId,
                programId: ensureObjectId(item.programId),
                intakeCapacity: item.intakeCapacity,
                studentsEnrolled: item.studentsEnrolled,
                studentsPassed: item.studentsPassed,
                studentsPlaced: item.studentsPlaced,
                studentsHigherStudies: item.studentsHigherStudies,
                dropoutCount: item.dropoutCount,
            }))
        );
    }

    if (input.studentEnrollments) {
        await replaceMany(
            AisheStudentEnrollment,
            { surveyCycleId: cycleId },
            input.studentEnrollments.map((item: Record<string, any>) => ({
                surveyCycleId: cycleId,
                programId: ensureObjectId(item.programId),
                maleStudents: item.maleStudents,
                femaleStudents: item.femaleStudents,
                transgenderStudents: item.transgenderStudents,
                scStudents: item.scStudents,
                stStudents: item.stStudents,
                obcStudents: item.obcStudents,
                generalStudents: item.generalStudents,
                pwdStudents: item.pwdStudents,
                foreignStudents: item.foreignStudents,
            }))
        );
    }

    if (input.facultyStatistics) {
        await replaceMany(
            AisheFacultyStatistic,
            { surveyCycleId: cycleId },
            input.facultyStatistics.map((item: Record<string, any>) => ({
                surveyCycleId: cycleId,
                departmentId: ensureObjectId(item.departmentId),
                totalFaculty: item.totalFaculty,
                maleFaculty: item.maleFaculty,
                femaleFaculty: item.femaleFaculty,
                phdFaculty: item.phdFaculty,
                pgFaculty: item.pgFaculty,
                ugFaculty: item.ugFaculty,
                professorsCount: item.professorsCount,
                associateProfessorsCount: item.associateProfessorsCount,
                assistantProfessorsCount: item.assistantProfessorsCount,
                contractFacultyCount: item.contractFacultyCount,
            }))
        );
    }

    if (input.staffStatistics) {
        await AisheStaffStatistic.updateOne(
            { surveyCycleId: cycleId },
            { $set: { surveyCycleId: cycleId, ...input.staffStatistics } },
            { upsert: true }
        );
    }

    if (input.infrastructureStatistics) {
        await AisheInfrastructureStatistic.updateOne(
            { surveyCycleId: cycleId },
            { $set: { surveyCycleId: cycleId, ...input.infrastructureStatistics } },
            { upsert: true }
        );
    }

    if (input.financialStatistics) {
        await AisheFinancialStatistic.updateOne(
            { surveyCycleId: cycleId },
            { $set: { surveyCycleId: cycleId, ...input.financialStatistics } },
            { upsert: true }
        );
    }

    if (input.studentSupportStatistics) {
        await AisheStudentSupportStatistic.updateOne(
            { surveyCycleId: cycleId },
            { $set: { surveyCycleId: cycleId, ...input.studentSupportStatistics } },
            { upsert: true }
        );
    }

    if (input.submissionLogs) {
        await replaceMany(
            AisheSubmissionLog,
            { surveyCycleId: cycleId },
            input.submissionLogs.map((item: Record<string, any>) => ({
                surveyCycleId: cycleId,
                submittedByUserId: item.submittedByUserId ? ensureObjectId(item.submittedByUserId) : undefined,
                submissionDate: toDate(item.submissionDate),
                submissionReferenceNo: item.submissionReferenceNo?.trim() || undefined,
                submissionStatus: item.submissionStatus,
                remarks: item.remarks?.trim() || undefined,
            }))
        );
    }

    if (input.supportingDocuments) {
        await replaceMany(
            AisheSupportingDocument,
            { surveyCycleId: cycleId },
            input.supportingDocuments.map((item: Record<string, any>) => ({
                surveyCycleId: cycleId,
                documentId: ensureObjectId(item.documentId),
                documentCategory: item.documentCategory,
                uploadedAt: toDate(item.uploadedAt) ?? new Date(),
            }))
        );
    }
}

export async function createNirfCycle(actor: AccreditationActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = nirfCycleSchema.parse(rawInput);

    const cycle = await NirfRankingCycle.create({
        rankingYear: input.rankingYear,
        frameworkType: input.frameworkType,
        dataSubmissionStart: toDate(input.dataSubmissionStart),
        dataSubmissionEnd: toDate(input.dataSubmissionEnd),
        resultDeclaredDate: toDate(input.resultDeclaredDate),
        status: input.status,
    });

    await upsertNirfSubRecords(cycle._id, input);
    await createAuditEntry(actor, "NIRF_CYCLE_CREATE", "nirf_ranking_cycles", cycle._id.toString(), undefined, cycle.toObject());
    return cycle;
}

export async function updateNirfCycle(actor: AccreditationActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = nirfCycleUpdateSchema.parse(rawInput);
    const cycle = await NirfRankingCycle.findById(id);
    if (!cycle) {
        throw new AuthError("NIRF cycle not found.", 404);
    }

    const oldData = cycle.toObject();
    if (typeof input.rankingYear === "number") {
        cycle.rankingYear = input.rankingYear;
    }
    if (input.frameworkType) {
        cycle.frameworkType = input.frameworkType;
    }
    if (input.dataSubmissionStart !== undefined) {
        cycle.dataSubmissionStart = toDate(input.dataSubmissionStart);
    }
    if (input.dataSubmissionEnd !== undefined) {
        cycle.dataSubmissionEnd = toDate(input.dataSubmissionEnd);
    }
    if (input.resultDeclaredDate !== undefined) {
        cycle.resultDeclaredDate = toDate(input.resultDeclaredDate);
    }
    if (input.status) {
        cycle.status = input.status;
    }
    await cycle.save();

    await upsertNirfSubRecords(cycle._id, input);
    await createAuditEntry(actor, "NIRF_CYCLE_UPDATE", "nirf_ranking_cycles", cycle._id.toString(), oldData, cycle.toObject());
    return cycle;
}

async function upsertNirfSubRecords(cycleId: Types.ObjectId, input: Record<string, any>) {
    const parametersInput = input.parameters?.length ? input.parameters : defaultNirfParameterBlueprint;

    await replaceMany(
        NirfParameter,
        { rankingCycleId: cycleId },
        parametersInput.map((parameter: Record<string, any>) => ({
            rankingCycleId: cycleId,
            parameterCode: parameter.parameterCode,
            parameterName: parameter.parameterName,
            weightagePercentage: parameter.weightagePercentage,
            displayOrder: parameter.displayOrder,
        }))
    );
    const parameters = await NirfParameter.find({ rankingCycleId: cycleId }).lean();
    const parameterByCode = new Map(parameters.map((parameter) => [parameter.parameterCode, parameter]));

    if (input.metrics) {
        const previousMetricValueIds = (
            await NirfMetricValue.find({ rankingCycleId: cycleId }).select("_id").lean()
        ).map((item) => item._id);
        if (previousMetricValueIds.length) {
            await NirfMetricDocument.deleteMany({ metricValueId: { $in: previousMetricValueIds } });
        }
        await replaceMany(
            NirfMetric,
            { rankingCycleId: cycleId },
            input.metrics.map((metric: Record<string, any>) => {
                const parameter = parameterByCode.get(metric.parameterCode);
                if (!parameter) {
                    throw new AuthError(`NIRF parameter "${metric.parameterCode}" is not configured.`, 400);
                }

                return {
                    rankingCycleId: cycleId,
                    parameterId: parameter._id,
                    metricCode: metric.metricCode,
                    metricName: metric.metricName,
                    maxScore: metric.maxScore,
                    dataSourceModule: metric.dataSourceModule?.trim() || undefined,
                    calculationFormulaReference: metric.calculationFormulaReference?.trim() || undefined,
                };
            })
        );
        const metrics = await NirfMetric.find({ rankingCycleId: cycleId }).lean();
        const metricByCode = new Map(metrics.map((metric) => [metric.metricCode, metric]));

        await NirfMetricValue.deleteMany({ rankingCycleId: cycleId });
        await NirfMetricScore.deleteMany({ rankingCycleId: cycleId });

        for (const metricInput of input.metrics) {
            const metric = metricByCode.get(metricInput.metricCode);
            if (!metric) {
                continue;
            }

            const metricValue = await NirfMetricValue.create({
                rankingCycleId: cycleId,
                institutionId: ensureObjectId(metricInput.institutionId ?? input.institutionId),
                metricId: metric._id,
                metricValueNumeric:
                    typeof metricInput.metricValueNumeric === "number" ? metricInput.metricValueNumeric : undefined,
                metricValueText: metricInput.metricValueText?.trim() || undefined,
                dataVerified: Boolean(metricInput.dataVerified),
                verifiedAt: metricInput.dataVerified ? new Date() : undefined,
            });

            await NirfMetricScore.create({
                rankingCycleId: cycleId,
                metricId: metric._id,
                scoreObtained: metricInput.scoreObtained ?? 0,
                scoreNormalized: metricInput.scoreNormalized ?? 0,
                calculatedAt: new Date(),
            });

            if (Array.isArray(metricInput.documentIds) && metricInput.documentIds.length) {
                await NirfMetricDocument.insertMany(
                    metricInput.documentIds.map((documentId: string) => ({
                        metricValueId: metricValue._id,
                        documentId: ensureObjectId(documentId),
                        documentPurpose: metricInput.documentPurpose?.trim() || undefined,
                        verificationStatus: metricInput.verificationStatus ?? "Pending",
                    }))
                );
            }
        }

        const metricScores = await NirfMetricScore.find({ rankingCycleId: cycleId }).lean();
        const metricsByParameter = metrics.reduce<Map<string, typeof metricScores>>((map, metric) => {
            const key = String(metric.parameterId);
            const existing = map.get(key) ?? [];
            const scopedScores = metricScores.filter((score) => String(score.metricId) === String(metric._id));
            map.set(key, [...existing, ...scopedScores]);
            return map;
        }, new Map());

        await replaceMany(
            NirfParameterScore,
            { rankingCycleId: cycleId },
            parameters.map((parameter) => {
                const scopedScores = metricsByParameter.get(String(parameter._id)) ?? [];
                const rawScore = scopedScores.reduce((sum, item) => sum + Number(item.scoreNormalized ?? 0), 0);
                const weightedScore = Number(((rawScore * Number(parameter.weightagePercentage ?? 0)) / 100).toFixed(2));
                return {
                    rankingCycleId: cycleId,
                    parameterId: parameter._id,
                    rawScore,
                    weightedScore,
                    calculatedAt: new Date(),
                };
            })
        );
    }

    const totalScore =
        typeof input.totalScore === "number"
            ? input.totalScore
            : (
                  await NirfParameterScore.find({ rankingCycleId: cycleId }).lean()
              ).reduce((sum, item) => sum + Number(item.weightedScore ?? 0), 0);

    await NirfCompositeScore.updateOne(
        { rankingCycleId: cycleId, institutionId: ensureObjectId(input.institutionId) },
        {
            $set: {
                rankingCycleId: cycleId,
                institutionId: ensureObjectId(input.institutionId),
                totalScore,
                predictedRank: input.predictedRank,
                confidenceIndex: input.confidenceIndex,
                scoreCalculatedAt: new Date(),
            },
        },
        { upsert: true }
    );

    if (input.benchmarks) {
        await replaceMany(
            NirfBenchmarkDataset,
            { rankingCycleId: cycleId },
            input.benchmarks.map((item: Record<string, any>) => ({
                rankingCycleId: cycleId,
                institutionName: item.institutionName,
                parameterCode: item.parameterCode,
                parameterScore: item.parameterScore,
                overallScore: item.overallScore,
                rankPosition: item.rankPosition,
                dataSource: item.dataSource?.trim() || undefined,
            }))
        );
    }

    if (input.departmentContributions) {
        await replaceMany(
            NirfDepartmentContribution,
            { rankingCycleId: cycleId },
            input.departmentContributions.map((item: Record<string, any>) => ({
                rankingCycleId: cycleId,
                departmentId: ensureObjectId(item.departmentId),
                parameterCode: item.parameterCode,
                contributionScore: item.contributionScore,
                remarks: item.remarks?.trim() || undefined,
            }))
        );
    }

    if (input.trends) {
        await replaceMany(
            NirfTrendAnalysis,
            {
                institutionId: ensureObjectId(input.institutionId),
                frameworkType: input.frameworkType,
                rankingYear: { $in: input.trends.map((item: Record<string, any>) => item.rankingYear) },
            },
            input.trends.map((item: Record<string, any>) => ({
                institutionId: ensureObjectId(item.institutionId),
                rankingYear: item.rankingYear,
                frameworkType: item.frameworkType,
                overallRank: item.overallRank,
                overallScore: item.overallScore,
                trendDirection: item.trendDirection,
            }))
        );
    }

    if (input.submissionLogs) {
        await replaceMany(
            NirfSubmissionLog,
            { rankingCycleId: cycleId },
            input.submissionLogs.map((item: Record<string, any>) => ({
                rankingCycleId: cycleId,
                submittedByUserId: item.submittedByUserId ? ensureObjectId(item.submittedByUserId) : undefined,
                submissionReferenceNo: item.submissionReferenceNo?.trim() || undefined,
                submissionDate: toDate(item.submissionDate),
                submissionStatus: item.submissionStatus,
                remarks: item.remarks?.trim() || undefined,
            }))
        );
    }
}

export async function createRegulatoryBody(actor: AccreditationActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = regulatoryBodySchema.parse(rawInput);
    const body = await RegulatoryBody.create({
        bodyName: input.bodyName,
        jurisdiction: input.jurisdiction?.trim() || undefined,
        websiteUrl: input.websiteUrl?.trim() || undefined,
    });
    await createAuditEntry(actor, "REGULATORY_BODY_CREATE", "regulatory_bodies", body._id.toString(), undefined, body.toObject());
    return body;
}

export async function updateRegulatoryBody(actor: AccreditationActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = regulatoryBodyUpdateSchema.parse(rawInput);
    const body = await RegulatoryBody.findById(id);
    if (!body) {
        throw new AuthError("Regulatory body not found.", 404);
    }

    const oldData = body.toObject();
    if (typeof input.bodyName === "string") {
        body.bodyName = input.bodyName;
    }
    if (input.jurisdiction !== undefined) {
        body.jurisdiction = input.jurisdiction?.trim() || undefined;
    }
    if (input.websiteUrl !== undefined) {
        body.websiteUrl = input.websiteUrl?.trim() || undefined;
    }
    await body.save();
    await createAuditEntry(actor, "REGULATORY_BODY_UPDATE", "regulatory_bodies", body._id.toString(), oldData, body.toObject());
    return body;
}

export async function createInstitutionalApproval(actor: AccreditationActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = institutionalApprovalSchema.parse(rawInput);
    const approval = await InstitutionalApproval.create({
        institutionId: ensureObjectId(input.institutionId),
        regulatoryBodyId: ensureObjectId(input.regulatoryBodyId),
        approvalType: input.approvalType,
        approvalReferenceNo: input.approvalReferenceNo?.trim() || undefined,
        approvalStartDate: toDate(input.approvalStartDate),
        approvalEndDate: toDate(input.approvalEndDate),
        status: input.status,
        documentId: input.documentId ? ensureObjectId(input.documentId) : undefined,
    });
    await createAuditEntry(actor, "INSTITUTIONAL_APPROVAL_CREATE", "institutional_approvals", approval._id.toString(), undefined, approval.toObject());
    return approval;
}

export async function updateInstitutionalApproval(actor: AccreditationActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = institutionalApprovalUpdateSchema.parse(rawInput);
    const approval = await InstitutionalApproval.findById(id);
    if (!approval) {
        throw new AuthError("Institutional approval not found.", 404);
    }

    const oldData = approval.toObject();
    if (input.institutionId) {
        approval.institutionId = ensureObjectId(input.institutionId);
    }
    if (input.regulatoryBodyId) {
        approval.regulatoryBodyId = ensureObjectId(input.regulatoryBodyId);
    }
    if (typeof input.approvalType === "string") {
        approval.approvalType = input.approvalType;
    }
    if (input.approvalReferenceNo !== undefined) {
        approval.approvalReferenceNo = input.approvalReferenceNo?.trim() || undefined;
    }
    if (input.approvalStartDate !== undefined) {
        approval.approvalStartDate = toDate(input.approvalStartDate);
    }
    if (input.approvalEndDate !== undefined) {
        approval.approvalEndDate = toDate(input.approvalEndDate);
    }
    if (input.status) {
        approval.status = input.status;
    }
    if (input.documentId !== undefined) {
        approval.documentId = input.documentId ? ensureObjectId(input.documentId) : undefined;
    }
    await approval.save();
    await createAuditEntry(actor, "INSTITUTIONAL_APPROVAL_UPDATE", "institutional_approvals", approval._id.toString(), oldData, approval.toObject());
    return approval;
}

export async function createStatutoryComplianceReport(actor: AccreditationActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = statutoryComplianceReportSchema.parse(rawInput);
    const report = await StatutoryComplianceReport.create({
        institutionId: ensureObjectId(input.institutionId),
        reportTitle: input.reportTitle,
        reportYear: input.reportYear,
        submittedToBodyId: input.submittedToBodyId ? ensureObjectId(input.submittedToBodyId) : undefined,
        submissionDate: toDate(input.submissionDate),
        complianceStatus: input.complianceStatus,
        documentId: input.documentId ? ensureObjectId(input.documentId) : undefined,
    });
    await createAuditEntry(actor, "COMPLIANCE_REPORT_CREATE", "statutory_compliance_reports", report._id.toString(), undefined, report.toObject());
    return report;
}

export async function updateStatutoryComplianceReport(actor: AccreditationActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = statutoryComplianceReportUpdateSchema.parse(rawInput);
    const report = await StatutoryComplianceReport.findById(id);
    if (!report) {
        throw new AuthError("Statutory compliance report not found.", 404);
    }

    const oldData = report.toObject();
    if (input.institutionId) {
        report.institutionId = ensureObjectId(input.institutionId);
    }
    if (typeof input.reportTitle === "string") {
        report.reportTitle = input.reportTitle;
    }
    if (typeof input.reportYear === "number") {
        report.reportYear = input.reportYear;
    }
    if (input.submittedToBodyId !== undefined) {
        report.submittedToBodyId = input.submittedToBodyId ? ensureObjectId(input.submittedToBodyId) : undefined;
    }
    if (input.submissionDate !== undefined) {
        report.submissionDate = toDate(input.submissionDate);
    }
    if (input.complianceStatus) {
        report.complianceStatus = input.complianceStatus;
    }
    if (input.documentId !== undefined) {
        report.documentId = input.documentId ? ensureObjectId(input.documentId) : undefined;
    }
    await report.save();
    await createAuditEntry(actor, "COMPLIANCE_REPORT_UPDATE", "statutory_compliance_reports", report._id.toString(), oldData, report.toObject());
    return report;
}

export async function createInspectionVisit(actor: AccreditationActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = inspectionVisitSchema.parse(rawInput);

    const inspection = await InspectionVisit.create({
        regulatoryBodyId: ensureObjectId(input.regulatoryBodyId),
        institutionId: ensureObjectId(input.institutionId),
        visitDate: toDate(input.visitDate),
        inspectionType: input.inspectionType,
        inspectionReportDocumentId: input.inspectionReportDocumentId
            ? ensureObjectId(input.inspectionReportDocumentId)
            : undefined,
        complianceDeadline: toDate(input.complianceDeadline),
        status: input.status,
    });

    if (input.actionItems.length) {
        await ComplianceActionItem.insertMany(
            input.actionItems.map((item) => ({
                inspectionId: inspection._id,
                actionTitle: item.actionTitle,
                actionDescription: item.actionDescription?.trim() || undefined,
                assignedToUserId: item.assignedToUserId ? ensureObjectId(item.assignedToUserId) : undefined,
                targetCompletionDate: toDate(item.targetCompletionDate),
                completionStatus: item.completionStatus,
                completionDocumentId: item.completionDocumentId ? ensureObjectId(item.completionDocumentId) : undefined,
            }))
        );
    }

    await createAuditEntry(actor, "INSPECTION_VISIT_CREATE", "inspection_visits", inspection._id.toString(), undefined, inspection.toObject());
    return inspection;
}

export async function updateInspectionVisit(actor: AccreditationActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = inspectionVisitUpdateSchema.parse(rawInput);
    const inspection = await InspectionVisit.findById(id);
    if (!inspection) {
        throw new AuthError("Inspection visit not found.", 404);
    }

    const oldData = inspection.toObject();
    if (input.regulatoryBodyId) {
        inspection.regulatoryBodyId = ensureObjectId(input.regulatoryBodyId);
    }
    if (input.institutionId) {
        inspection.institutionId = ensureObjectId(input.institutionId);
    }
    if (input.visitDate) {
        inspection.visitDate = toDate(input.visitDate) as Date;
    }
    if (typeof input.inspectionType === "string") {
        inspection.inspectionType = input.inspectionType;
    }
    if (input.inspectionReportDocumentId !== undefined) {
        inspection.inspectionReportDocumentId = input.inspectionReportDocumentId
            ? ensureObjectId(input.inspectionReportDocumentId)
            : undefined;
    }
    if (input.complianceDeadline !== undefined) {
        inspection.complianceDeadline = toDate(input.complianceDeadline);
    }
    if (input.status) {
        inspection.status = input.status;
    }
    await inspection.save();

    if (input.actionItems) {
        await replaceMany(
            ComplianceActionItem,
            { inspectionId: inspection._id },
            input.actionItems.map((item: Record<string, any>) => ({
                inspectionId: inspection._id,
                actionTitle: item.actionTitle,
                actionDescription: item.actionDescription?.trim() || undefined,
                assignedToUserId: item.assignedToUserId ? ensureObjectId(item.assignedToUserId) : undefined,
                targetCompletionDate: toDate(item.targetCompletionDate),
                completionStatus: item.completionStatus,
                completionDocumentId: item.completionDocumentId ? ensureObjectId(item.completionDocumentId) : undefined,
            }))
        );
    }

    await createAuditEntry(actor, "INSPECTION_VISIT_UPDATE", "inspection_visits", inspection._id.toString(), oldData, inspection.toObject());
    return inspection;
}

export async function createComplianceActionItem(actor: AccreditationActor, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = complianceActionItemSchema.parse(rawInput);
    const action = await ComplianceActionItem.create({
        inspectionId: ensureObjectId(input.inspectionId),
        actionTitle: input.actionTitle,
        actionDescription: input.actionDescription?.trim() || undefined,
        assignedToUserId: input.assignedToUserId ? ensureObjectId(input.assignedToUserId) : undefined,
        targetCompletionDate: toDate(input.targetCompletionDate),
        completionStatus: input.completionStatus,
        completionDocumentId: input.completionDocumentId ? ensureObjectId(input.completionDocumentId) : undefined,
    });
    await createAuditEntry(actor, "COMPLIANCE_ACTION_CREATE", "compliance_action_items", action._id.toString(), undefined, action.toObject());
    return action;
}

export async function updateComplianceActionItem(actor: AccreditationActor, id: string, rawInput: unknown) {
    ensureAdminActor(actor);
    await dbConnect();
    const input = complianceActionItemUpdateSchema.parse(rawInput);
    const action = await ComplianceActionItem.findById(id);
    if (!action) {
        throw new AuthError("Compliance action item not found.", 404);
    }

    const oldData = action.toObject();
    if (input.inspectionId) {
        action.inspectionId = ensureObjectId(input.inspectionId);
    }
    if (typeof input.actionTitle === "string") {
        action.actionTitle = input.actionTitle;
    }
    if (input.actionDescription !== undefined) {
        action.actionDescription = input.actionDescription?.trim() || undefined;
    }
    if (input.assignedToUserId !== undefined) {
        action.assignedToUserId = input.assignedToUserId ? ensureObjectId(input.assignedToUserId) : undefined;
    }
    if (input.targetCompletionDate !== undefined) {
        action.targetCompletionDate = toDate(input.targetCompletionDate);
    }
    if (input.completionStatus) {
        action.completionStatus = input.completionStatus;
    }
    if (input.completionDocumentId !== undefined) {
        action.completionDocumentId = input.completionDocumentId ? ensureObjectId(input.completionDocumentId) : undefined;
    }
    await action.save();
    await createAuditEntry(actor, "COMPLIANCE_ACTION_UPDATE", "compliance_action_items", action._id.toString(), oldData, action.toObject());
    return action;
}

function uniqueStrings(values: Array<string | undefined | null>) {
    return Array.from(
        new Set(
            values
                .map((value) => String(value ?? "").trim())
                .filter(Boolean)
        )
    );
}

async function resolveLeadershipAccreditationScope(actor: AuthorizationActor) {
    const profile = await resolveAuthorizationProfile(actor);
    if (!profile.hasLeadershipPortalAccess && !profile.isAdmin) {
        throw new AuthError("Leadership access is required.", 403);
    }

    return {
        profile,
        institutionIds: uniqueStrings(profile.browseScopes.map((scope) => scope.institutionId)),
        departmentIds: uniqueStrings(profile.browseScopes.map((scope) => scope.departmentId)),
    };
}

export async function getAccreditationLeadershipDashboard(actor: AuthorizationActor) {
    await dbConnect();
    const { profile, institutionIds, departmentIds } = await resolveLeadershipAccreditationScope(actor);

    const institutionFilter = institutionIds.length
        ? { institutionId: { $in: institutionIds.map((id) => new Types.ObjectId(id)) } }
        : {};
    const departmentFilter = departmentIds.length
        ? { departmentId: { $in: departmentIds.map((id) => new Types.ObjectId(id)) } }
        : {};

    const [sssSurveys, sssAnalytics, aisheProfiles, aisheCycles, aisheFacultyStats, nirfCompositeScores, nirfCycles, approvals, reports, inspections] =
        await Promise.all([
            SssSurvey.find(institutionFilter).sort({ endDate: -1 }).lean(),
            SssResultAnalytics.find({}).lean(),
            AisheInstitutionProfile.find(institutionFilter).lean(),
            AisheSurveyCycle.find({}).sort({ createdAt: -1 }).lean(),
            AisheFacultyStatistic.find(departmentFilter).lean(),
            NirfCompositeScore.find(institutionFilter).lean(),
            NirfRankingCycle.find({}).lean(),
            InstitutionalApproval.find(institutionFilter).sort({ approvalEndDate: -1 }).lean(),
            StatutoryComplianceReport.find(institutionFilter).sort({ reportYear: -1 }).lean(),
            InspectionVisit.find(institutionFilter).sort({ visitDate: -1 }).lean(),
        ]);

    const filteredAisheCycleIds = new Set(aisheProfiles.map((item) => String(item.surveyCycleId)));
    const filteredAisheCycles = aisheCycles.filter((cycle) => filteredAisheCycleIds.has(String(cycle._id)));
    const filteredNirfCycleIds = new Set(nirfCompositeScores.map((item) => String(item.rankingCycleId)));
    const filteredNirfCycles = nirfCycles.filter((cycle) => filteredNirfCycleIds.has(String(cycle._id)));
    const inspectionIds = inspections.map((inspection) => inspection._id);
    const actionItems = inspectionIds.length
        ? await ComplianceActionItem.find({ inspectionId: { $in: inspectionIds } }).sort({ targetCompletionDate: 1 }).lean()
        : [];

    const analyticsBySurveyId = new Map(sssAnalytics.map((item) => [String(item.surveyId), item]));
    const cycleById = new Map(aisheCycles.map((item) => [String(item._id), item]));
    const nirfCycleById = new Map(nirfCycles.map((item) => [String(item._id), item]));

    return {
        access: {
            canViewAll: profile.isAdmin,
            institutionCount: institutionIds.length,
            departmentCount: departmentIds.length,
        },
        summary: {
            sssSurveyCount: sssSurveys.length,
            aisheCycleCount: filteredAisheCycles.length,
            nirfCycleCount: filteredNirfCycles.length,
            activeApprovalCount: approvals.filter((item) => item.status === "Active").length,
            openComplianceActions: actionItems.filter((item) => item.completionStatus !== "Completed").length,
        },
        sssSurveys: sssSurveys.map((survey) => ({
            ...survey,
            analytics: analyticsBySurveyId.get(String(survey._id)) ?? null,
        })),
        aisheCycles: filteredAisheCycles.map((cycle) => ({
            ...cycle,
            facultyStrength: aisheFacultyStats
                .filter((item) => String(item.surveyCycleId) === String(cycle._id))
                .reduce((sum, item) => sum + Number(item.totalFaculty ?? 0), 0),
            institutionProfile:
                aisheProfiles.find((item) => String(item.surveyCycleId) === String(cycle._id)) ?? null,
        })),
        nirfCycles: filteredNirfCycles.map((cycle) => ({
            ...cycle,
            compositeScore:
                nirfCompositeScores.find((item) => String(item.rankingCycleId) === String(cycle._id)) ?? null,
        })),
        compliance: {
            approvals,
            reports,
            inspections: inspections.map((inspection) => ({
                ...inspection,
                actionCount: actionItems.filter((item) => String(item.inspectionId) === String(inspection._id)).length,
            })),
            actionItems,
        },
        csv: {
            sssRows: [
                ["Survey", "Status", "Overall Satisfaction Index", "Response Rate"],
                ...sssSurveys.map((survey) => {
                    const analytics = analyticsBySurveyId.get(String(survey._id));
                    return [
                        survey.surveyTitle,
                        survey.surveyStatus,
                        String(analytics?.overallSatisfactionIndex ?? 0),
                        String(analytics?.responseRate ?? 0),
                    ];
                }),
            ],
            aisheRows: [
                ["Cycle", "Status", "Faculty Strength", "NAAC Grade"],
                ...filteredAisheCycles.map((cycle) => {
                    const profileRow = aisheProfiles.find((item) => String(item.surveyCycleId) === String(cycle._id));
                    const facultyStrength = aisheFacultyStats
                        .filter((item) => String(item.surveyCycleId) === String(cycle._id))
                        .reduce((sum, item) => sum + Number(item.totalFaculty ?? 0), 0);
                    return [
                        cycle.surveyYearLabel,
                        cycle.submissionStatus,
                        String(facultyStrength),
                        String(profileRow?.naacGrade ?? ""),
                    ];
                }),
            ],
            nirfRows: [
                ["Year", "Framework", "Status", "Composite Score", "Predicted Rank"],
                ...filteredNirfCycles.map((cycle) => {
                    const composite = nirfCompositeScores.find((item) => String(item.rankingCycleId) === String(cycle._id));
                    return [
                        String(cycle.rankingYear),
                        cycle.frameworkType,
                        cycle.status,
                        String(composite?.totalScore ?? 0),
                        String(composite?.predictedRank ?? ""),
                    ];
                }),
            ],
            complianceRows: [
                ["Inspection", "Visit Date", "Status", "Actions"],
                ...inspections.map((inspection) => [
                    inspection.inspectionType,
                    inspection.visitDate ? new Date(inspection.visitDate).toISOString().slice(0, 10) : "",
                    inspection.status,
                    String(actionItems.filter((item) => String(item.inspectionId) === String(inspection._id)).length),
                ]),
            ],
        },
        lookups: {
            aisheCycleById: cycleById,
            nirfCycleById,
        },
    };
}

export async function getAccreditationLeadershipCsvExport(
    actor: AuthorizationActor,
    type: "accreditation-sss" | "accreditation-aishe" | "accreditation-nirf" | "accreditation-compliance"
) {
    const dashboard = await getAccreditationLeadershipDashboard(actor);
    if (type === "accreditation-sss") {
        return { fileName: "leadership-accreditation-sss.csv", rows: dashboard.csv.sssRows };
    }
    if (type === "accreditation-aishe") {
        return { fileName: "leadership-accreditation-aishe.csv", rows: dashboard.csv.aisheRows };
    }
    if (type === "accreditation-nirf") {
        return { fileName: "leadership-accreditation-nirf.csv", rows: dashboard.csv.nirfRows };
    }

    return { fileName: "leadership-accreditation-compliance.csv", rows: dashboard.csv.complianceRows };
}

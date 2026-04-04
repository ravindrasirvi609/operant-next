import { z } from "zod";

import { sssSurveyStatusValues, } from "@/models/engagement/sss-survey";
import { sssQuestionAnalyticsBucketValues, } from "@/models/engagement/sss-question";
import { aisheSurveySubmissionStatusValues, } from "@/models/reporting/aishe-survey-cycle";
import { aisheInstitutionTypeValues, aisheLocationTypeValues, } from "@/models/reporting/aishe-institution-profile";
import { aisheSubmissionLogStatusValues, } from "@/models/reporting/aishe-submission-log";
import { nirfFrameworkTypeValues, nirfRankingCycleStatusValues, } from "@/models/reporting/nirf-ranking-cycle";
import { nirfTrendDirectionValues, } from "@/models/reporting/nirf-trend-analysis";
import { nirfSubmissionStatusValues, } from "@/models/reporting/nirf-submission-log";
import { nirfMetricDocumentVerificationStatusValues, } from "@/models/reporting/nirf-metric-document";
import { institutionalApprovalStatusValues, } from "@/models/core/institutional-approval";
import { statutoryComplianceStatusValues, } from "@/models/core/statutory-compliance-report";
import { inspectionVisitStatusValues, } from "@/models/core/inspection-visit";
import { complianceActionItemStatusValues, } from "@/models/core/compliance-action-item";

const objectIdSchema = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier.");
const optionalObjectIdSchema = z.string().trim().optional().refine(
    (value) => !value || /^[a-fA-F0-9]{24}$/.test(value),
    "Invalid identifier."
);
const optionalDateStringSchema = z.string().trim().optional();

export const sssQuestionDraftSchema = z.object({
    questionText: z.string().trim().min(5, "Question text is required."),
    ratingScaleMax: z.coerce.number().int().min(2).max(10).default(5),
    displayOrder: z.coerce.number().int().min(1),
    isMandatory: z.boolean().default(true),
    analyticsBucket: z.enum(sssQuestionAnalyticsBucketValues).default("General"),
});

export const sssSurveySchema = z.object({
    institutionId: objectIdSchema,
    academicYearId: objectIdSchema,
    surveyTitle: z.string().trim().min(3, "Survey title is required."),
    surveyStatus: z.enum(sssSurveyStatusValues).default("Draft"),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().min(1, "End date is required."),
    eligibleStudentIds: z.array(objectIdSchema).default([]),
    questions: z.array(sssQuestionDraftSchema).min(1, "At least one question is required."),
});

export const sssSurveyUpdateSchema = sssSurveySchema.partial();

export const sssStudentResponseAnswerSchema = z.object({
    questionId: objectIdSchema,
    ratingValue: z.coerce.number().int().min(1).max(10),
    remarks: z.string().trim().optional(),
});

export const sssStudentResponseSchema = z.object({
    answers: z.array(sssStudentResponseAnswerSchema).min(1, "At least one answer is required."),
});

const aisheProgramStatisticSchema = z.object({
    programId: objectIdSchema,
    intakeCapacity: z.coerce.number().min(0).default(0),
    studentsEnrolled: z.coerce.number().min(0).default(0),
    studentsPassed: z.coerce.number().min(0).default(0),
    studentsPlaced: z.coerce.number().min(0).default(0),
    studentsHigherStudies: z.coerce.number().min(0).default(0),
    dropoutCount: z.coerce.number().min(0).default(0),
});

const aisheStudentEnrollmentSchema = z.object({
    programId: objectIdSchema,
    maleStudents: z.coerce.number().min(0).default(0),
    femaleStudents: z.coerce.number().min(0).default(0),
    transgenderStudents: z.coerce.number().min(0).default(0),
    scStudents: z.coerce.number().min(0).default(0),
    stStudents: z.coerce.number().min(0).default(0),
    obcStudents: z.coerce.number().min(0).default(0),
    generalStudents: z.coerce.number().min(0).default(0),
    pwdStudents: z.coerce.number().min(0).default(0),
    foreignStudents: z.coerce.number().min(0).default(0),
});

const aisheFacultyStatisticSchema = z.object({
    departmentId: objectIdSchema,
    totalFaculty: z.coerce.number().min(0).default(0),
    maleFaculty: z.coerce.number().min(0).default(0),
    femaleFaculty: z.coerce.number().min(0).default(0),
    phdFaculty: z.coerce.number().min(0).default(0),
    pgFaculty: z.coerce.number().min(0).default(0),
    ugFaculty: z.coerce.number().min(0).default(0),
    professorsCount: z.coerce.number().min(0).default(0),
    associateProfessorsCount: z.coerce.number().min(0).default(0),
    assistantProfessorsCount: z.coerce.number().min(0).default(0),
    contractFacultyCount: z.coerce.number().min(0).default(0),
});

const aisheSubmissionLogSchema = z.object({
    submittedByUserId: optionalObjectIdSchema,
    submissionDate: optionalDateStringSchema,
    submissionReferenceNo: z.string().trim().optional(),
    submissionStatus: z.enum(aisheSubmissionLogStatusValues).default("Prepared"),
    remarks: z.string().trim().optional(),
});

const aisheSupportingDocumentSchema = z.object({
    documentId: objectIdSchema,
    documentCategory: z.string().trim().min(2, "Document category is required."),
    uploadedAt: optionalDateStringSchema,
});

export const aisheCycleSchema = z.object({
    academicYearId: objectIdSchema,
    surveyYearLabel: z.string().trim().min(4, "Survey year label is required."),
    submissionStartDate: optionalDateStringSchema,
    submissionEndDate: optionalDateStringSchema,
    submissionStatus: z.enum(aisheSurveySubmissionStatusValues).default("Preparation"),
    institutionProfile: z.object({
        institutionId: objectIdSchema,
        establishmentYear: z.coerce.number().int().min(1900).optional(),
        institutionType: z.enum(aisheInstitutionTypeValues).optional(),
        affiliatingUniversity: z.string().trim().optional(),
        campusAreaAcres: z.coerce.number().min(0).optional(),
        totalBuiltupAreaSqft: z.coerce.number().min(0).optional(),
        locationType: z.enum(aisheLocationTypeValues).optional(),
        naacGrade: z.string().trim().optional(),
        nirfRank: z.coerce.number().min(0).optional(),
    }),
    programStatistics: z.array(aisheProgramStatisticSchema).default([]),
    studentEnrollments: z.array(aisheStudentEnrollmentSchema).default([]),
    facultyStatistics: z.array(aisheFacultyStatisticSchema).default([]),
    staffStatistics: z.object({
        adminStaffCount: z.coerce.number().min(0).default(0),
        technicalStaffCount: z.coerce.number().min(0).default(0),
        libraryStaffCount: z.coerce.number().min(0).default(0),
        supportStaffCount: z.coerce.number().min(0).default(0),
    }),
    infrastructureStatistics: z.object({
        totalClassrooms: z.coerce.number().min(0).default(0),
        totalLaboratories: z.coerce.number().min(0).default(0),
        totalSeminarHalls: z.coerce.number().min(0).default(0),
        totalComputers: z.coerce.number().min(0).default(0),
        internetBandwidthMbps: z.coerce.number().min(0).default(0),
        libraryBooks: z.coerce.number().min(0).default(0),
        libraryJournals: z.coerce.number().min(0).default(0),
        hostelCapacityBoys: z.coerce.number().min(0).default(0),
        hostelCapacityGirls: z.coerce.number().min(0).default(0),
        sportsFacilitiesCount: z.coerce.number().min(0).default(0),
    }),
    financialStatistics: z.object({
        salaryExpenditure: z.coerce.number().min(0).default(0),
        infrastructureExpenditure: z.coerce.number().min(0).default(0),
        researchExpenditure: z.coerce.number().min(0).default(0),
        libraryExpenditure: z.coerce.number().min(0).default(0),
        studentSupportExpenditure: z.coerce.number().min(0).default(0),
        totalRevenueReceipts: z.coerce.number().min(0).default(0),
        totalGrantsReceived: z.coerce.number().min(0).default(0),
    }),
    studentSupportStatistics: z.object({
        studentsReceivedScholarship: z.coerce.number().min(0).default(0),
        studentsReceivedFeeReimbursement: z.coerce.number().min(0).default(0),
        studentsHostelResidents: z.coerce.number().min(0).default(0),
        studentsTransportFacility: z.coerce.number().min(0).default(0),
    }),
    submissionLogs: z.array(aisheSubmissionLogSchema).default([]),
    supportingDocuments: z.array(aisheSupportingDocumentSchema).default([]),
});

export const aisheCycleUpdateSchema = aisheCycleSchema.partial();

const nirfParameterSchema = z.object({
    parameterCode: z.string().trim().min(2).max(8),
    parameterName: z.string().trim().min(2),
    weightagePercentage: z.coerce.number().min(0).default(0),
    displayOrder: z.coerce.number().int().min(1).default(1),
});

const nirfMetricSchema = z.object({
    parameterCode: z.string().trim().min(2).max(8),
    metricCode: z.string().trim().min(3).max(20),
    metricName: z.string().trim().min(2),
    maxScore: z.coerce.number().min(0).default(0),
    dataSourceModule: z.string().trim().optional(),
    calculationFormulaReference: z.string().trim().optional(),
    institutionId: optionalObjectIdSchema,
    metricValueNumeric: z.coerce.number().optional(),
    metricValueText: z.string().trim().optional(),
    dataVerified: z.boolean().default(false),
    scoreObtained: z.coerce.number().min(0).default(0),
    scoreNormalized: z.coerce.number().min(0).default(0),
    documentIds: z.array(objectIdSchema).default([]),
    documentPurpose: z.string().trim().optional(),
    verificationStatus: z.enum(nirfMetricDocumentVerificationStatusValues).default("Pending"),
});

const nirfBenchmarkSchema = z.object({
    institutionName: z.string().trim().min(2),
    parameterCode: z.string().trim().min(2).max(8),
    parameterScore: z.coerce.number().min(0).default(0),
    overallScore: z.coerce.number().min(0).default(0),
    rankPosition: z.coerce.number().min(0).optional(),
    dataSource: z.string().trim().optional(),
});

const nirfDepartmentContributionSchema = z.object({
    departmentId: objectIdSchema,
    parameterCode: z.string().trim().min(2).max(8),
    contributionScore: z.coerce.number().min(0).default(0),
    remarks: z.string().trim().optional(),
});

const nirfTrendSchema = z.object({
    institutionId: objectIdSchema,
    rankingYear: z.coerce.number().int().min(2000),
    frameworkType: z.string().trim().min(2),
    overallRank: z.coerce.number().min(0).optional(),
    overallScore: z.coerce.number().min(0).default(0),
    trendDirection: z.enum(nirfTrendDirectionValues).default("Stable"),
});

const nirfSubmissionLogSchema = z.object({
    submittedByUserId: optionalObjectIdSchema,
    submissionReferenceNo: z.string().trim().optional(),
    submissionDate: optionalDateStringSchema,
    submissionStatus: z.enum(nirfSubmissionStatusValues).default("Prepared"),
    remarks: z.string().trim().optional(),
});

export const nirfCycleSchema = z.object({
    rankingYear: z.coerce.number().int().min(2000),
    frameworkType: z.enum(nirfFrameworkTypeValues).default("Overall"),
    dataSubmissionStart: optionalDateStringSchema,
    dataSubmissionEnd: optionalDateStringSchema,
    resultDeclaredDate: optionalDateStringSchema,
    status: z.enum(nirfRankingCycleStatusValues).default("Preparation"),
    institutionId: objectIdSchema,
    totalScore: z.coerce.number().min(0).default(0),
    predictedRank: z.coerce.number().min(0).optional(),
    confidenceIndex: z.coerce.number().min(0).max(100).optional(),
    parameters: z.array(nirfParameterSchema).default([]),
    metrics: z.array(nirfMetricSchema).default([]),
    benchmarks: z.array(nirfBenchmarkSchema).default([]),
    departmentContributions: z.array(nirfDepartmentContributionSchema).default([]),
    trends: z.array(nirfTrendSchema).default([]),
    submissionLogs: z.array(nirfSubmissionLogSchema).default([]),
});

export const nirfCycleUpdateSchema = nirfCycleSchema.partial();

export const regulatoryBodySchema = z.object({
    bodyName: z.string().trim().min(2, "Regulatory body name is required."),
    jurisdiction: z.string().trim().optional(),
    websiteUrl: z.string().trim().url("Invalid URL.").optional().or(z.literal("")),
});

export const regulatoryBodyUpdateSchema = regulatoryBodySchema.partial();

export const institutionalApprovalSchema = z.object({
    institutionId: objectIdSchema,
    regulatoryBodyId: objectIdSchema,
    approvalType: z.string().trim().min(2, "Approval type is required."),
    approvalReferenceNo: z.string().trim().optional(),
    approvalStartDate: optionalDateStringSchema,
    approvalEndDate: optionalDateStringSchema,
    status: z.enum(institutionalApprovalStatusValues).default("Active"),
    documentId: optionalObjectIdSchema,
});

export const institutionalApprovalUpdateSchema = institutionalApprovalSchema.partial();

export const statutoryComplianceReportSchema = z.object({
    institutionId: objectIdSchema,
    reportTitle: z.string().trim().min(2, "Report title is required."),
    reportYear: z.coerce.number().int().min(2000),
    submittedToBodyId: optionalObjectIdSchema,
    submissionDate: optionalDateStringSchema,
    complianceStatus: z.enum(statutoryComplianceStatusValues).default("Draft"),
    documentId: optionalObjectIdSchema,
});

export const statutoryComplianceReportUpdateSchema = statutoryComplianceReportSchema.partial();

const complianceActionDraftSchema = z.object({
    actionTitle: z.string().trim().min(2, "Action title is required."),
    actionDescription: z.string().trim().optional(),
    assignedToUserId: optionalObjectIdSchema,
    targetCompletionDate: optionalDateStringSchema,
    completionStatus: z.enum(complianceActionItemStatusValues).default("Open"),
    completionDocumentId: optionalObjectIdSchema,
});

export const inspectionVisitSchema = z.object({
    regulatoryBodyId: objectIdSchema,
    institutionId: objectIdSchema,
    visitDate: z.string().trim().min(1, "Visit date is required."),
    inspectionType: z.string().trim().min(2, "Inspection type is required."),
    inspectionReportDocumentId: optionalObjectIdSchema,
    complianceDeadline: optionalDateStringSchema,
    status: z.enum(inspectionVisitStatusValues).default("Scheduled"),
    actionItems: z.array(complianceActionDraftSchema).default([]),
});

export const inspectionVisitUpdateSchema = inspectionVisitSchema.partial();

export const complianceActionItemSchema = complianceActionDraftSchema.extend({
    inspectionId: objectIdSchema,
});

export const complianceActionItemUpdateSchema = complianceActionItemSchema.partial();

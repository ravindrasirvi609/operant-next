"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { FormMessage, Spinner } from "@/components/auth/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Option = {
    id: string;
    label: string;
    institutionId?: string;
};

type SssQuestionRecord = {
    _id?: string;
    questionText: string;
    ratingScaleMax?: number;
    displayOrder?: number;
    isMandatory?: boolean;
    analyticsBucket?: string;
};

type SssSurveyRecord = {
    _id: string;
    institutionId?: string;
    academicYearId?: string;
    surveyTitle: string;
    surveyStatus: string;
    startDate?: string;
    endDate?: string;
    questionCount: number;
    eligibleCount: number;
    eligibleStudentIds?: string[];
    questions?: SssQuestionRecord[];
    analytics?: {
        overallSatisfactionIndex?: number;
        responseRate?: number;
    } | null;
};

type AisheProgramStatisticRecord = {
    programId: string;
    intakeCapacity?: number;
    studentsEnrolled?: number;
    studentsPassed?: number;
    studentsPlaced?: number;
    studentsHigherStudies?: number;
    dropoutCount?: number;
};

type AisheStudentEnrollmentRecord = {
    programId: string;
    maleStudents?: number;
    femaleStudents?: number;
    transgenderStudents?: number;
    scStudents?: number;
    stStudents?: number;
    obcStudents?: number;
    generalStudents?: number;
    pwdStudents?: number;
    foreignStudents?: number;
};

type AisheFacultyStatisticRecord = {
    departmentId: string;
    totalFaculty?: number;
    maleFaculty?: number;
    femaleFaculty?: number;
    phdFaculty?: number;
    pgFaculty?: number;
    ugFaculty?: number;
    professorsCount?: number;
    associateProfessorsCount?: number;
    assistantProfessorsCount?: number;
    contractFacultyCount?: number;
};

type AisheCycleRecord = {
    _id: string;
    academicYearId?: string;
    surveyYearLabel: string;
    submissionStatus: string;
    submissionStartDate?: string;
    submissionEndDate?: string;
    totalEnrollment: number;
    totalFaculty: number;
    institutionProfile?: {
        institutionId?: string;
        establishmentYear?: number;
        institutionType?: string;
        affiliatingUniversity?: string;
        campusAreaAcres?: number;
        totalBuiltupAreaSqft?: number;
        locationType?: string;
        naacGrade?: string;
        nirfRank?: number;
    } | null;
    programStatistics?: AisheProgramStatisticRecord[];
    studentEnrollments?: AisheStudentEnrollmentRecord[];
    facultyStatistics?: AisheFacultyStatisticRecord[];
    staffStatistics?: {
        adminStaffCount?: number;
        technicalStaffCount?: number;
        libraryStaffCount?: number;
        supportStaffCount?: number;
    } | null;
    infrastructureStatistics?: {
        totalClassrooms?: number;
        totalLaboratories?: number;
        totalSeminarHalls?: number;
        totalComputers?: number;
        internetBandwidthMbps?: number;
        libraryBooks?: number;
        libraryJournals?: number;
        hostelCapacityBoys?: number;
        hostelCapacityGirls?: number;
        sportsFacilitiesCount?: number;
    } | null;
    financialStatistics?: {
        salaryExpenditure?: number;
        infrastructureExpenditure?: number;
        researchExpenditure?: number;
        libraryExpenditure?: number;
        studentSupportExpenditure?: number;
        totalRevenueReceipts?: number;
        totalGrantsReceived?: number;
    } | null;
    studentSupportStatistics?: {
        studentsReceivedScholarship?: number;
        studentsReceivedFeeReimbursement?: number;
        studentsHostelResidents?: number;
        studentsTransportFacility?: number;
    } | null;
    submissionLogs?: Array<{
        submittedByUserId?: string;
        submissionDate?: string;
        submissionReferenceNo?: string;
        submissionStatus?: string;
        remarks?: string;
    }>;
    supportingDocuments?: Array<{
        documentId: string;
        documentCategory?: string;
        uploadedAt?: string;
    }>;
};

type NirfMetricRecord = {
    parameterCode: string;
    metricCode: string;
    metricName: string;
    maxScore?: number;
    institutionId?: string;
    metricValueNumeric?: number;
    metricValueText?: string;
    dataVerified?: boolean;
    scoreObtained?: number;
    scoreNormalized?: number;
    documentIds?: string[];
};

type NirfCycleRecord = {
    _id: string;
    rankingYear: number;
    frameworkType: string;
    status: string;
    dataSubmissionStart?: string;
    dataSubmissionEnd?: string;
    resultDeclaredDate?: string;
    institutionId?: string;
    metricCount: number;
    verifiedMetricCount: number;
    compositeScore?: {
        totalScore?: number;
        predictedRank?: number;
        confidenceIndex?: number;
    } | null;
    metrics?: NirfMetricRecord[];
    benchmarks?: Array<{
        institutionName: string;
        parameterCode: string;
        parameterScore?: number;
        overallScore?: number;
        rankPosition?: number;
        dataSource?: string;
    }>;
    departmentContributions?: Array<{
        departmentId: string;
        parameterCode: string;
        contributionScore?: number;
        remarks?: string;
    }>;
    trends?: Array<{
        institutionId: string;
        rankingYear: number;
        frameworkType: string;
        overallRank?: number;
        overallScore?: number;
        trendDirection?: string;
    }>;
    submissionLogs?: Array<{
        submittedByUserId?: string;
        submissionReferenceNo?: string;
        submissionDate?: string;
        submissionStatus?: string;
        remarks?: string;
    }>;
};

type RegulatoryBodyRecord = {
    _id: string;
    bodyName: string;
    jurisdiction?: string;
    websiteUrl?: string;
};

type ApprovalRecord = {
    _id: string;
    institutionId?: string;
    regulatoryBodyId?: string;
    approvalType: string;
    status: string;
    approvalReferenceNo?: string;
    approvalStartDate?: string;
    approvalEndDate?: string;
    documentId?: string;
};

type ReportRecord = {
    _id: string;
    institutionId?: string;
    submittedToBodyId?: string;
    reportTitle: string;
    reportYear: number;
    submissionDate?: string;
    complianceStatus: string;
    documentId?: string;
};

type ComplianceActionRecord = {
    _id: string;
    inspectionId?: string;
    actionTitle: string;
    actionDescription?: string;
    assignedToUserId?: string;
    completionStatus: string;
    targetCompletionDate?: string;
    completionDocumentId?: string;
};

type InspectionRecord = {
    _id: string;
    inspectionType: string;
    regulatoryBodyId?: string;
    institutionId?: string;
    status: string;
    visitDate?: string;
    complianceDeadline?: string;
    inspectionReportDocumentId?: string;
    actionItems?: ComplianceActionRecord[];
};

type AccreditationOperationsManagerProps = {
    institutionOptions: Option[];
    academicYearOptions: Option[];
    departmentOptions: Option[];
    programOptions: Option[];
    userOptions: Option[];
    studentOptions: Option[];
    documentOptions: Option[];
    sssSurveys: SssSurveyRecord[];
    aisheCycles: AisheCycleRecord[];
    nirfCycles: NirfCycleRecord[];
    regulatoryBodies: RegulatoryBodyRecord[];
    approvals: ApprovalRecord[];
    reports: ReportRecord[];
    inspections: InspectionRecord[];
    actionItems: ComplianceActionRecord[];
};

async function requestJson<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers ?? {}),
        },
        ...options,
    });

    const data = (await response.json()) as T & { message?: string };
    if (!response.ok) {
        throw new Error(data.message ?? "Request failed.");
    }

    return data;
}

function parsePipeLines(text: string) {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split("|").map((part) => part.trim()));
}

function parseIdLines(text: string) {
    return text
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean);
}

function joinLines(lines: string[]) {
    return lines.filter(Boolean).join("\n");
}

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString();
}

function toDateInputValue(value?: string) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}

function asString(value?: string | number | null) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function numberFromField(value: string) {
    return value.trim() ? Number(value) : undefined;
}

function createDefaultSssForm(defaultInstitutionId: string, defaultAcademicYearId: string) {
    return {
        institutionId: defaultInstitutionId,
        academicYearId: defaultAcademicYearId,
        surveyTitle: "Student Satisfaction Survey",
        surveyStatus: "Draft",
        startDate: "",
        endDate: "",
        eligibleStudentIdsText: "",
        questionLines:
            "TeachingLearning | The teaching and mentoring process in your institution facilitates you in cognitive, social and emotional growth. | 5 | yes\nInfrastructure | The institution provides adequate infrastructure and learning resources for your academic needs. | 5 | yes\nStudentSupport | Student support services such as guidance, grievance handling, and mentoring are effective. | 5 | yes\nGovernance | Governance, communication, and institutional responsiveness meet your expectations. | 5 | yes",
    };
}

function createDefaultAisheForm(defaultInstitutionId: string, defaultAcademicYearId: string, defaultProgramId: string, defaultDepartmentId: string) {
    return {
        academicYearId: defaultAcademicYearId,
        surveyYearLabel: "",
        submissionStatus: "Preparation",
        institutionId: defaultInstitutionId,
        submissionStartDate: "",
        submissionEndDate: "",
        establishmentYear: "",
        institutionType: "Private",
        affiliatingUniversity: "",
        campusAreaAcres: "",
        totalBuiltupAreaSqft: "",
        locationType: "Urban",
        naacGrade: "",
        nirfRank: "",
        staffAdminCount: "",
        staffTechnicalCount: "",
        staffLibraryCount: "",
        staffSupportCount: "",
        totalClassrooms: "",
        totalLaboratories: "",
        totalSeminarHalls: "",
        totalComputers: "",
        internetBandwidthMbps: "",
        libraryBooks: "",
        libraryJournals: "",
        hostelCapacityBoys: "",
        hostelCapacityGirls: "",
        sportsFacilitiesCount: "",
        salaryExpenditure: "",
        infrastructureExpenditure: "",
        researchExpenditure: "",
        libraryExpenditure: "",
        studentSupportExpenditure: "",
        totalRevenueReceipts: "",
        totalGrantsReceived: "",
        studentsReceivedScholarship: "",
        studentsReceivedFeeReimbursement: "",
        studentsHostelResidents: "",
        studentsTransportFacility: "",
        programStatisticsLines: defaultProgramId ? `${defaultProgramId} | 120 | 110 | 104 | 60 | 18 | 4` : "",
        studentEnrollmentLines: defaultProgramId ? `${defaultProgramId} | 58 | 50 | 2 | 12 | 4 | 28 | 66 | 3 | 1` : "",
        facultyStatisticsLines: defaultDepartmentId ? `${defaultDepartmentId} | 24 | 13 | 11 | 12 | 10 | 2 | 3 | 5 | 14 | 2` : "",
        submissionLogLines: "",
        supportingDocumentLines: "",
    };
}

function createDefaultNirfForm(defaultInstitutionId: string, defaultDepartmentId: string) {
    return {
        rankingYear: String(new Date().getFullYear()),
        frameworkType: "Overall",
        status: "Preparation",
        institutionId: defaultInstitutionId,
        dataSubmissionStart: "",
        dataSubmissionEnd: "",
        resultDeclaredDate: "",
        totalScore: "",
        predictedRank: "",
        confidenceIndex: "",
        metricsLines:
            "TLR | TLR1 | Faculty Student Ratio | 30 | 24 | 24 | yes | 24 |\nRPC | RPC1 | Research Publications | 30 | 18 | 18 | yes | 18 |\nGO | GO1 | Graduation Outcomes | 20 | 15 | 15 | yes | 15 |\nOI | OI1 | Outreach and Inclusivity | 10 | 7 | 7 | yes | 7 |\nPR | PR1 | Peer Perception | 10 | 6 | 6 | yes | 6 |",
        benchmarkLines: "",
        departmentContributionLines: defaultDepartmentId
            ? `${defaultDepartmentId} | TLR | 14 | Teaching load and faculty profile contribution`
            : "",
        trendLines: defaultInstitutionId
            ? `${defaultInstitutionId} | ${new Date().getFullYear() - 1} | Overall | 151 | 61 | Up`
            : "",
        submissionLogLines: "",
    };
}

function createDefaultBodyForm() {
    return {
        bodyName: "",
        jurisdiction: "",
        websiteUrl: "",
    };
}

function createDefaultApprovalForm(defaultInstitutionId: string, defaultBodyId: string) {
    return {
        institutionId: defaultInstitutionId,
        regulatoryBodyId: defaultBodyId,
        approvalType: "Affiliation",
        approvalReferenceNo: "",
        approvalStartDate: "",
        approvalEndDate: "",
        status: "Active",
        documentId: "",
    };
}

function createDefaultReportForm(defaultInstitutionId: string, defaultBodyId: string) {
    return {
        institutionId: defaultInstitutionId,
        submittedToBodyId: defaultBodyId,
        reportTitle: "",
        reportYear: String(new Date().getFullYear()),
        submissionDate: "",
        complianceStatus: "Draft",
        documentId: "",
    };
}

function createDefaultInspectionForm(defaultInstitutionId: string, defaultBodyId: string) {
    return {
        institutionId: defaultInstitutionId,
        regulatoryBodyId: defaultBodyId,
        inspectionType: "Regulatory Visit",
        visitDate: "",
        complianceDeadline: "",
        status: "Scheduled",
        inspectionReportDocumentId: "",
        actionLines: "",
    };
}

function createDefaultActionForm(defaultInspectionId: string) {
    return {
        inspectionId: defaultInspectionId,
        actionTitle: "",
        actionDescription: "",
        assignedToUserId: "",
        targetCompletionDate: "",
        completionStatus: "Open",
        completionDocumentId: "",
    };
}

function mapSssRecordToForm(record: SssSurveyRecord, fallback: ReturnType<typeof createDefaultSssForm>) {
    return {
        institutionId: record.institutionId ?? fallback.institutionId,
        academicYearId: record.academicYearId ?? fallback.academicYearId,
        surveyTitle: record.surveyTitle,
        surveyStatus: record.surveyStatus,
        startDate: toDateInputValue(record.startDate),
        endDate: toDateInputValue(record.endDate),
        eligibleStudentIdsText: joinLines(record.eligibleStudentIds ?? []),
        questionLines: joinLines(
            (record.questions ?? []).map(
                (question) =>
                    `${question.analyticsBucket ?? "General"} | ${question.questionText} | ${question.ratingScaleMax ?? 5} | ${question.isMandatory === false ? "no" : "yes"}`
            )
        ),
    };
}

function mapAisheRecordToForm(
    record: AisheCycleRecord,
    fallback: ReturnType<typeof createDefaultAisheForm>
) {
    return {
        academicYearId: record.academicYearId ?? fallback.academicYearId,
        surveyYearLabel: record.surveyYearLabel,
        submissionStatus: record.submissionStatus,
        institutionId: record.institutionProfile?.institutionId ?? fallback.institutionId,
        submissionStartDate: toDateInputValue(record.submissionStartDate),
        submissionEndDate: toDateInputValue(record.submissionEndDate),
        establishmentYear: asString(record.institutionProfile?.establishmentYear),
        institutionType: record.institutionProfile?.institutionType ?? fallback.institutionType,
        affiliatingUniversity: record.institutionProfile?.affiliatingUniversity ?? "",
        campusAreaAcres: asString(record.institutionProfile?.campusAreaAcres),
        totalBuiltupAreaSqft: asString(record.institutionProfile?.totalBuiltupAreaSqft),
        locationType: record.institutionProfile?.locationType ?? fallback.locationType,
        naacGrade: record.institutionProfile?.naacGrade ?? "",
        nirfRank: asString(record.institutionProfile?.nirfRank),
        staffAdminCount: asString(record.staffStatistics?.adminStaffCount),
        staffTechnicalCount: asString(record.staffStatistics?.technicalStaffCount),
        staffLibraryCount: asString(record.staffStatistics?.libraryStaffCount),
        staffSupportCount: asString(record.staffStatistics?.supportStaffCount),
        totalClassrooms: asString(record.infrastructureStatistics?.totalClassrooms),
        totalLaboratories: asString(record.infrastructureStatistics?.totalLaboratories),
        totalSeminarHalls: asString(record.infrastructureStatistics?.totalSeminarHalls),
        totalComputers: asString(record.infrastructureStatistics?.totalComputers),
        internetBandwidthMbps: asString(record.infrastructureStatistics?.internetBandwidthMbps),
        libraryBooks: asString(record.infrastructureStatistics?.libraryBooks),
        libraryJournals: asString(record.infrastructureStatistics?.libraryJournals),
        hostelCapacityBoys: asString(record.infrastructureStatistics?.hostelCapacityBoys),
        hostelCapacityGirls: asString(record.infrastructureStatistics?.hostelCapacityGirls),
        sportsFacilitiesCount: asString(record.infrastructureStatistics?.sportsFacilitiesCount),
        salaryExpenditure: asString(record.financialStatistics?.salaryExpenditure),
        infrastructureExpenditure: asString(record.financialStatistics?.infrastructureExpenditure),
        researchExpenditure: asString(record.financialStatistics?.researchExpenditure),
        libraryExpenditure: asString(record.financialStatistics?.libraryExpenditure),
        studentSupportExpenditure: asString(record.financialStatistics?.studentSupportExpenditure),
        totalRevenueReceipts: asString(record.financialStatistics?.totalRevenueReceipts),
        totalGrantsReceived: asString(record.financialStatistics?.totalGrantsReceived),
        studentsReceivedScholarship: asString(record.studentSupportStatistics?.studentsReceivedScholarship),
        studentsReceivedFeeReimbursement: asString(record.studentSupportStatistics?.studentsReceivedFeeReimbursement),
        studentsHostelResidents: asString(record.studentSupportStatistics?.studentsHostelResidents),
        studentsTransportFacility: asString(record.studentSupportStatistics?.studentsTransportFacility),
        programStatisticsLines: joinLines(
            (record.programStatistics ?? []).map(
                (item) =>
                    `${item.programId} | ${item.intakeCapacity ?? 0} | ${item.studentsEnrolled ?? 0} | ${item.studentsPassed ?? 0} | ${item.studentsPlaced ?? 0} | ${item.studentsHigherStudies ?? 0} | ${item.dropoutCount ?? 0}`
            )
        ),
        studentEnrollmentLines: joinLines(
            (record.studentEnrollments ?? []).map(
                (item) =>
                    `${item.programId} | ${item.maleStudents ?? 0} | ${item.femaleStudents ?? 0} | ${item.transgenderStudents ?? 0} | ${item.scStudents ?? 0} | ${item.stStudents ?? 0} | ${item.obcStudents ?? 0} | ${item.generalStudents ?? 0} | ${item.pwdStudents ?? 0} | ${item.foreignStudents ?? 0}`
            )
        ),
        facultyStatisticsLines: joinLines(
            (record.facultyStatistics ?? []).map(
                (item) =>
                    `${item.departmentId} | ${item.totalFaculty ?? 0} | ${item.maleFaculty ?? 0} | ${item.femaleFaculty ?? 0} | ${item.phdFaculty ?? 0} | ${item.pgFaculty ?? 0} | ${item.ugFaculty ?? 0} | ${item.professorsCount ?? 0} | ${item.associateProfessorsCount ?? 0} | ${item.assistantProfessorsCount ?? 0} | ${item.contractFacultyCount ?? 0}`
            )
        ),
        submissionLogLines: joinLines(
            (record.submissionLogs ?? []).map(
                (item) =>
                    `${item.submittedByUserId ?? ""} | ${toDateInputValue(item.submissionDate)} | ${item.submissionReferenceNo ?? ""} | ${item.submissionStatus ?? "Prepared"} | ${item.remarks ?? ""}`
            )
        ),
        supportingDocumentLines: joinLines(
            (record.supportingDocuments ?? []).map(
                (item) => `${item.documentId} | ${item.documentCategory ?? "report"} | ${toDateInputValue(item.uploadedAt)}`
            )
        ),
    };
}

function mapNirfRecordToForm(record: NirfCycleRecord, fallback: ReturnType<typeof createDefaultNirfForm>) {
    return {
        rankingYear: String(record.rankingYear),
        frameworkType: record.frameworkType,
        status: record.status,
        institutionId: record.institutionId ?? fallback.institutionId,
        dataSubmissionStart: toDateInputValue(record.dataSubmissionStart),
        dataSubmissionEnd: toDateInputValue(record.dataSubmissionEnd),
        resultDeclaredDate: toDateInputValue(record.resultDeclaredDate),
        totalScore: asString(record.compositeScore?.totalScore),
        predictedRank: asString(record.compositeScore?.predictedRank),
        confidenceIndex: asString(record.compositeScore?.confidenceIndex),
        metricsLines: joinLines(
            (record.metrics ?? []).map(
                (metric) =>
                    `${metric.parameterCode} | ${metric.metricCode} | ${metric.metricName} | ${metric.maxScore ?? 0} | ${metric.metricValueNumeric ?? metric.metricValueText ?? ""} | ${metric.scoreNormalized ?? 0} | ${metric.dataVerified ? "yes" : "no"} | ${metric.scoreObtained ?? 0} | ${(metric.documentIds ?? []).join(",")}`
            )
        ),
        benchmarkLines: joinLines(
            (record.benchmarks ?? []).map(
                (item) =>
                    `${item.institutionName} | ${item.parameterCode} | ${item.parameterScore ?? 0} | ${item.overallScore ?? 0} | ${item.rankPosition ?? ""} | ${item.dataSource ?? ""}`
            )
        ),
        departmentContributionLines: joinLines(
            (record.departmentContributions ?? []).map(
                (item) => `${item.departmentId} | ${item.parameterCode} | ${item.contributionScore ?? 0} | ${item.remarks ?? ""}`
            )
        ),
        trendLines: joinLines(
            (record.trends ?? []).map(
                (item) =>
                    `${item.institutionId} | ${item.rankingYear} | ${item.frameworkType} | ${item.overallRank ?? ""} | ${item.overallScore ?? 0} | ${item.trendDirection ?? "Stable"}`
            )
        ),
        submissionLogLines: joinLines(
            (record.submissionLogs ?? []).map(
                (item) =>
                    `${item.submittedByUserId ?? ""} | ${item.submissionReferenceNo ?? ""} | ${toDateInputValue(item.submissionDate)} | ${item.submissionStatus ?? "Prepared"} | ${item.remarks ?? ""}`
            )
        ),
    };
}

function mapBodyRecordToForm(record: RegulatoryBodyRecord) {
    return {
        bodyName: record.bodyName,
        jurisdiction: record.jurisdiction ?? "",
        websiteUrl: record.websiteUrl ?? "",
    };
}

function mapApprovalRecordToForm(record: ApprovalRecord, fallback: ReturnType<typeof createDefaultApprovalForm>) {
    return {
        institutionId: record.institutionId ?? fallback.institutionId,
        regulatoryBodyId: record.regulatoryBodyId ?? fallback.regulatoryBodyId,
        approvalType: record.approvalType,
        approvalReferenceNo: record.approvalReferenceNo ?? "",
        approvalStartDate: toDateInputValue(record.approvalStartDate),
        approvalEndDate: toDateInputValue(record.approvalEndDate),
        status: record.status,
        documentId: record.documentId ?? "",
    };
}

function mapReportRecordToForm(record: ReportRecord, fallback: ReturnType<typeof createDefaultReportForm>) {
    return {
        institutionId: record.institutionId ?? fallback.institutionId,
        submittedToBodyId: record.submittedToBodyId ?? fallback.submittedToBodyId,
        reportTitle: record.reportTitle,
        reportYear: String(record.reportYear),
        submissionDate: toDateInputValue(record.submissionDate),
        complianceStatus: record.complianceStatus,
        documentId: record.documentId ?? "",
    };
}

function mapInspectionRecordToForm(record: InspectionRecord, fallback: ReturnType<typeof createDefaultInspectionForm>) {
    return {
        institutionId: record.institutionId ?? fallback.institutionId,
        regulatoryBodyId: record.regulatoryBodyId ?? fallback.regulatoryBodyId,
        inspectionType: record.inspectionType,
        visitDate: toDateInputValue(record.visitDate),
        complianceDeadline: toDateInputValue(record.complianceDeadline),
        status: record.status,
        inspectionReportDocumentId: record.inspectionReportDocumentId ?? "",
        actionLines: joinLines(
            (record.actionItems ?? []).map(
                (item) =>
                    `${item.actionTitle} | ${item.assignedToUserId ?? ""} | ${toDateInputValue(item.targetCompletionDate)} | ${item.completionStatus} | ${item.actionDescription ?? ""} | ${item.completionDocumentId ?? ""}`
            )
        ),
    };
}

function mapActionRecordToForm(record: ComplianceActionRecord, fallback: ReturnType<typeof createDefaultActionForm>) {
    return {
        inspectionId: record.inspectionId ?? fallback.inspectionId,
        actionTitle: record.actionTitle,
        actionDescription: record.actionDescription ?? "",
        assignedToUserId: record.assignedToUserId ?? "",
        targetCompletionDate: toDateInputValue(record.targetCompletionDate),
        completionStatus: record.completionStatus,
        completionDocumentId: record.completionDocumentId ?? "",
    };
}

function EditBanner({
    label,
    onReset,
}: {
    label: string;
    onReset: () => void;
}) {
    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div>
                <div className="text-sm font-semibold text-amber-950">Editing existing record</div>
                <div className="text-xs text-amber-800">{label}</div>
            </div>
            <Button onClick={onReset} type="button" variant="outline">
                Switch to new record
            </Button>
        </div>
    );
}

function NumberField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <Input value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
    );
}

export function AccreditationOperationsManager({
    institutionOptions,
    academicYearOptions,
    departmentOptions,
    programOptions,
    userOptions,
    studentOptions,
    documentOptions,
    sssSurveys,
    aisheCycles,
    nirfCycles,
    regulatoryBodies,
    approvals,
    reports,
    inspections,
    actionItems,
}: AccreditationOperationsManagerProps) {
    const router = useRouter();
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const defaultInstitutionId = institutionOptions[0]?.id ?? "";
    const defaultAcademicYearId = academicYearOptions[0]?.id ?? "";
    const defaultBodyId = regulatoryBodies[0]?._id ?? "";
    const defaultProgramId = programOptions[0]?.id ?? "";
    const defaultDepartmentId = departmentOptions[0]?.id ?? "";
    const defaultInspectionId = inspections[0]?._id ?? "";

    const defaultSssForm = useMemo(
        () => createDefaultSssForm(defaultInstitutionId, defaultAcademicYearId),
        [defaultAcademicYearId, defaultInstitutionId]
    );
    const defaultAisheForm = useMemo(
        () => createDefaultAisheForm(defaultInstitutionId, defaultAcademicYearId, defaultProgramId, defaultDepartmentId),
        [defaultAcademicYearId, defaultDepartmentId, defaultInstitutionId, defaultProgramId]
    );
    const defaultNirfForm = useMemo(
        () => createDefaultNirfForm(defaultInstitutionId, defaultDepartmentId),
        [defaultDepartmentId, defaultInstitutionId]
    );
    const defaultBodyForm = useMemo(() => createDefaultBodyForm(), []);
    const defaultApprovalForm = useMemo(
        () => createDefaultApprovalForm(defaultInstitutionId, defaultBodyId),
        [defaultBodyId, defaultInstitutionId]
    );
    const defaultReportForm = useMemo(
        () => createDefaultReportForm(defaultInstitutionId, defaultBodyId),
        [defaultBodyId, defaultInstitutionId]
    );
    const defaultInspectionForm = useMemo(
        () => createDefaultInspectionForm(defaultInstitutionId, defaultBodyId),
        [defaultBodyId, defaultInstitutionId]
    );
    const defaultActionForm = useMemo(
        () => createDefaultActionForm(defaultInspectionId),
        [defaultInspectionId]
    );

    const [editingSssSurveyId, setEditingSssSurveyId] = useState<string | null>(null);
    const [editingAisheCycleId, setEditingAisheCycleId] = useState<string | null>(null);
    const [editingNirfCycleId, setEditingNirfCycleId] = useState<string | null>(null);
    const [editingBodyId, setEditingBodyId] = useState<string | null>(null);
    const [editingApprovalId, setEditingApprovalId] = useState<string | null>(null);
    const [editingReportId, setEditingReportId] = useState<string | null>(null);
    const [editingInspectionId, setEditingInspectionId] = useState<string | null>(null);
    const [editingActionId, setEditingActionId] = useState<string | null>(null);

    const [sssForm, setSssForm] = useState(defaultSssForm);
    const [aisheForm, setAisheForm] = useState(defaultAisheForm);
    const [nirfForm, setNirfForm] = useState(defaultNirfForm);
    const [bodyForm, setBodyForm] = useState(defaultBodyForm);
    const [approvalForm, setApprovalForm] = useState(defaultApprovalForm);
    const [reportForm, setReportForm] = useState(defaultReportForm);
    const [inspectionForm, setInspectionForm] = useState(defaultInspectionForm);
    const [actionForm, setActionForm] = useState(defaultActionForm);

    const bodyOptions = useMemo(
        () => regulatoryBodies.map((body) => ({ id: body._id, label: body.bodyName })),
        [regulatoryBodies]
    );
    const inspectionOptions = useMemo(
        () => inspections.map((inspection) => ({ id: inspection._id, label: `${inspection.inspectionType} · ${formatDate(inspection.visitDate)}` })),
        [inspections]
    );
    const filteredStudentOptions = useMemo(
        () => studentOptions.filter((student) => !student.institutionId || student.institutionId === sssForm.institutionId),
        [sssForm.institutionId, studentOptions]
    );

    const resetSssForm = () => {
        setEditingSssSurveyId(null);
        setSssForm(createDefaultSssForm(defaultInstitutionId, defaultAcademicYearId));
    };

    const resetAisheForm = () => {
        setEditingAisheCycleId(null);
        setAisheForm(createDefaultAisheForm(defaultInstitutionId, defaultAcademicYearId, defaultProgramId, defaultDepartmentId));
    };

    const resetNirfForm = () => {
        setEditingNirfCycleId(null);
        setNirfForm(createDefaultNirfForm(defaultInstitutionId, defaultDepartmentId));
    };

    const resetBodyForm = () => {
        setEditingBodyId(null);
        setBodyForm(createDefaultBodyForm());
    };

    const resetApprovalForm = () => {
        setEditingApprovalId(null);
        setApprovalForm(createDefaultApprovalForm(defaultInstitutionId, defaultBodyId));
    };

    const resetReportForm = () => {
        setEditingReportId(null);
        setReportForm(createDefaultReportForm(defaultInstitutionId, defaultBodyId));
    };

    const resetInspectionForm = () => {
        setEditingInspectionId(null);
        setInspectionForm(createDefaultInspectionForm(defaultInstitutionId, defaultBodyId));
    };

    const resetActionForm = () => {
        setEditingActionId(null);
        setActionForm(createDefaultActionForm(defaultInspectionId));
    };

    const submitAction = (action: () => Promise<string>) => {
        setMessage(null);
        startTransition(async () => {
            try {
                const successMessage = await action();
                setMessage({ type: "success", text: successMessage });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text: error instanceof Error ? error.message : "Request failed.",
                });
            }
        });
    };

    function handleSssSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAction(async () => {
            const questions = parsePipeLines(sssForm.questionLines).map((parts, index) => ({
                questionText: parts[1] ?? parts[0] ?? "",
                analyticsBucket: (parts[0] || "General").replace(/\s+/g, "") || "General",
                ratingScaleMax: Number(parts[2] ?? 5),
                displayOrder: index + 1,
                isMandatory: (parts[3] ?? "yes").toLowerCase() !== "no",
            }));

            const payload = {
                institutionId: sssForm.institutionId,
                academicYearId: sssForm.academicYearId,
                surveyTitle: sssForm.surveyTitle,
                surveyStatus: sssForm.surveyStatus,
                startDate: sssForm.startDate,
                endDate: sssForm.endDate,
                eligibleStudentIds: parseIdLines(sssForm.eligibleStudentIdsText),
                questions,
            };

            await requestJson(
                editingSssSurveyId
                    ? `/api/admin/accreditation/sss/surveys/${editingSssSurveyId}`
                    : "/api/admin/accreditation/sss/surveys",
                {
                    method: editingSssSurveyId ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                }
            );

            resetSssForm();
            return editingSssSurveyId
                ? "SSS survey updated successfully."
                : "SSS survey created successfully.";
        });
    }

    function handleAisheSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAction(async () => {
            const programStatistics = parsePipeLines(aisheForm.programStatisticsLines).map((parts) => ({
                programId: parts[0],
                intakeCapacity: Number(parts[1] ?? 0),
                studentsEnrolled: Number(parts[2] ?? 0),
                studentsPassed: Number(parts[3] ?? 0),
                studentsPlaced: Number(parts[4] ?? 0),
                studentsHigherStudies: Number(parts[5] ?? 0),
                dropoutCount: Number(parts[6] ?? 0),
            }));
            const studentEnrollments = parsePipeLines(aisheForm.studentEnrollmentLines).map((parts) => ({
                programId: parts[0],
                maleStudents: Number(parts[1] ?? 0),
                femaleStudents: Number(parts[2] ?? 0),
                transgenderStudents: Number(parts[3] ?? 0),
                scStudents: Number(parts[4] ?? 0),
                stStudents: Number(parts[5] ?? 0),
                obcStudents: Number(parts[6] ?? 0),
                generalStudents: Number(parts[7] ?? 0),
                pwdStudents: Number(parts[8] ?? 0),
                foreignStudents: Number(parts[9] ?? 0),
            }));
            const facultyStatistics = parsePipeLines(aisheForm.facultyStatisticsLines).map((parts) => ({
                departmentId: parts[0],
                totalFaculty: Number(parts[1] ?? 0),
                maleFaculty: Number(parts[2] ?? 0),
                femaleFaculty: Number(parts[3] ?? 0),
                phdFaculty: Number(parts[4] ?? 0),
                pgFaculty: Number(parts[5] ?? 0),
                ugFaculty: Number(parts[6] ?? 0),
                professorsCount: Number(parts[7] ?? 0),
                associateProfessorsCount: Number(parts[8] ?? 0),
                assistantProfessorsCount: Number(parts[9] ?? 0),
                contractFacultyCount: Number(parts[10] ?? 0),
            }));
            const submissionLogs = parsePipeLines(aisheForm.submissionLogLines).map((parts) => ({
                submittedByUserId: parts[0] || undefined,
                submissionDate: parts[1] || undefined,
                submissionReferenceNo: parts[2] || undefined,
                submissionStatus: parts[3] || "Prepared",
                remarks: parts[4] || undefined,
            }));
            const supportingDocuments = parsePipeLines(aisheForm.supportingDocumentLines).map((parts) => ({
                documentId: parts[0],
                documentCategory: parts[1] ?? "report",
                uploadedAt: parts[2] || undefined,
            }));

            const payload = {
                academicYearId: aisheForm.academicYearId,
                surveyYearLabel: aisheForm.surveyYearLabel,
                submissionStartDate: aisheForm.submissionStartDate || undefined,
                submissionEndDate: aisheForm.submissionEndDate || undefined,
                submissionStatus: aisheForm.submissionStatus,
                institutionProfile: {
                    institutionId: aisheForm.institutionId,
                    establishmentYear: numberFromField(aisheForm.establishmentYear),
                    institutionType: aisheForm.institutionType,
                    affiliatingUniversity: aisheForm.affiliatingUniversity || undefined,
                    campusAreaAcres: numberFromField(aisheForm.campusAreaAcres),
                    totalBuiltupAreaSqft: numberFromField(aisheForm.totalBuiltupAreaSqft),
                    locationType: aisheForm.locationType,
                    naacGrade: aisheForm.naacGrade || undefined,
                    nirfRank: numberFromField(aisheForm.nirfRank),
                },
                programStatistics,
                studentEnrollments,
                facultyStatistics,
                staffStatistics: {
                    adminStaffCount: Number(aisheForm.staffAdminCount || 0),
                    technicalStaffCount: Number(aisheForm.staffTechnicalCount || 0),
                    libraryStaffCount: Number(aisheForm.staffLibraryCount || 0),
                    supportStaffCount: Number(aisheForm.staffSupportCount || 0),
                },
                infrastructureStatistics: {
                    totalClassrooms: Number(aisheForm.totalClassrooms || 0),
                    totalLaboratories: Number(aisheForm.totalLaboratories || 0),
                    totalSeminarHalls: Number(aisheForm.totalSeminarHalls || 0),
                    totalComputers: Number(aisheForm.totalComputers || 0),
                    internetBandwidthMbps: Number(aisheForm.internetBandwidthMbps || 0),
                    libraryBooks: Number(aisheForm.libraryBooks || 0),
                    libraryJournals: Number(aisheForm.libraryJournals || 0),
                    hostelCapacityBoys: Number(aisheForm.hostelCapacityBoys || 0),
                    hostelCapacityGirls: Number(aisheForm.hostelCapacityGirls || 0),
                    sportsFacilitiesCount: Number(aisheForm.sportsFacilitiesCount || 0),
                },
                financialStatistics: {
                    salaryExpenditure: Number(aisheForm.salaryExpenditure || 0),
                    infrastructureExpenditure: Number(aisheForm.infrastructureExpenditure || 0),
                    researchExpenditure: Number(aisheForm.researchExpenditure || 0),
                    libraryExpenditure: Number(aisheForm.libraryExpenditure || 0),
                    studentSupportExpenditure: Number(aisheForm.studentSupportExpenditure || 0),
                    totalRevenueReceipts: Number(aisheForm.totalRevenueReceipts || 0),
                    totalGrantsReceived: Number(aisheForm.totalGrantsReceived || 0),
                },
                studentSupportStatistics: {
                    studentsReceivedScholarship: Number(aisheForm.studentsReceivedScholarship || 0),
                    studentsReceivedFeeReimbursement: Number(aisheForm.studentsReceivedFeeReimbursement || 0),
                    studentsHostelResidents: Number(aisheForm.studentsHostelResidents || 0),
                    studentsTransportFacility: Number(aisheForm.studentsTransportFacility || 0),
                },
                submissionLogs,
                supportingDocuments,
            };

            await requestJson(
                editingAisheCycleId
                    ? `/api/admin/accreditation/aishe/cycles/${editingAisheCycleId}`
                    : "/api/admin/accreditation/aishe/cycles",
                {
                    method: editingAisheCycleId ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                }
            );

            resetAisheForm();
            return editingAisheCycleId
                ? "AISHE cycle updated successfully."
                : "AISHE cycle created successfully.";
        });
    }

    function handleNirfSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAction(async () => {
            const metrics = parsePipeLines(nirfForm.metricsLines).map((parts) => ({
                parameterCode: parts[0],
                metricCode: parts[1],
                metricName: parts[2],
                maxScore: Number(parts[3] ?? 0),
                metricValueNumeric: parts[4] ? Number(parts[4]) : undefined,
                metricValueText: parts[4] && Number.isNaN(Number(parts[4])) ? parts[4] : undefined,
                scoreNormalized: Number(parts[5] ?? 0),
                dataVerified: (parts[6] ?? "").toLowerCase() === "yes",
                scoreObtained: Number(parts[7] ?? parts[5] ?? 0),
                institutionId: nirfForm.institutionId,
                documentIds: (parts[8] ?? "")
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
            }));
            const benchmarks = parsePipeLines(nirfForm.benchmarkLines).map((parts) => ({
                institutionName: parts[0],
                parameterCode: parts[1],
                parameterScore: Number(parts[2] ?? 0),
                overallScore: Number(parts[3] ?? 0),
                rankPosition: parts[4] ? Number(parts[4]) : undefined,
                dataSource: parts[5] || undefined,
            }));
            const departmentContributions = parsePipeLines(nirfForm.departmentContributionLines).map((parts) => ({
                departmentId: parts[0],
                parameterCode: parts[1],
                contributionScore: Number(parts[2] ?? 0),
                remarks: parts[3] || undefined,
            }));
            const trends = parsePipeLines(nirfForm.trendLines).map((parts) => ({
                institutionId: parts[0],
                rankingYear: Number(parts[1] ?? 0),
                frameworkType: parts[2] ?? nirfForm.frameworkType,
                overallRank: parts[3] ? Number(parts[3]) : undefined,
                overallScore: Number(parts[4] ?? 0),
                trendDirection: parts[5] || "Stable",
            }));
            const submissionLogs = parsePipeLines(nirfForm.submissionLogLines).map((parts) => ({
                submittedByUserId: parts[0] || undefined,
                submissionReferenceNo: parts[1] || undefined,
                submissionDate: parts[2] || undefined,
                submissionStatus: parts[3] || "Prepared",
                remarks: parts[4] || undefined,
            }));

            const payload = {
                rankingYear: Number(nirfForm.rankingYear),
                frameworkType: nirfForm.frameworkType,
                status: nirfForm.status,
                institutionId: nirfForm.institutionId,
                dataSubmissionStart: nirfForm.dataSubmissionStart || undefined,
                dataSubmissionEnd: nirfForm.dataSubmissionEnd || undefined,
                resultDeclaredDate: nirfForm.resultDeclaredDate || undefined,
                totalScore: nirfForm.totalScore ? Number(nirfForm.totalScore) : undefined,
                predictedRank: nirfForm.predictedRank ? Number(nirfForm.predictedRank) : undefined,
                confidenceIndex: nirfForm.confidenceIndex ? Number(nirfForm.confidenceIndex) : undefined,
                metrics,
                benchmarks,
                departmentContributions,
                trends,
                submissionLogs,
            };

            await requestJson(
                editingNirfCycleId
                    ? `/api/admin/accreditation/nirf/cycles/${editingNirfCycleId}`
                    : "/api/admin/accreditation/nirf/cycles",
                {
                    method: editingNirfCycleId ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                }
            );

            resetNirfForm();
            return editingNirfCycleId
                ? "NIRF cycle updated successfully."
                : "NIRF cycle created successfully.";
        });
    }

    function handleBodySubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAction(async () => {
            await requestJson(
                editingBodyId
                    ? `/api/admin/accreditation/compliance/bodies/${editingBodyId}`
                    : "/api/admin/accreditation/compliance/bodies",
                {
                    method: editingBodyId ? "PATCH" : "POST",
                    body: JSON.stringify(bodyForm),
                }
            );

            resetBodyForm();
            return editingBodyId
                ? "Regulatory body updated successfully."
                : "Regulatory body created successfully.";
        });
    }

    function handleApprovalSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAction(async () => {
            const payload = {
                ...approvalForm,
                documentId: approvalForm.documentId || undefined,
                approvalStartDate: approvalForm.approvalStartDate || undefined,
                approvalEndDate: approvalForm.approvalEndDate || undefined,
            };

            await requestJson(
                editingApprovalId
                    ? `/api/admin/accreditation/compliance/approvals/${editingApprovalId}`
                    : "/api/admin/accreditation/compliance/approvals",
                {
                    method: editingApprovalId ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                }
            );

            resetApprovalForm();
            return editingApprovalId
                ? "Institutional approval updated successfully."
                : "Institutional approval created successfully.";
        });
    }

    function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAction(async () => {
            const payload = {
                ...reportForm,
                reportYear: Number(reportForm.reportYear),
                submittedToBodyId: reportForm.submittedToBodyId || undefined,
                submissionDate: reportForm.submissionDate || undefined,
                documentId: reportForm.documentId || undefined,
            };

            await requestJson(
                editingReportId
                    ? `/api/admin/accreditation/compliance/reports/${editingReportId}`
                    : "/api/admin/accreditation/compliance/reports",
                {
                    method: editingReportId ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                }
            );

            resetReportForm();
            return editingReportId
                ? "Compliance report updated successfully."
                : "Compliance report created successfully.";
        });
    }

    function handleInspectionSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAction(async () => {
            const inspectionActionItems = parsePipeLines(inspectionForm.actionLines).map((parts) => ({
                actionTitle: parts[0],
                assignedToUserId: parts[1] || undefined,
                targetCompletionDate: parts[2] || undefined,
                completionStatus: parts[3] || "Open",
                actionDescription: parts[4] || undefined,
                completionDocumentId: parts[5] || undefined,
            }));

            const payload = {
                ...inspectionForm,
                visitDate: inspectionForm.visitDate || undefined,
                inspectionReportDocumentId: inspectionForm.inspectionReportDocumentId || undefined,
                complianceDeadline: inspectionForm.complianceDeadline || undefined,
                actionItems: inspectionActionItems,
            };

            await requestJson(
                editingInspectionId
                    ? `/api/admin/accreditation/compliance/inspections/${editingInspectionId}`
                    : "/api/admin/accreditation/compliance/inspections",
                {
                    method: editingInspectionId ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                }
            );

            resetInspectionForm();
            return editingInspectionId
                ? "Inspection visit updated successfully."
                : "Inspection visit created successfully.";
        });
    }

    function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        submitAction(async () => {
            const payload = {
                inspectionId: actionForm.inspectionId,
                actionTitle: actionForm.actionTitle,
                actionDescription: actionForm.actionDescription || undefined,
                assignedToUserId: actionForm.assignedToUserId || undefined,
                targetCompletionDate: actionForm.targetCompletionDate || undefined,
                completionStatus: actionForm.completionStatus,
                completionDocumentId: actionForm.completionDocumentId || undefined,
            };

            await requestJson(
                editingActionId
                    ? `/api/admin/accreditation/compliance/actions/${editingActionId}`
                    : "/api/admin/accreditation/compliance/actions",
                {
                    method: editingActionId ? "PATCH" : "POST",
                    body: JSON.stringify(payload),
                }
            );

            resetActionForm();
            return editingActionId
                ? "Compliance action updated successfully."
                : "Compliance action created successfully.";
        });
    }

    return (
        <div className="space-y-4">
            {message ? <FormMessage type={message.type} message={message.text} /> : null}

            <Tabs defaultValue="sss" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="sss">SSS</TabsTrigger>
                    <TabsTrigger value="aishe">AISHE</TabsTrigger>
                    <TabsTrigger value="nirf">NIRF</TabsTrigger>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>

                <TabsContent value="sss" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Satisfaction Survey</CardTitle>
                            <CardDescription>
                                Configure the survey, question bank, cohort eligibility, and lifecycle state. Existing surveys can now be loaded back into the form for inline correction without leaving the workspace.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {editingSssSurveyId ? (
                                <EditBanner
                                    label={sssSurveys.find((item) => item._id === editingSssSurveyId)?.surveyTitle ?? "Selected SSS survey"}
                                    onReset={resetSssForm}
                                />
                            ) : null}
                            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSssSubmit}>
                                <div className="grid gap-2">
                                    <Label>Institution</Label>
                                    <Select value={sssForm.institutionId} onValueChange={(value) => setSssForm((current) => ({ ...current, institutionId: value }))}>
                                        <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
                                        <SelectContent>
                                            {institutionOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Academic year</Label>
                                    <Select value={sssForm.academicYearId} onValueChange={(value) => setSssForm((current) => ({ ...current, academicYearId: value }))}>
                                        <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                                        <SelectContent>
                                            {academicYearOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Survey title</Label>
                                    <Input value={sssForm.surveyTitle} onChange={(event) => setSssForm((current) => ({ ...current, surveyTitle: event.target.value }))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Status</Label>
                                    <Select value={sssForm.surveyStatus} onValueChange={(value) => setSssForm((current) => ({ ...current, surveyStatus: value }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Draft">Draft</SelectItem>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Eligible cohort hints</Label>
                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                                        {filteredStudentOptions.length} active students match the selected institution. Leave the field below empty to auto-assign the live active cohort.
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Start date</Label>
                                    <Input type="date" value={sssForm.startDate} onChange={(event) => setSssForm((current) => ({ ...current, startDate: event.target.value }))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>End date</Label>
                                    <Input type="date" value={sssForm.endDate} onChange={(event) => setSssForm((current) => ({ ...current, endDate: event.target.value }))} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Eligible student IDs</Label>
                                    <Textarea rows={4} value={sssForm.eligibleStudentIdsText} onChange={(event) => setSssForm((current) => ({ ...current, eligibleStudentIdsText: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">One id per line or comma-separated. Leave blank to auto-populate the active student pool for the selected institution.</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Question lines</Label>
                                    <Textarea rows={7} value={sssForm.questionLines} onChange={(event) => setSssForm((current) => ({ ...current, questionLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `Bucket | Question text | Rating scale max | yes/no mandatory`</p>
                                </div>
                                <div className="flex flex-wrap gap-3 md:col-span-2">
                                    <Button disabled={isPending} type="submit">
                                        {isPending ? <Spinner className="mr-2 size-4" /> : null}
                                        {editingSssSurveyId ? "Update SSS survey" : "Create SSS survey"}
                                    </Button>
                                    <Button disabled={isPending} onClick={resetSssForm} type="button" variant="outline">
                                        Reset form
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Existing surveys</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Survey</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Questions</TableHead>
                                        <TableHead>Eligible</TableHead>
                                        <TableHead>Analytics</TableHead>
                                        <TableHead className="w-[120px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sssSurveys.map((survey) => (
                                        <TableRow key={survey._id}>
                                            <TableCell>
                                                <div className="font-medium">{survey.surveyTitle}</div>
                                                <div className="text-xs text-zinc-500">{formatDate(survey.startDate)} to {formatDate(survey.endDate)}</div>
                                            </TableCell>
                                            <TableCell><Badge variant="secondary">{survey.surveyStatus}</Badge></TableCell>
                                            <TableCell>{survey.questionCount}</TableCell>
                                            <TableCell>{survey.eligibleCount}</TableCell>
                                            <TableCell>{survey.analytics ? `${survey.analytics.overallSatisfactionIndex ?? 0}% / ${survey.analytics.responseRate ?? 0}% response` : "-"}</TableCell>
                                            <TableCell>
                                                <Button
                                                    onClick={() => {
                                                        setEditingSssSurveyId(survey._id);
                                                        setSssForm(mapSssRecordToForm(survey, defaultSssForm));
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="aishe" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>AISHE reporting cycles</CardTitle>
                            <CardDescription>
                                Capture the complete AISHE submission state in one place, including institutional profile, equity and enrollment lines, staffing, infrastructure, finance, student support, logs, and evidence links.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {editingAisheCycleId ? (
                                <EditBanner
                                    label={aisheCycles.find((item) => item._id === editingAisheCycleId)?.surveyYearLabel ?? "Selected AISHE cycle"}
                                    onReset={resetAisheForm}
                                />
                            ) : null}
                            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAisheSubmit}>
                                <div className="grid gap-2">
                                    <Label>Academic year</Label>
                                    <Select value={aisheForm.academicYearId} onValueChange={(value) => setAisheForm((current) => ({ ...current, academicYearId: value }))}>
                                        <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                                        <SelectContent>
                                            {academicYearOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Survey year label</Label>
                                    <Input value={aisheForm.surveyYearLabel} onChange={(event) => setAisheForm((current) => ({ ...current, surveyYearLabel: event.target.value }))} placeholder="AISHE 2026-27" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Institution</Label>
                                    <Select value={aisheForm.institutionId} onValueChange={(value) => setAisheForm((current) => ({ ...current, institutionId: value }))}>
                                        <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
                                        <SelectContent>
                                            {institutionOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Status</Label>
                                    <Select value={aisheForm.submissionStatus} onValueChange={(value) => setAisheForm((current) => ({ ...current, submissionStatus: value }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Preparation">Preparation</SelectItem>
                                            <SelectItem value="Submitted">Submitted</SelectItem>
                                            <SelectItem value="Locked">Locked</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Submission start</Label>
                                    <Input type="date" value={aisheForm.submissionStartDate} onChange={(event) => setAisheForm((current) => ({ ...current, submissionStartDate: event.target.value }))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Submission end</Label>
                                    <Input type="date" value={aisheForm.submissionEndDate} onChange={(event) => setAisheForm((current) => ({ ...current, submissionEndDate: event.target.value }))} />
                                </div>
                                <NumberField label="Establishment year" value={aisheForm.establishmentYear} onChange={(value) => setAisheForm((current) => ({ ...current, establishmentYear: value }))} />
                                <div className="grid gap-2">
                                    <Label>Institution type</Label>
                                    <Select value={aisheForm.institutionType} onValueChange={(value) => setAisheForm((current) => ({ ...current, institutionType: value }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Government">Government</SelectItem>
                                            <SelectItem value="Private">Private</SelectItem>
                                            <SelectItem value="Deemed">Deemed</SelectItem>
                                            <SelectItem value="Aided">Aided</SelectItem>
                                            <SelectItem value="Autonomous">Autonomous</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Location type</Label>
                                    <Select value={aisheForm.locationType} onValueChange={(value) => setAisheForm((current) => ({ ...current, locationType: value }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Urban">Urban</SelectItem>
                                            <SelectItem value="SemiUrban">SemiUrban</SelectItem>
                                            <SelectItem value="Rural">Rural</SelectItem>
                                            <SelectItem value="Metropolitan">Metropolitan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Affiliating university</Label>
                                    <Input value={aisheForm.affiliatingUniversity} onChange={(event) => setAisheForm((current) => ({ ...current, affiliatingUniversity: event.target.value }))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>NAAC grade</Label>
                                    <Input value={aisheForm.naacGrade} onChange={(event) => setAisheForm((current) => ({ ...current, naacGrade: event.target.value }))} />
                                </div>
                                <NumberField label="NIRF rank" value={aisheForm.nirfRank} onChange={(value) => setAisheForm((current) => ({ ...current, nirfRank: value }))} />
                                <NumberField label="Campus area (acres)" value={aisheForm.campusAreaAcres} onChange={(value) => setAisheForm((current) => ({ ...current, campusAreaAcres: value }))} />
                                <NumberField label="Built-up area (sq ft)" value={aisheForm.totalBuiltupAreaSqft} onChange={(value) => setAisheForm((current) => ({ ...current, totalBuiltupAreaSqft: value }))} />

                                <div className="md:col-span-2 grid gap-4 rounded-xl border border-zinc-200 p-4 lg:grid-cols-4">
                                    <div className="lg:col-span-4 text-sm font-semibold text-zinc-900">Staff statistics</div>
                                    <NumberField label="Administrative staff" value={aisheForm.staffAdminCount} onChange={(value) => setAisheForm((current) => ({ ...current, staffAdminCount: value }))} />
                                    <NumberField label="Technical staff" value={aisheForm.staffTechnicalCount} onChange={(value) => setAisheForm((current) => ({ ...current, staffTechnicalCount: value }))} />
                                    <NumberField label="Library staff" value={aisheForm.staffLibraryCount} onChange={(value) => setAisheForm((current) => ({ ...current, staffLibraryCount: value }))} />
                                    <NumberField label="Support staff" value={aisheForm.staffSupportCount} onChange={(value) => setAisheForm((current) => ({ ...current, staffSupportCount: value }))} />
                                </div>

                                <div className="md:col-span-2 grid gap-4 rounded-xl border border-zinc-200 p-4 lg:grid-cols-5">
                                    <div className="lg:col-span-5 text-sm font-semibold text-zinc-900">Infrastructure statistics</div>
                                    <NumberField label="Classrooms" value={aisheForm.totalClassrooms} onChange={(value) => setAisheForm((current) => ({ ...current, totalClassrooms: value }))} />
                                    <NumberField label="Laboratories" value={aisheForm.totalLaboratories} onChange={(value) => setAisheForm((current) => ({ ...current, totalLaboratories: value }))} />
                                    <NumberField label="Seminar halls" value={aisheForm.totalSeminarHalls} onChange={(value) => setAisheForm((current) => ({ ...current, totalSeminarHalls: value }))} />
                                    <NumberField label="Computers" value={aisheForm.totalComputers} onChange={(value) => setAisheForm((current) => ({ ...current, totalComputers: value }))} />
                                    <NumberField label="Bandwidth (Mbps)" value={aisheForm.internetBandwidthMbps} onChange={(value) => setAisheForm((current) => ({ ...current, internetBandwidthMbps: value }))} />
                                    <NumberField label="Library books" value={aisheForm.libraryBooks} onChange={(value) => setAisheForm((current) => ({ ...current, libraryBooks: value }))} />
                                    <NumberField label="Library journals" value={aisheForm.libraryJournals} onChange={(value) => setAisheForm((current) => ({ ...current, libraryJournals: value }))} />
                                    <NumberField label="Boys hostel capacity" value={aisheForm.hostelCapacityBoys} onChange={(value) => setAisheForm((current) => ({ ...current, hostelCapacityBoys: value }))} />
                                    <NumberField label="Girls hostel capacity" value={aisheForm.hostelCapacityGirls} onChange={(value) => setAisheForm((current) => ({ ...current, hostelCapacityGirls: value }))} />
                                    <NumberField label="Sports facilities" value={aisheForm.sportsFacilitiesCount} onChange={(value) => setAisheForm((current) => ({ ...current, sportsFacilitiesCount: value }))} />
                                </div>

                                <div className="md:col-span-2 grid gap-4 rounded-xl border border-zinc-200 p-4 lg:grid-cols-4">
                                    <div className="lg:col-span-4 text-sm font-semibold text-zinc-900">Financial statistics</div>
                                    <NumberField label="Salary expenditure" value={aisheForm.salaryExpenditure} onChange={(value) => setAisheForm((current) => ({ ...current, salaryExpenditure: value }))} />
                                    <NumberField label="Infrastructure expenditure" value={aisheForm.infrastructureExpenditure} onChange={(value) => setAisheForm((current) => ({ ...current, infrastructureExpenditure: value }))} />
                                    <NumberField label="Research expenditure" value={aisheForm.researchExpenditure} onChange={(value) => setAisheForm((current) => ({ ...current, researchExpenditure: value }))} />
                                    <NumberField label="Library expenditure" value={aisheForm.libraryExpenditure} onChange={(value) => setAisheForm((current) => ({ ...current, libraryExpenditure: value }))} />
                                    <NumberField label="Student support expenditure" value={aisheForm.studentSupportExpenditure} onChange={(value) => setAisheForm((current) => ({ ...current, studentSupportExpenditure: value }))} />
                                    <NumberField label="Revenue receipts" value={aisheForm.totalRevenueReceipts} onChange={(value) => setAisheForm((current) => ({ ...current, totalRevenueReceipts: value }))} />
                                    <NumberField label="Grants received" value={aisheForm.totalGrantsReceived} onChange={(value) => setAisheForm((current) => ({ ...current, totalGrantsReceived: value }))} />
                                </div>

                                <div className="md:col-span-2 grid gap-4 rounded-xl border border-zinc-200 p-4 lg:grid-cols-4">
                                    <div className="lg:col-span-4 text-sm font-semibold text-zinc-900">Student support statistics</div>
                                    <NumberField label="Scholarship recipients" value={aisheForm.studentsReceivedScholarship} onChange={(value) => setAisheForm((current) => ({ ...current, studentsReceivedScholarship: value }))} />
                                    <NumberField label="Fee reimbursement" value={aisheForm.studentsReceivedFeeReimbursement} onChange={(value) => setAisheForm((current) => ({ ...current, studentsReceivedFeeReimbursement: value }))} />
                                    <NumberField label="Hostel residents" value={aisheForm.studentsHostelResidents} onChange={(value) => setAisheForm((current) => ({ ...current, studentsHostelResidents: value }))} />
                                    <NumberField label="Transport facility" value={aisheForm.studentsTransportFacility} onChange={(value) => setAisheForm((current) => ({ ...current, studentsTransportFacility: value }))} />
                                </div>

                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Program statistics lines</Label>
                                    <Textarea rows={4} value={aisheForm.programStatisticsLines} onChange={(event) => setAisheForm((current) => ({ ...current, programStatisticsLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `programId | intake | enrolled | passed | placed | higher studies | dropout`</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Student enrollment lines</Label>
                                    <Textarea rows={4} value={aisheForm.studentEnrollmentLines} onChange={(event) => setAisheForm((current) => ({ ...current, studentEnrollmentLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `programId | male | female | transgender | sc | st | obc | general | pwd | foreign`</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Faculty statistics lines</Label>
                                    <Textarea rows={4} value={aisheForm.facultyStatisticsLines} onChange={(event) => setAisheForm((current) => ({ ...current, facultyStatisticsLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `departmentId | total | male | female | phd | pg | ug | professors | associate | assistant | contract`</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Submission logs</Label>
                                    <Textarea rows={4} value={aisheForm.submissionLogLines} onChange={(event) => setAisheForm((current) => ({ ...current, submissionLogLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `submittedByUserId | submissionDate | referenceNo | status | remarks`</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Supporting documents</Label>
                                    <Textarea rows={4} value={aisheForm.supportingDocumentLines} onChange={(event) => setAisheForm((current) => ({ ...current, supportingDocumentLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `documentId | category | uploadedAt`</p>
                                </div>
                                <div className="flex flex-wrap gap-3 md:col-span-2">
                                    <Button disabled={isPending} type="submit">
                                        {isPending ? <Spinner className="mr-2 size-4" /> : null}
                                        {editingAisheCycleId ? "Update AISHE cycle" : "Create AISHE cycle"}
                                    </Button>
                                    <Button disabled={isPending} onClick={resetAisheForm} type="button" variant="outline">
                                        Reset form
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Existing AISHE cycles</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cycle</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Enrollment</TableHead>
                                        <TableHead>Faculty</TableHead>
                                        <TableHead className="w-[120px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {aisheCycles.map((cycle) => (
                                        <TableRow key={cycle._id}>
                                            <TableCell>{cycle.surveyYearLabel}</TableCell>
                                            <TableCell><Badge variant="secondary">{cycle.submissionStatus}</Badge></TableCell>
                                            <TableCell>{cycle.totalEnrollment}</TableCell>
                                            <TableCell>{cycle.totalFaculty}</TableCell>
                                            <TableCell>
                                                <Button
                                                    onClick={() => {
                                                        setEditingAisheCycleId(cycle._id);
                                                        setAisheForm(mapAisheRecordToForm(cycle, defaultAisheForm));
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="nirf" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>NIRF ranking engine</CardTitle>
                            <CardDescription>
                                Manage the full ranking submission payload inline, including metric evidence, benchmarks, department contributions, history, and submission lifecycle metadata.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {editingNirfCycleId ? (
                                <EditBanner
                                    label={`${nirfCycles.find((item) => item._id === editingNirfCycleId)?.rankingYear ?? ""} ${nirfCycles.find((item) => item._id === editingNirfCycleId)?.frameworkType ?? ""}`.trim() || "Selected NIRF cycle"}
                                    onReset={resetNirfForm}
                                />
                            ) : null}
                            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleNirfSubmit}>
                                <div className="grid gap-2">
                                    <Label>Ranking year</Label>
                                    <Input value={nirfForm.rankingYear} onChange={(event) => setNirfForm((current) => ({ ...current, rankingYear: event.target.value }))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Framework</Label>
                                    <Select value={nirfForm.frameworkType} onValueChange={(value) => setNirfForm((current) => ({ ...current, frameworkType: value }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Overall">Overall</SelectItem>
                                            <SelectItem value="Engineering">Engineering</SelectItem>
                                            <SelectItem value="University">University</SelectItem>
                                            <SelectItem value="Management">Management</SelectItem>
                                            <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                                            <SelectItem value="College">College</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Institution</Label>
                                    <Select value={nirfForm.institutionId} onValueChange={(value) => setNirfForm((current) => ({ ...current, institutionId: value }))}>
                                        <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
                                        <SelectContent>
                                            {institutionOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Status</Label>
                                    <Select value={nirfForm.status} onValueChange={(value) => setNirfForm((current) => ({ ...current, status: value }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Preparation">Preparation</SelectItem>
                                            <SelectItem value="Submitted">Submitted</SelectItem>
                                            <SelectItem value="ResultPublished">ResultPublished</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Submission start</Label>
                                    <Input type="date" value={nirfForm.dataSubmissionStart} onChange={(event) => setNirfForm((current) => ({ ...current, dataSubmissionStart: event.target.value }))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Submission end</Label>
                                    <Input type="date" value={nirfForm.dataSubmissionEnd} onChange={(event) => setNirfForm((current) => ({ ...current, dataSubmissionEnd: event.target.value }))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Result declared date</Label>
                                    <Input type="date" value={nirfForm.resultDeclaredDate} onChange={(event) => setNirfForm((current) => ({ ...current, resultDeclaredDate: event.target.value }))} />
                                </div>
                                <NumberField label="Composite score" value={nirfForm.totalScore} onChange={(value) => setNirfForm((current) => ({ ...current, totalScore: value }))} />
                                <NumberField label="Predicted rank" value={nirfForm.predictedRank} onChange={(value) => setNirfForm((current) => ({ ...current, predictedRank: value }))} />
                                <NumberField label="Confidence index" value={nirfForm.confidenceIndex} onChange={(value) => setNirfForm((current) => ({ ...current, confidenceIndex: value }))} />
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Metric lines</Label>
                                    <Textarea rows={8} value={nirfForm.metricsLines} onChange={(event) => setNirfForm((current) => ({ ...current, metricsLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `parameterCode | metricCode | metricName | maxScore | value/text | normalizedScore | yes/no verified | obtainedScore | comma-separated documentIds`</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Benchmark lines</Label>
                                    <Textarea rows={4} value={nirfForm.benchmarkLines} onChange={(event) => setNirfForm((current) => ({ ...current, benchmarkLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `institutionName | parameterCode | parameterScore | overallScore | rankPosition | dataSource`</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Department contribution lines</Label>
                                    <Textarea rows={4} value={nirfForm.departmentContributionLines} onChange={(event) => setNirfForm((current) => ({ ...current, departmentContributionLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `departmentId | parameterCode | contributionScore | remarks`</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Trend lines</Label>
                                    <Textarea rows={4} value={nirfForm.trendLines} onChange={(event) => setNirfForm((current) => ({ ...current, trendLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `institutionId | year | framework | overallRank | overallScore | trendDirection`</p>
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label>Submission logs</Label>
                                    <Textarea rows={4} value={nirfForm.submissionLogLines} onChange={(event) => setNirfForm((current) => ({ ...current, submissionLogLines: event.target.value }))} />
                                    <p className="text-xs text-zinc-500">Format: `submittedByUserId | referenceNo | submissionDate | status | remarks`</p>
                                </div>
                                <div className="flex flex-wrap gap-3 md:col-span-2">
                                    <Button disabled={isPending} type="submit">
                                        {isPending ? <Spinner className="mr-2 size-4" /> : null}
                                        {editingNirfCycleId ? "Update NIRF cycle" : "Create NIRF cycle"}
                                    </Button>
                                    <Button disabled={isPending} onClick={resetNirfForm} type="button" variant="outline">
                                        Reset form
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Existing NIRF cycles</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Cycle</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Metrics</TableHead>
                                        <TableHead>Composite</TableHead>
                                        <TableHead className="w-[120px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {nirfCycles.map((cycle) => (
                                        <TableRow key={cycle._id}>
                                            <TableCell>{cycle.rankingYear} · {cycle.frameworkType}</TableCell>
                                            <TableCell><Badge variant="secondary">{cycle.status}</Badge></TableCell>
                                            <TableCell>{cycle.verifiedMetricCount}/{cycle.metricCount}</TableCell>
                                            <TableCell>{cycle.compositeScore ? `${cycle.compositeScore.totalScore ?? 0} / rank ${cycle.compositeScore.predictedRank ?? "-"}` : "-"}</TableCell>
                                            <TableCell>
                                                <Button
                                                    onClick={() => {
                                                        setEditingNirfCycleId(cycle._id);
                                                        setNirfForm(mapNirfRecordToForm(cycle, defaultNirfForm));
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="compliance" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compliance and regulatory tracking</CardTitle>
                            <CardDescription>
                                Create or inline-edit regulatory bodies, approvals, statutory reports, inspection visits, and individual closure actions from one governed admin workspace.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 xl:grid-cols-2">
                            <form className="space-y-4 rounded-xl border border-zinc-200 p-4" onSubmit={handleBodySubmit}>
                                {editingBodyId ? <EditBanner label={regulatoryBodies.find((item) => item._id === editingBodyId)?.bodyName ?? "Selected regulatory body"} onReset={resetBodyForm} /> : null}
                                <div className="font-semibold text-zinc-900">Regulatory body</div>
                                <div className="grid gap-2"><Label>Name</Label><Input value={bodyForm.bodyName} onChange={(event) => setBodyForm((current) => ({ ...current, bodyName: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Jurisdiction</Label><Input value={bodyForm.jurisdiction} onChange={(event) => setBodyForm((current) => ({ ...current, jurisdiction: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Website</Label><Input value={bodyForm.websiteUrl} onChange={(event) => setBodyForm((current) => ({ ...current, websiteUrl: event.target.value }))} /></div>
                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={isPending} type="submit" variant="outline">{isPending ? <Spinner className="mr-2 size-4" /> : null}{editingBodyId ? "Update body" : "Create body"}</Button>
                                    <Button disabled={isPending} onClick={resetBodyForm} type="button" variant="ghost">Reset</Button>
                                </div>
                            </form>

                            <form className="space-y-4 rounded-xl border border-zinc-200 p-4" onSubmit={handleApprovalSubmit}>
                                {editingApprovalId ? <EditBanner label={approvals.find((item) => item._id === editingApprovalId)?.approvalType ?? "Selected approval"} onReset={resetApprovalForm} /> : null}
                                <div className="font-semibold text-zinc-900">Institutional approval</div>
                                <div className="grid gap-2"><Label>Institution</Label><Select value={approvalForm.institutionId} onValueChange={(value) => setApprovalForm((current) => ({ ...current, institutionId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{institutionOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Regulatory body</Label><Select value={approvalForm.regulatoryBodyId} onValueChange={(value) => setApprovalForm((current) => ({ ...current, regulatoryBodyId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bodyOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Approval type</Label><Input value={approvalForm.approvalType} onChange={(event) => setApprovalForm((current) => ({ ...current, approvalType: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Reference no.</Label><Input value={approvalForm.approvalReferenceNo} onChange={(event) => setApprovalForm((current) => ({ ...current, approvalReferenceNo: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Approval start</Label><Input type="date" value={approvalForm.approvalStartDate} onChange={(event) => setApprovalForm((current) => ({ ...current, approvalStartDate: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Approval end</Label><Input type="date" value={approvalForm.approvalEndDate} onChange={(event) => setApprovalForm((current) => ({ ...current, approvalEndDate: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Status</Label><Select value={approvalForm.status} onValueChange={(value) => setApprovalForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Expired">Expired</SelectItem><SelectItem value="UnderRenewal">UnderRenewal</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Evidence document</Label><Select value={approvalForm.documentId || "__none__"} onValueChange={(value) => setApprovalForm((current) => ({ ...current, documentId: value === "__none__" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">No document</SelectItem>{documentOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={isPending} type="submit" variant="outline">{isPending ? <Spinner className="mr-2 size-4" /> : null}{editingApprovalId ? "Update approval" : "Create approval"}</Button>
                                    <Button disabled={isPending} onClick={resetApprovalForm} type="button" variant="ghost">Reset</Button>
                                </div>
                            </form>

                            <form className="space-y-4 rounded-xl border border-zinc-200 p-4" onSubmit={handleReportSubmit}>
                                {editingReportId ? <EditBanner label={reports.find((item) => item._id === editingReportId)?.reportTitle ?? "Selected report"} onReset={resetReportForm} /> : null}
                                <div className="font-semibold text-zinc-900">Statutory report</div>
                                <div className="grid gap-2"><Label>Institution</Label><Select value={reportForm.institutionId} onValueChange={(value) => setReportForm((current) => ({ ...current, institutionId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{institutionOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Submitted to body</Label><Select value={reportForm.submittedToBodyId || "__none__"} onValueChange={(value) => setReportForm((current) => ({ ...current, submittedToBodyId: value === "__none__" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Not linked</SelectItem>{bodyOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Report title</Label><Input value={reportForm.reportTitle} onChange={(event) => setReportForm((current) => ({ ...current, reportTitle: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Report year</Label><Input value={reportForm.reportYear} onChange={(event) => setReportForm((current) => ({ ...current, reportYear: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Submission date</Label><Input type="date" value={reportForm.submissionDate} onChange={(event) => setReportForm((current) => ({ ...current, submissionDate: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Status</Label><Select value={reportForm.complianceStatus} onValueChange={(value) => setReportForm((current) => ({ ...current, complianceStatus: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Submitted">Submitted</SelectItem><SelectItem value="Accepted">Accepted</SelectItem><SelectItem value="ActionRequired">ActionRequired</SelectItem></SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Evidence document</Label><Select value={reportForm.documentId || "__none__"} onValueChange={(value) => setReportForm((current) => ({ ...current, documentId: value === "__none__" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">No document</SelectItem>{documentOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={isPending} type="submit" variant="outline">{isPending ? <Spinner className="mr-2 size-4" /> : null}{editingReportId ? "Update report" : "Create report"}</Button>
                                    <Button disabled={isPending} onClick={resetReportForm} type="button" variant="ghost">Reset</Button>
                                </div>
                            </form>

                            <form className="space-y-4 rounded-xl border border-zinc-200 p-4" onSubmit={handleInspectionSubmit}>
                                {editingInspectionId ? <EditBanner label={inspections.find((item) => item._id === editingInspectionId)?.inspectionType ?? "Selected inspection"} onReset={resetInspectionForm} /> : null}
                                <div className="font-semibold text-zinc-900">Inspection visit</div>
                                <div className="grid gap-2"><Label>Institution</Label><Select value={inspectionForm.institutionId} onValueChange={(value) => setInspectionForm((current) => ({ ...current, institutionId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{institutionOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Regulatory body</Label><Select value={inspectionForm.regulatoryBodyId} onValueChange={(value) => setInspectionForm((current) => ({ ...current, regulatoryBodyId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bodyOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Inspection type</Label><Input value={inspectionForm.inspectionType} onChange={(event) => setInspectionForm((current) => ({ ...current, inspectionType: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Visit date</Label><Input type="date" value={inspectionForm.visitDate} onChange={(event) => setInspectionForm((current) => ({ ...current, visitDate: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Compliance deadline</Label><Input type="date" value={inspectionForm.complianceDeadline} onChange={(event) => setInspectionForm((current) => ({ ...current, complianceDeadline: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Status</Label><Select value={inspectionForm.status} onValueChange={(value) => setInspectionForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Scheduled">Scheduled</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="ActionRequired">ActionRequired</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Inspection report document</Label><Select value={inspectionForm.inspectionReportDocumentId || "__none__"} onValueChange={(value) => setInspectionForm((current) => ({ ...current, inspectionReportDocumentId: value === "__none__" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">No document</SelectItem>{documentOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Action lines</Label><Textarea rows={5} value={inspectionForm.actionLines} onChange={(event) => setInspectionForm((current) => ({ ...current, actionLines: event.target.value }))} /><p className="text-xs text-zinc-500">Format: `title | assignedToUserId | targetDate | status | description | completionDocumentId`</p></div>
                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={isPending} type="submit" variant="outline">{isPending ? <Spinner className="mr-2 size-4" /> : null}{editingInspectionId ? "Update inspection" : "Create inspection"}</Button>
                                    <Button disabled={isPending} onClick={resetInspectionForm} type="button" variant="ghost">Reset</Button>
                                </div>
                            </form>

                            <form className="space-y-4 rounded-xl border border-zinc-200 p-4" onSubmit={handleActionSubmit}>
                                {editingActionId ? <EditBanner label={actionItems.find((item) => item._id === editingActionId)?.actionTitle ?? "Selected action"} onReset={resetActionForm} /> : null}
                                <div className="font-semibold text-zinc-900">Direct action register editor</div>
                                <div className="grid gap-2"><Label>Inspection</Label><Select value={actionForm.inspectionId} onValueChange={(value) => setActionForm((current) => ({ ...current, inspectionId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{inspectionOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Action title</Label><Input value={actionForm.actionTitle} onChange={(event) => setActionForm((current) => ({ ...current, actionTitle: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Assigned to</Label><Select value={actionForm.assignedToUserId || "__none__"} onValueChange={(value) => setActionForm((current) => ({ ...current, assignedToUserId: value === "__none__" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Unassigned</SelectItem>{userOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Target completion date</Label><Input type="date" value={actionForm.targetCompletionDate} onChange={(event) => setActionForm((current) => ({ ...current, targetCompletionDate: event.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Status</Label><Select value={actionForm.completionStatus} onValueChange={(value) => setActionForm((current) => ({ ...current, completionStatus: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="InProgress">InProgress</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Escalated">Escalated</SelectItem></SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Completion document</Label><Select value={actionForm.completionDocumentId || "__none__"} onValueChange={(value) => setActionForm((current) => ({ ...current, completionDocumentId: value === "__none__" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">No document</SelectItem>{documentOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
                                <div className="grid gap-2"><Label>Description</Label><Textarea rows={4} value={actionForm.actionDescription} onChange={(event) => setActionForm((current) => ({ ...current, actionDescription: event.target.value }))} /></div>
                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={isPending} type="submit" variant="outline">{isPending ? <Spinner className="mr-2 size-4" /> : null}{editingActionId ? "Update action" : "Create action"}</Button>
                                    <Button disabled={isPending} onClick={resetActionForm} type="button" variant="ghost">Reset</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Card>
                            <CardHeader><CardTitle>Regulatory bodies</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Body</TableHead>
                                            <TableHead>Jurisdiction</TableHead>
                                            <TableHead>Website</TableHead>
                                            <TableHead className="w-[120px]">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {regulatoryBodies.map((item) => (
                                            <TableRow key={item._id}>
                                                <TableCell>{item.bodyName}</TableCell>
                                                <TableCell>{item.jurisdiction ?? "-"}</TableCell>
                                                <TableCell>{item.websiteUrl ?? "-"}</TableCell>
                                                <TableCell><Button onClick={() => { setEditingBodyId(item._id); setBodyForm(mapBodyRecordToForm(item)); }} size="sm" type="button" variant="outline">Edit</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Approvals</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead>Valid till</TableHead>
                                            <TableHead className="w-[120px]">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {approvals.map((item) => (
                                            <TableRow key={item._id}>
                                                <TableCell>{item.approvalType}</TableCell>
                                                <TableCell><Badge variant="secondary">{item.status}</Badge></TableCell>
                                                <TableCell>{item.approvalReferenceNo ?? "-"}</TableCell>
                                                <TableCell>{formatDate(item.approvalEndDate)}</TableCell>
                                                <TableCell><Button onClick={() => { setEditingApprovalId(item._id); setApprovalForm(mapApprovalRecordToForm(item, defaultApprovalForm)); }} size="sm" type="button" variant="outline">Edit</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Compliance reports</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Report</TableHead>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-[120px]">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reports.map((item) => (
                                            <TableRow key={item._id}>
                                                <TableCell>{item.reportTitle}</TableCell>
                                                <TableCell>{item.reportYear}</TableCell>
                                                <TableCell><Badge variant="secondary">{item.complianceStatus}</Badge></TableCell>
                                                <TableCell><Button onClick={() => { setEditingReportId(item._id); setReportForm(mapReportRecordToForm(item, defaultReportForm)); }} size="sm" type="button" variant="outline">Edit</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Inspection register</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Inspection</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                            <TableHead className="w-[120px]">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inspections.map((item) => (
                                            <TableRow key={item._id}>
                                                <TableCell>{item.inspectionType}</TableCell>
                                                <TableCell><Badge variant="secondary">{item.status}</Badge></TableCell>
                                                <TableCell>{formatDate(item.visitDate)}</TableCell>
                                                <TableCell>{item.actionItems?.length ?? 0}</TableCell>
                                                <TableCell><Button onClick={() => { setEditingInspectionId(item._id); setInspectionForm(mapInspectionRecordToForm(item, defaultInspectionForm)); }} size="sm" type="button" variant="outline">Edit</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Action register</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead className="w-[120px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {actionItems.map((item) => (
                                        <TableRow key={item._id}>
                                            <TableCell>{item.actionTitle}</TableCell>
                                            <TableCell><Badge variant="secondary">{item.completionStatus}</Badge></TableCell>
                                            <TableCell>{formatDate(item.targetCompletionDate)}</TableCell>
                                            <TableCell><Button onClick={() => { setEditingActionId(item._id); setActionForm(mapActionRecordToForm(item, defaultActionForm)); }} size="sm" type="button" variant="outline">Edit</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Card>
                <CardHeader>
                    <CardTitle>Reference helpers</CardTitle>
                    <CardDescription>
                        Use these ids while editing line-based accreditation data for programs, departments, students, users, inspections, and evidence mappings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 xl:grid-cols-5">
                    <ReferenceList title="Programs" options={programOptions} />
                    <ReferenceList title="Departments" options={departmentOptions} />
                    <ReferenceList title="Students" options={studentOptions} />
                    <ReferenceList title="Users" options={userOptions} />
                    <ReferenceList title="Documents" options={documentOptions} />
                </CardContent>
            </Card>
        </div>
    );
}

function ReferenceList({
    title,
    options,
}: {
    title: string;
    options: Option[];
}) {
    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold text-zinc-900">{title}</p>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-3">
                {options.map((option) => (
                    <div key={option.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-2">
                        <div className="text-xs font-medium text-zinc-900">{option.label}</div>
                        <div className="mt-1 break-all font-mono text-[11px] text-zinc-500">{option.id}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

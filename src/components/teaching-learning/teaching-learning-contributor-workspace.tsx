"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AssignmentRecord = {
    _id: string;
    planId: string;
    planTitle: string;
    academicYearLabel: string;
    programName: string;
    courseTitle: string;
    courseCode?: string;
    semesterNumber?: number;
    sectionName?: string;
    deliveryType: string;
    plannedSessions: number;
    plannedContactHours: number;
    classStrength?: number;
    planSummary?: string;
    planStatus: string;
    sourceTeachingLoadId?: string;
    teachingLoadSnapshot?: {
        subjectCode?: string;
        lectureHours: number;
        tutorialHours: number;
        practicalHours: number;
        totalHours: number;
        innovativePedagogy?: string;
    } | null;
    teachingSummarySnapshot?: {
        classesTaken: number;
        coursePreparationHours: number;
        coursesTaught: string[];
        mentoringCount: number;
        labSupervisionCount: number;
        feedbackSummary?: string;
    } | null;
    assigneeName: string;
    assigneeEmail: string;
    assigneeRole: string;
    status: string;
    dueDate?: string;
    notes?: string;
    pedagogicalApproach?: string;
    learnerCentricPractices?: string;
    digitalResources?: string;
    attendanceStrategy?: string;
    feedbackAnalysis?: string;
    attainmentSummary?: string;
    actionTaken?: string;
    innovationHighlights?: string;
    supportingLinks: string[];
    lessonPlanDocumentId?: string;
    questionPaperDocumentId?: string;
    resultAnalysisDocumentId?: string;
    lessonPlanDocument?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
    questionPaperDocument?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
    resultAnalysisDocument?: {
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    };
    documentIds: string[];
    documents: Array<{
        id: string;
        fileName?: string;
        fileUrl?: string;
        verificationStatus?: string;
    }>;
    contributorRemarks?: string;
    reviewRemarks?: string;
    sessions: Array<{
        id: string;
        sessionNumber: number;
        moduleTitle?: string;
        topic: string;
        plannedDate?: string;
        deliveredDate?: string;
        teachingMethod: string;
        ictTool?: string;
        attendancePercent?: number;
        learningOutcome?: string;
        reflectionNotes?: string;
        isDelivered: boolean;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
    }>;
    assessments: Array<{
        id: string;
        title: string;
        assessmentType: string;
        weightage: number;
        scheduledDate?: string;
        evaluatedDate?: string;
        coMappingCodes: string[];
        maxMarks?: number;
        averageMarks?: number;
        attainmentPercentage?: number;
        remarks?: string;
        isCompleted: boolean;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
    }>;
    supports: Array<{
        id: string;
        title: string;
        supportType: string;
        targetGroup?: string;
        interventionDate?: string;
        participantCount?: number;
        outcomeSummary?: string;
        followUpAction?: string;
        documentId?: string;
        document?: {
            id: string;
            fileName?: string;
            fileUrl?: string;
            verificationStatus?: string;
        };
    }>;
    reviewHistory: Array<{
        reviewerName?: string;
        reviewerRole?: string;
        stage: string;
        decision: string;
        remarks?: string;
        reviewedAt?: string;
    }>;
    statusLogs: Array<{
        status: string;
        actorName?: string;
        actorRole?: string;
        remarks?: string;
        changedAt?: string;
    }>;
    valueSummary: string;
    submittedAt?: string;
    reviewedAt?: string;
    approvedAt?: string;
    updatedAt?: string;
    currentStageLabel: string;
};

type SessionRow = {
    id?: string;
    sessionNumber: string;
    moduleTitle: string;
    topic: string;
    plannedDate: string;
    deliveredDate: string;
    teachingMethod: string;
    ictTool: string;
    attendancePercent: string;
    learningOutcome: string;
    reflectionNotes: string;
    isDelivered: boolean;
    documentId: string;
};

type AssessmentRow = {
    id?: string;
    title: string;
    assessmentType: string;
    weightage: string;
    scheduledDate: string;
    evaluatedDate: string;
    coMappingCodes: string;
    maxMarks: string;
    averageMarks: string;
    attainmentPercentage: string;
    remarks: string;
    isCompleted: boolean;
    documentId: string;
};

type SupportRow = {
    id?: string;
    title: string;
    supportType: string;
    targetGroup: string;
    interventionDate: string;
    participantCount: string;
    outcomeSummary: string;
    followUpAction: string;
    documentId: string;
};

type FormState = {
    pedagogicalApproach: string;
    learnerCentricPractices: string;
    digitalResources: string;
    attendanceStrategy: string;
    feedbackAnalysis: string;
    attainmentSummary: string;
    actionTaken: string;
    innovationHighlights: string;
    supportingLinks: string;
    lessonPlanDocumentId: string;
    questionPaperDocumentId: string;
    resultAnalysisDocumentId: string;
    documentIds: string;
    contributorRemarks: string;
    sessions: SessionRow[];
    assessments: AssessmentRow[];
    supports: SupportRow[];
};

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function statusBadge(status: string) {
    if (status === "Approved") {
        return <Badge className="bg-emerald-100 text-emerald-700">{status}</Badge>;
    }

    if (status === "Rejected") {
        return <Badge className="bg-rose-100 text-rose-700">{status}</Badge>;
    }

    if (["Submitted", "Teaching Learning Review", "Under Review", "Committee Review"].includes(status)) {
        return <Badge className="bg-amber-100 text-amber-700">{status}</Badge>;
    }

    return <Badge variant="secondary">{status}</Badge>;
}

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

function emptySessionRow(nextNumber = 1): SessionRow {
    return {
        sessionNumber: String(nextNumber),
        moduleTitle: "",
        topic: "",
        plannedDate: "",
        deliveredDate: "",
        teachingMethod: "Lecture",
        ictTool: "",
        attendancePercent: "",
        learningOutcome: "",
        reflectionNotes: "",
        isDelivered: false,
        documentId: "",
    };
}

function emptyAssessmentRow(): AssessmentRow {
    return {
        title: "",
        assessmentType: "Assignment",
        weightage: "0",
        scheduledDate: "",
        evaluatedDate: "",
        coMappingCodes: "",
        maxMarks: "",
        averageMarks: "",
        attainmentPercentage: "",
        remarks: "",
        isCompleted: false,
        documentId: "",
    };
}

function emptySupportRow(): SupportRow {
    return {
        title: "",
        supportType: "Remedial",
        targetGroup: "",
        interventionDate: "",
        participantCount: "",
        outcomeSummary: "",
        followUpAction: "",
        documentId: "",
    };
}

function splitLines(value: string) {
    return value
        .split(/\n+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function splitCommaValues(value: string) {
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function buildInitialForm(record: AssignmentRecord): FormState {
    return {
        pedagogicalApproach: record.pedagogicalApproach ?? "",
        learnerCentricPractices: record.learnerCentricPractices ?? "",
        digitalResources: record.digitalResources ?? "",
        attendanceStrategy: record.attendanceStrategy ?? "",
        feedbackAnalysis: record.feedbackAnalysis ?? "",
        attainmentSummary: record.attainmentSummary ?? "",
        actionTaken: record.actionTaken ?? "",
        innovationHighlights: record.innovationHighlights ?? "",
        supportingLinks: (record.supportingLinks ?? []).join("\n"),
        lessonPlanDocumentId: record.lessonPlanDocumentId ?? "",
        questionPaperDocumentId: record.questionPaperDocumentId ?? "",
        resultAnalysisDocumentId: record.resultAnalysisDocumentId ?? "",
        documentIds: (record.documentIds ?? []).join(", "),
        contributorRemarks: record.contributorRemarks ?? "",
        sessions: record.sessions.length
            ? record.sessions.map((session) => ({
                  id: session.id,
                  sessionNumber: String(session.sessionNumber),
                  moduleTitle: session.moduleTitle ?? "",
                  topic: session.topic ?? "",
                  plannedDate: session.plannedDate ? session.plannedDate.slice(0, 10) : "",
                  deliveredDate: session.deliveredDate ? session.deliveredDate.slice(0, 10) : "",
                  teachingMethod: session.teachingMethod ?? "Lecture",
                  ictTool: session.ictTool ?? "",
                  attendancePercent:
                      session.attendancePercent !== undefined
                          ? String(session.attendancePercent)
                          : "",
                  learningOutcome: session.learningOutcome ?? "",
                  reflectionNotes: session.reflectionNotes ?? "",
                  isDelivered: Boolean(session.isDelivered),
                  documentId: session.documentId ?? "",
              }))
            : [emptySessionRow(1)],
        assessments: record.assessments.length
            ? record.assessments.map((assessment) => ({
                  id: assessment.id,
                  title: assessment.title ?? "",
                  assessmentType: assessment.assessmentType ?? "Assignment",
                  weightage: String(assessment.weightage ?? 0),
                  scheduledDate: assessment.scheduledDate
                      ? assessment.scheduledDate.slice(0, 10)
                      : "",
                  evaluatedDate: assessment.evaluatedDate
                      ? assessment.evaluatedDate.slice(0, 10)
                      : "",
                  coMappingCodes: (assessment.coMappingCodes ?? []).join(", "),
                  maxMarks:
                      assessment.maxMarks !== undefined ? String(assessment.maxMarks) : "",
                  averageMarks:
                      assessment.averageMarks !== undefined
                          ? String(assessment.averageMarks)
                          : "",
                  attainmentPercentage:
                      assessment.attainmentPercentage !== undefined
                          ? String(assessment.attainmentPercentage)
                          : "",
                  remarks: assessment.remarks ?? "",
                  isCompleted: Boolean(assessment.isCompleted),
                  documentId: assessment.documentId ?? "",
              }))
            : [emptyAssessmentRow()],
        supports: record.supports.length
            ? record.supports.map((support) => ({
                  id: support.id,
                  title: support.title ?? "",
                  supportType: support.supportType ?? "Remedial",
                  targetGroup: support.targetGroup ?? "",
                  interventionDate: support.interventionDate
                      ? support.interventionDate.slice(0, 10)
                      : "",
                  participantCount:
                      support.participantCount !== undefined
                          ? String(support.participantCount)
                          : "",
                  outcomeSummary: support.outcomeSummary ?? "",
                  followUpAction: support.followUpAction ?? "",
                  documentId: support.documentId ?? "",
              }))
            : [emptySupportRow()],
    };
}

export function TeachingLearningContributorWorkspace({
    assignments,
    actorLabel,
}: {
    assignments: AssignmentRecord[];
    actorLabel: string;
}) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [selectedId, setSelectedId] = useState(assignments[0]?._id ?? "");
    const [form, setForm] = useState<FormState>(
        assignments[0] ? buildInitialForm(assignments[0]) : buildInitialForm({
            _id: "",
            planId: "",
            planTitle: "",
            academicYearLabel: "",
            programName: "",
            courseTitle: "",
            deliveryType: "Theory",
            plannedSessions: 0,
            plannedContactHours: 0,
            planStatus: "Draft",
            assigneeName: "",
            assigneeEmail: "",
            assigneeRole: "",
            status: "Draft",
            supportingLinks: [],
            lessonPlanDocumentId: "",
            questionPaperDocumentId: "",
            resultAnalysisDocumentId: "",
            documentIds: [],
            documents: [],
            sessions: [],
            assessments: [],
            supports: [],
            reviewHistory: [],
            statusLogs: [],
            valueSummary: "",
            currentStageLabel: "Draft",
        })
    );
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const filteredAssignments = assignments.filter((assignment) => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [
            assignment.planTitle,
            assignment.courseCode,
            assignment.courseTitle,
            assignment.status,
            assignment.currentStageLabel,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
    });

    useEffect(() => {
        if (!filteredAssignments.length) {
            setSelectedId("");
            return;
        }

        if (!filteredAssignments.some((item) => item._id === selectedId)) {
            setSelectedId(filteredAssignments[0]._id);
        }
    }, [filteredAssignments, selectedId]);

    const selectedAssignment =
        filteredAssignments.find((assignment) => assignment._id === selectedId) ?? null;

    useEffect(() => {
        if (!selectedAssignment) {
            return;
        }

        setForm(buildInitialForm(selectedAssignment));
    }, [selectedAssignment]);

    function buildDraftPayload() {
        return {
            pedagogicalApproach: form.pedagogicalApproach.trim(),
            learnerCentricPractices: form.learnerCentricPractices.trim(),
            digitalResources: form.digitalResources.trim(),
            attendanceStrategy: form.attendanceStrategy.trim(),
            feedbackAnalysis: form.feedbackAnalysis.trim(),
            attainmentSummary: form.attainmentSummary.trim(),
            actionTaken: form.actionTaken.trim(),
            innovationHighlights: form.innovationHighlights.trim(),
            supportingLinks: splitLines(form.supportingLinks),
            lessonPlanDocumentId: form.lessonPlanDocumentId.trim() || undefined,
            questionPaperDocumentId: form.questionPaperDocumentId.trim() || undefined,
            resultAnalysisDocumentId: form.resultAnalysisDocumentId.trim() || undefined,
            documentIds: splitCommaValues(form.documentIds),
            contributorRemarks: form.contributorRemarks.trim(),
            sessions: form.sessions
                .filter((row) => row.topic.trim())
                .map((row, index) => ({
                    _id: row.id,
                    sessionNumber: Number(row.sessionNumber || index + 1),
                    moduleTitle: row.moduleTitle.trim(),
                    topic: row.topic.trim(),
                    plannedDate: row.plannedDate || undefined,
                    deliveredDate: row.deliveredDate || undefined,
                    teachingMethod: row.teachingMethod,
                    ictTool: row.ictTool.trim(),
                    attendancePercent:
                        row.attendancePercent.trim() === ""
                            ? undefined
                            : Number(row.attendancePercent),
                    learningOutcome: row.learningOutcome.trim(),
                    reflectionNotes: row.reflectionNotes.trim(),
                    documentId: row.documentId.trim() || undefined,
                    isDelivered: row.isDelivered,
                    displayOrder: index + 1,
                })),
            assessments: form.assessments
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    title: row.title.trim(),
                    assessmentType: row.assessmentType,
                    weightage: Number(row.weightage || 0),
                    scheduledDate: row.scheduledDate || undefined,
                    evaluatedDate: row.evaluatedDate || undefined,
                    coMappingCodes: splitCommaValues(row.coMappingCodes),
                    maxMarks: row.maxMarks.trim() === "" ? undefined : Number(row.maxMarks),
                    averageMarks:
                        row.averageMarks.trim() === ""
                            ? undefined
                            : Number(row.averageMarks),
                    attainmentPercentage:
                        row.attainmentPercentage.trim() === ""
                            ? undefined
                            : Number(row.attainmentPercentage),
                    remarks: row.remarks.trim(),
                    documentId: row.documentId.trim() || undefined,
                    isCompleted: row.isCompleted,
                    displayOrder: index + 1,
                })),
            supports: form.supports
                .filter((row) => row.title.trim())
                .map((row, index) => ({
                    _id: row.id,
                    title: row.title.trim(),
                    supportType: row.supportType,
                    targetGroup: row.targetGroup.trim(),
                    interventionDate: row.interventionDate || undefined,
                    participantCount:
                        row.participantCount.trim() === ""
                            ? undefined
                            : Number(row.participantCount),
                    outcomeSummary: row.outcomeSummary.trim(),
                    followUpAction: row.followUpAction.trim(),
                    documentId: row.documentId.trim() || undefined,
                    displayOrder: index + 1,
                })),
        };
    }

    function saveDraft() {
        if (!selectedAssignment) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                const data = await persistDraft(selectedAssignment._id);

                setMessage({
                    type: "success",
                    text: data.message ?? "Teaching learning draft saved successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to save the teaching learning draft.",
                });
            }
        });
    }

    function submitAssignment() {
        if (!selectedAssignment) {
            return;
        }

        setMessage(null);

        startTransition(async () => {
            try {
                await persistDraft(selectedAssignment._id);
                const data = await requestJson<{ message?: string }>(
                    `/api/teaching-learning/assignments/${selectedAssignment._id}/submit`,
                    { method: "POST" }
                );

                setMessage({
                    type: "success",
                    text: data.message ?? "Teaching learning assignment submitted successfully.",
                });
                router.refresh();
            } catch (error) {
                setMessage({
                    type: "error",
                    text:
                        error instanceof Error
                            ? error.message
                            : "Unable to submit the teaching learning assignment.",
                });
            }
        });
    }

    if (!assignments.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Teaching Learning Workspace</CardTitle>
                    <CardDescription>
                        No teaching-learning assignments are mapped to this account yet.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const canEdit = selectedAssignment
        ? ["Draft", "Rejected"].includes(selectedAssignment.status)
        : false;

    async function persistDraft(assignmentId: string) {
        return requestJson<{ message?: string }>(
            `/api/teaching-learning/assignments/${assignmentId}/contribution`,
            {
                method: "PUT",
                body: JSON.stringify(buildDraftPayload()),
            }
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{actorLabel} Teaching Learning workspace</CardTitle>
                    <CardDescription>
                        Complete the course-delivery file with lesson execution, assessments, learner support, and evidence before submitting it into the governed review chain.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        className="max-w-sm"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by plan, course, or status"
                        value={search}
                    />

                    {message ? (
                        <div
                            className={`rounded-lg border px-4 py-3 text-sm ${
                                message.type === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                    : "border-rose-200 bg-rose-50 text-rose-900"
                            }`}
                        >
                            {message.text}
                        </div>
                    ) : null}

                    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                        <div className="space-y-3">
                            {filteredAssignments.map((assignment) => {
                                const active = assignment._id === selectedId;
                                return (
                                    <button
                                        className={`w-full rounded-xl border p-4 text-left transition ${
                                            active
                                                ? "border-zinc-900 bg-zinc-900 text-white"
                                                : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-100"
                                        }`}
                                        key={assignment._id}
                                        onClick={() => setSelectedId(assignment._id)}
                                        type="button"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">
                                                    {assignment.courseCode || "Course"}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold">
                                                    {assignment.planTitle}
                                                </p>
                                                <p className="mt-1 text-xs opacity-80">
                                                    {assignment.courseTitle}
                                                </p>
                                            </div>
                                            <div>{statusBadge(assignment.status)}</div>
                                        </div>
                                        <p className="mt-3 text-xs opacity-80">
                                            {assignment.currentStageLabel} · {assignment.valueSummary}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedAssignment ? (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {statusBadge(selectedAssignment.status)}
                                                <Badge variant="secondary">
                                                    {selectedAssignment.currentStageLabel}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {selectedAssignment.deliveryType}
                                                </Badge>
                                            </div>
                                            <h3 className="mt-3 text-2xl font-semibold text-zinc-950">
                                                {selectedAssignment.planTitle}
                                            </h3>
                                            <p className="mt-2 text-sm text-zinc-600">
                                                {selectedAssignment.courseTitle}
                                                {selectedAssignment.courseCode
                                                    ? ` (${selectedAssignment.courseCode})`
                                                    : ""}
                                                {" · "}
                                                {selectedAssignment.programName}
                                                {selectedAssignment.semesterNumber
                                                    ? ` · Semester ${selectedAssignment.semesterNumber}`
                                                    : ""}
                                                {selectedAssignment.sectionName
                                                    ? ` · Section ${selectedAssignment.sectionName}`
                                                    : ""}
                                            </p>
                                            <p className="mt-2 text-sm text-zinc-500">
                                                Academic year: {selectedAssignment.academicYearLabel || "-"} · Due{" "}
                                                {formatDate(selectedAssignment.dueDate)}
                                            </p>
                                        </div>
                                        <div className="text-sm text-zinc-500">
                                            <p>Planned Sessions: {selectedAssignment.plannedSessions}</p>
                                            <p>Contact Hours: {selectedAssignment.plannedContactHours}</p>
                                            <p>Class Strength: {selectedAssignment.classStrength ?? "-"}</p>
                                        </div>
                                    </div>
                                    {selectedAssignment.notes ? (
                                        <p className="mt-4 text-sm text-zinc-600">
                                            Admin notes: {selectedAssignment.notes}
                                        </p>
                                    ) : null}
                                    {selectedAssignment.reviewRemarks ? (
                                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                            Reviewer remarks: {selectedAssignment.reviewRemarks}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Teaching Load Context</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm text-zinc-600">
                                            {selectedAssignment.teachingLoadSnapshot ? (
                                                <>
                                                    <p>
                                                        Subject Code:{" "}
                                                        {selectedAssignment.teachingLoadSnapshot.subjectCode || "-"}
                                                    </p>
                                                    <p>
                                                        L-T-P:{" "}
                                                        {selectedAssignment.teachingLoadSnapshot.lectureHours}-
                                                        {selectedAssignment.teachingLoadSnapshot.tutorialHours}-
                                                        {selectedAssignment.teachingLoadSnapshot.practicalHours}
                                                    </p>
                                                    <p>
                                                        Total Hours:{" "}
                                                        {selectedAssignment.teachingLoadSnapshot.totalHours}
                                                    </p>
                                                    <p>
                                                        Innovative Pedagogy:{" "}
                                                        {selectedAssignment.teachingLoadSnapshot.innovativePedagogy || "-"}
                                                    </p>
                                                </>
                                            ) : (
                                                <p>No linked teaching load snapshot was found.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Annual Teaching Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm text-zinc-600">
                                            {selectedAssignment.teachingSummarySnapshot ? (
                                                <>
                                                    <p>
                                                        Classes Taken:{" "}
                                                        {selectedAssignment.teachingSummarySnapshot.classesTaken}
                                                    </p>
                                                    <p>
                                                        Preparation Hours:{" "}
                                                        {selectedAssignment.teachingSummarySnapshot.coursePreparationHours}
                                                    </p>
                                                    <p>
                                                        Mentoring:{" "}
                                                        {selectedAssignment.teachingSummarySnapshot.mentoringCount}
                                                    </p>
                                                    <p>
                                                        Feedback Summary:{" "}
                                                        {selectedAssignment.teachingSummarySnapshot.feedbackSummary || "-"}
                                                    </p>
                                                </>
                                            ) : (
                                                <p>No teaching summary snapshot was found.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Narrative Sections</CardTitle>
                                        <CardDescription>
                                            These sections drive the reviewer summary and final teaching-learning dossier.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Pedagogical Approach</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        pedagogicalApproach: event.target.value,
                                                    }))
                                                }
                                                value={form.pedagogicalApproach}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Learner-Centric Practices</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        learnerCentricPractices: event.target.value,
                                                    }))
                                                }
                                                value={form.learnerCentricPractices}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Digital Resources</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        digitalResources: event.target.value,
                                                    }))
                                                }
                                                value={form.digitalResources}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Attendance Strategy</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        attendanceStrategy: event.target.value,
                                                    }))
                                                }
                                                value={form.attendanceStrategy}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Feedback Analysis</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        feedbackAnalysis: event.target.value,
                                                    }))
                                                }
                                                value={form.feedbackAnalysis}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Attainment Summary</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        attainmentSummary: event.target.value,
                                                    }))
                                                }
                                                value={form.attainmentSummary}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Action Taken</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        actionTaken: event.target.value,
                                                    }))
                                                }
                                                value={form.actionTaken}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Innovation Highlights</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        innovationHighlights: event.target.value,
                                                    }))
                                                }
                                                value={form.innovationHighlights}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <CardTitle>Lesson Delivery Register</CardTitle>
                                                <CardDescription>
                                                    Capture planned and delivered sessions with outcomes and evidence.
                                                </CardDescription>
                                            </div>
                                            <Button
                                                disabled={!canEdit}
                                                onClick={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        sessions: [
                                                            ...current.sessions,
                                                            emptySessionRow(current.sessions.length + 1),
                                                        ],
                                                    }))
                                                }
                                                type="button"
                                                variant="secondary"
                                            >
                                                Add Session
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {form.sessions.map((row, index) => (
                                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={row.id ?? `session-${index}`}>
                                                <div className="mb-4 flex items-center justify-between gap-3">
                                                    <Badge variant="secondary">
                                                        Session {index + 1}
                                                    </Badge>
                                                    <Button
                                                        disabled={!canEdit || form.sessions.length === 1}
                                                        onClick={() =>
                                                            setForm((current) => ({
                                                                ...current,
                                                                sessions: current.sessions.filter((_, currentIndex) => currentIndex !== index),
                                                            }))
                                                        }
                                                        size="sm"
                                                        type="button"
                                                        variant="outline"
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label>Session Number</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, sessionNumber: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.sessionNumber}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Module</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, moduleTitle: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.moduleTitle}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Topic</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, topic: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.topic}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Planned Date</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, plannedDate: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            type="date"
                                                            value={row.plannedDate}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Delivered Date</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, deliveredDate: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            type="date"
                                                            value={row.deliveredDate}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Method</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, teachingMethod: value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.teachingMethod}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[
                                                                    "Lecture",
                                                                    "Tutorial",
                                                                    "Lab",
                                                                    "Project",
                                                                    "Case Study",
                                                                    "Experiential",
                                                                    "Seminar",
                                                                    "Blended",
                                                                    "Other",
                                                                ].map((option) => (
                                                                    <SelectItem key={option} value={option}>
                                                                        {option}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>ICT Tool</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, ictTool: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.ictTool}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Attendance %</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, attendancePercent: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.attendancePercent}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Document ID</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, documentId: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.documentId}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Learning Outcome</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, learningOutcome: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.learningOutcome}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Reflection Notes</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    sessions: current.sessions.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, reflectionNotes: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.reflectionNotes}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center gap-3">
                                                    <Checkbox
                                                        checked={row.isDelivered}
                                                        disabled={!canEdit}
                                                        onCheckedChange={(value) =>
                                                            setForm((current) => ({
                                                                ...current,
                                                                sessions: current.sessions.map((item, itemIndex) =>
                                                                    itemIndex === index
                                                                        ? {
                                                                              ...item,
                                                                              isDelivered: value === true,
                                                                          }
                                                                        : item
                                                                ),
                                                            }))
                                                        }
                                                    />
                                                    <Label>Mark as delivered</Label>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <CardTitle>Assessment Register</CardTitle>
                                                <CardDescription>
                                                    Maintain internal evaluation checkpoints and attainment indicators.
                                                </CardDescription>
                                            </div>
                                            <Button
                                                disabled={!canEdit}
                                                onClick={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        assessments: [...current.assessments, emptyAssessmentRow()],
                                                    }))
                                                }
                                                type="button"
                                                variant="secondary"
                                            >
                                                Add Assessment
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {form.assessments.map((row, index) => (
                                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={row.id ?? `assessment-${index}`}>
                                                <div className="mb-4 flex items-center justify-between gap-3">
                                                    <Badge variant="secondary">Assessment {index + 1}</Badge>
                                                    <Button
                                                        disabled={!canEdit || form.assessments.length === 1}
                                                        onClick={() =>
                                                            setForm((current) => ({
                                                                ...current,
                                                                assessments: current.assessments.filter((_, currentIndex) => currentIndex !== index),
                                                            }))
                                                        }
                                                        size="sm"
                                                        type="button"
                                                        variant="outline"
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label>Title</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, title: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.title}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Type</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, assessmentType: value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.assessmentType}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[
                                                                    "Assignment",
                                                                    "Quiz",
                                                                    "Tutorial",
                                                                    "Internal Test",
                                                                    "Lab Evaluation",
                                                                    "Presentation",
                                                                    "Project Review",
                                                                    "Other",
                                                                ].map((option) => (
                                                                    <SelectItem key={option} value={option}>
                                                                        {option}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Weightage %</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, weightage: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.weightage}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Scheduled Date</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, scheduledDate: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            type="date"
                                                            value={row.scheduledDate}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Evaluated Date</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, evaluatedDate: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            type="date"
                                                            value={row.evaluatedDate}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>CO Mapping</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, coMappingCodes: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            placeholder="CO1, CO2"
                                                            value={row.coMappingCodes}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Max Marks</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, maxMarks: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.maxMarks}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Average Marks</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, averageMarks: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.averageMarks}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Attainment %</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, attainmentPercentage: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.attainmentPercentage}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Document ID</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    assessments: current.assessments.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, documentId: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.documentId}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-2">
                                                    <Label>Remarks</Label>
                                                    <Textarea
                                                        disabled={!canEdit}
                                                        onChange={(event) =>
                                                            setForm((current) => ({
                                                                ...current,
                                                                assessments: current.assessments.map((item, itemIndex) =>
                                                                    itemIndex === index
                                                                        ? { ...item, remarks: event.target.value }
                                                                        : item
                                                                ),
                                                            }))
                                                        }
                                                        value={row.remarks}
                                                    />
                                                </div>
                                                <div className="mt-4 flex items-center gap-3">
                                                    <Checkbox
                                                        checked={row.isCompleted}
                                                        disabled={!canEdit}
                                                        onCheckedChange={(value) =>
                                                            setForm((current) => ({
                                                                ...current,
                                                                assessments: current.assessments.map((item, itemIndex) =>
                                                                    itemIndex === index
                                                                        ? {
                                                                              ...item,
                                                                              isCompleted: value === true,
                                                                          }
                                                                        : item
                                                                ),
                                                            }))
                                                        }
                                                    />
                                                    <Label>Mark as completed</Label>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <CardTitle>Learner Support Register</CardTitle>
                                                <CardDescription>
                                                    Capture remedial classes, mentoring, bridge support, or advanced learner interventions.
                                                </CardDescription>
                                            </div>
                                            <Button
                                                disabled={!canEdit}
                                                onClick={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        supports: [...current.supports, emptySupportRow()],
                                                    }))
                                                }
                                                type="button"
                                                variant="secondary"
                                            >
                                                Add Support Action
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {form.supports.map((row, index) => (
                                            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={row.id ?? `support-${index}`}>
                                                <div className="mb-4 flex items-center justify-between gap-3">
                                                    <Badge variant="secondary">Support {index + 1}</Badge>
                                                    <Button
                                                        disabled={!canEdit || form.supports.length === 1}
                                                        onClick={() =>
                                                            setForm((current) => ({
                                                                ...current,
                                                                supports: current.supports.filter((_, currentIndex) => currentIndex !== index),
                                                            }))
                                                        }
                                                        size="sm"
                                                        type="button"
                                                        variant="outline"
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                    <div className="space-y-2">
                                                        <Label>Title</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    supports: current.supports.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, title: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.title}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Type</Label>
                                                        <Select
                                                            disabled={!canEdit}
                                                            onValueChange={(value) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    supports: current.supports.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, supportType: value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.supportType}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[
                                                                    "Remedial",
                                                                    "Advanced Learner",
                                                                    "Mentoring",
                                                                    "Bridge Course",
                                                                    "Revision",
                                                                    "Counselling",
                                                                    "Peer Learning",
                                                                    "Other",
                                                                ].map((option) => (
                                                                    <SelectItem key={option} value={option}>
                                                                        {option}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Target Group</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    supports: current.supports.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, targetGroup: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.targetGroup}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Intervention Date</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    supports: current.supports.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, interventionDate: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            type="date"
                                                            value={row.interventionDate}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Participants</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    supports: current.supports.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, participantCount: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.participantCount}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Document ID</Label>
                                                        <Input
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    supports: current.supports.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, documentId: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.documentId}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Outcome Summary</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    supports: current.supports.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, outcomeSummary: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.outcomeSummary}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Follow-up Action</Label>
                                                        <Textarea
                                                            disabled={!canEdit}
                                                            onChange={(event) =>
                                                                setForm((current) => ({
                                                                    ...current,
                                                                    supports: current.supports.map((item, itemIndex) =>
                                                                        itemIndex === index
                                                                            ? { ...item, followUpAction: event.target.value }
                                                                            : item
                                                                    ),
                                                                }))
                                                            }
                                                            value={row.followUpAction}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Evidence and Contributor Remarks</CardTitle>
                                        <CardDescription>
                                            Capture the named course-file artefacts first, then add any extra supporting URLs and documents.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Lesson Plan Document ID</Label>
                                            <Input
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        lessonPlanDocumentId: event.target.value,
                                                    }))
                                                }
                                                placeholder="ObjectId"
                                                value={form.lessonPlanDocumentId}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Question Paper / Assessment Instrument Document ID</Label>
                                            <Input
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        questionPaperDocumentId: event.target.value,
                                                    }))
                                                }
                                                placeholder="ObjectId"
                                                value={form.questionPaperDocumentId}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Result Analysis Document ID</Label>
                                            <Input
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        resultAnalysisDocumentId: event.target.value,
                                                    }))
                                                }
                                                placeholder="ObjectId"
                                                value={form.resultAnalysisDocumentId}
                                            />
                                            <p className="text-xs text-zinc-500">
                                                Submission requires a lesson plan. Result analysis becomes mandatory once completed assessment evidence is recorded.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Supporting Links</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        supportingLinks: event.target.value,
                                                    }))
                                                }
                                                placeholder="https://..."
                                                value={form.supportingLinks}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Document IDs</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        documentIds: event.target.value,
                                                    }))
                                                }
                                                placeholder="ObjectId, ObjectId"
                                                value={form.documentIds}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Contributor Remarks</Label>
                                            <Textarea
                                                disabled={!canEdit}
                                                onChange={(event) =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        contributorRemarks: event.target.value,
                                                    }))
                                                }
                                                value={form.contributorRemarks}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex flex-wrap gap-3">
                                    <Button disabled={isPending || !canEdit} onClick={saveDraft}>
                                        {isPending ? "Saving..." : "Save Draft"}
                                    </Button>
                                    <Button
                                        disabled={isPending || !canEdit}
                                        onClick={submitAssignment}
                                        variant="secondary"
                                    >
                                        {isPending ? "Submitting..." : "Submit for Review"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-sm text-zinc-500">
                                Select a teaching-learning assignment to continue.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
